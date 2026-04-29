const prisma = require("../lib/prisma");
const energyCalculator = require("../utils/energyCalculator");

// Translate normalized API filters into the Prisma `where` shape.
function buildWhereClause({ method, path, createdAt, projectId }) {
  const where = {};

  if (projectId) {
    where.projectId = projectId;
  }

  if (method) {
    where.method = method;
  }

  if (path) {
    where.path = { contains: path };
  }

  if (createdAt) {
    where.createdAt = createdAt;
  }

  return where;
}

async function resolveProjectScope(auth, requestedProjectId) {
  if (!requestedProjectId) {
    return auth?.type === "user" ? auth.projectId || undefined : undefined;
  }

  if (auth?.type !== "user") {
    return requestedProjectId;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: requestedProjectId,
      userId: auth.userId,
    },
  });

  if (!project) {
    const err = new Error("Project not found for this account.");
    err.statusCode = 404;
    throw err;
  }

  return project.id;
}

async function fetchLogs(filters) {
  const where = buildWhereClause(filters);

  // Return newest entries first so dashboards can render recent traffic immediately.
  return prisma.requestLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.limit,
  });
}

async function createLog(payload) {
  const { energy, cost, cpuUtil } = energyCalculator(payload.durationMs, payload.cpuUsedMs);

  return prisma.requestLog.create({
    data: {
      projectId: payload.projectId,
      apiKeyId: payload.apiKeyId,
      method: payload.method,
      path: payload.path,
      statusCode: payload.statusCode,
      durationMs: payload.durationMs,
      cpuUsedMs: payload.cpuUsedMs,
      cpuUtil,
      energyKwh: energy,
      cost,
      ...(payload.createdAt ? { createdAt: payload.createdAt } : {}),
    },
  });
}

async function fetchStats(filters) {
  const where = buildWhereClause(filters);

  // Compute aggregate metrics once in the database instead of reducing in application code.
  const stats = await prisma.requestLog.aggregate({
    where,
    _count: { id: true },
    _avg: { durationMs: true },
    _sum: { energyKwh: true, cost: true },
  });

  return {
    totalRequests: stats._count.id,
    avgDurationMs: stats._avg.durationMs || 0,
    totalEnergyKwh: stats._sum.energyKwh || 0,
    totalCost: stats._sum.cost || 0,
    range: filters.range,
  };
}

function toCurrency(value) {
  return `₹${Number(value || 0).toFixed(5)}`;
}

function toLatency(value) {
  return `${Number(value || 0).toFixed(0)} ms`;
}

function getStatusTone({ errorRate, avgDurationMs, totalCost }) {
  // Treat reliability, latency, and cost as independent escalation signals.
  if (errorRate >= 8 || avgDurationMs >= 1500 || totalCost >= 1) {
    return "critical";
  }

  if (errorRate >= 3 || avgDurationMs >= 700 || totalCost >= 0.2) {
    return "watch";
  }

  return "stable";
}

async function fetchSummary(filters) {
  const where = buildWhereClause(filters);

  // Pull a broad enough sample for per-route insights while reusing database aggregates for totals.
  const [stats, logs] = await Promise.all([
    fetchStats(filters),
    prisma.requestLog.findMany({
      where,
      select: {
        method: true,
        path: true,
        statusCode: true,
        durationMs: true,
        cost: true,
        energyKwh: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const totalRequests = logs.length;
  const errorCount = logs.filter((log) => Number(log.statusCode) >= 500).length;
  const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

  const routeMap = new Map();
  for (const log of logs) {
    // Group by method + path so expensive and slow routes can be ranked together.
    const key = `${log.method || "UNK"} ${log.path || "/"}`;
    const current = routeMap.get(key) || {
      route: key,
      hits: 0,
      totalDurationMs: 0,
      totalCost: 0,
      totalEnergyKwh: 0,
    };

    current.hits += 1;
    current.totalDurationMs += Number(log.durationMs || 0);
    current.totalCost += Number(log.cost || 0);
    current.totalEnergyKwh += Number(log.energyKwh || 0);
    routeMap.set(key, current);
  }

  const topCostRoute = Array.from(routeMap.values()).sort((a, b) => b.totalCost - a.totalCost)[0] || null;
  const topSlowRoute =
    Array.from(routeMap.values())
      .map((route) => ({
        ...route,
        // Average latency is more useful than total latency when comparing uneven traffic volumes.
        avgDurationMs: route.hits > 0 ? route.totalDurationMs / route.hits : 0,
      }))
      .sort((a, b) => b.avgDurationMs - a.avgDurationMs)[0] || null;

  const status = getStatusTone({
    errorRate,
    avgDurationMs: stats.avgDurationMs,
    totalCost: stats.totalCost,
  });

  const headlines = {
    stable: "System is running efficiently in the selected window.",
    watch: "Efficiency drift detected. One or more routes need attention.",
    critical: "Operational pressure is elevated. Immediate route review recommended.",
  };

  const highlights = [
    { label: "Error rate", value: `${errorRate.toFixed(2)}%` },
    { label: "Avg latency", value: toLatency(stats.avgDurationMs) },
    { label: "Energy tracked", value: `${Number(stats.totalEnergyKwh || 0).toFixed(6)} kWh` },
    { label: "Estimated cost", value: toCurrency(stats.totalCost) },
  ];

  const recommendations = [];
  // Keep recommendations deterministic so the UI can present concise next actions.
  if (topSlowRoute && topSlowRoute.avgDurationMs > 1000) {
    recommendations.push(`Investigate latency on ${topSlowRoute.route}.`);
  }
  if (topCostRoute && topCostRoute.totalCost > 0) {
    recommendations.push(`Review cost concentration on ${topCostRoute.route}.`);
  }
  if (errorRate > 5) {
    recommendations.push("Check recent 5xx responses before scaling traffic.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Current traffic profile looks healthy enough to share publicly.");
  }

  return {
    range: filters.range,
    status,
    headline: headlines[status],
    highlights,
    totals: {
      totalRequests: stats.totalRequests,
      avgDurationMs: stats.avgDurationMs,
      totalEnergyKwh: stats.totalEnergyKwh,
      totalCost: stats.totalCost,
      errorRate,
    },
    topCostRoute: topCostRoute
      ? {
          route: topCostRoute.route,
          totalCost: Number(topCostRoute.totalCost.toFixed(5)),
          hits: topCostRoute.hits,
        }
      : null,
    topSlowRoute: topSlowRoute
      ? {
          route: topSlowRoute.route,
          avgDurationMs: Number(topSlowRoute.avgDurationMs.toFixed(0)),
          hits: topSlowRoute.hits,
        }
      : null,
    lastSeenAt: logs[0]?.createdAt || null,
    recommendations,
  };
}

module.exports = {
  createLog,
  fetchLogs,
  fetchStats,
  fetchSummary,
  resolveProjectScope,
};
