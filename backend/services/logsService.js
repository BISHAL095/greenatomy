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

module.exports = {
  fetchLogs,
  fetchStats,
};
