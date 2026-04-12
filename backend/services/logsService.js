const prisma = require("../lib/prisma");

// Build Prisma filter object from validated query params.
function buildWhereClause({ method, path, createdAt }) {
  const where = {};

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

async function fetchLogs(filters) {
  const where = buildWhereClause(filters);

  // Query newest-first; UI handles optional re-sorting for display.
  return prisma.requestLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.limit,
  });
}

async function fetchStats(filters) {
  const where = buildWhereClause(filters);

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
  fetchLogs,
  fetchStats,
  fetchSummary,
};
