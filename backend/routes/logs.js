const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

router.get("/", async (req, res) => {
  try {
    const { limit = 50, method, path } = req.query;

    // Build dynamic filter
    const where = {};

    if (method) {
      where.method = method.toUpperCase();
    }

    if (path) {
      where.path = {
        contains: path, // partial match
      };
    }

    const logs = await prisma.requestLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    res.json(logs);
  } catch (err) {
    console.error("Fetch logs failed:", err.message);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const { method, path } = req.query;

    // dynamic filter
    const where = {};

    if (method) {
      where.method = method.toUpperCase();
    }

    if (path) {
      where.path = {
        contains: path,
      };
    }

    const stats = await prisma.requestLog.aggregate({
      where,
      _count: {
        id: true,
      },
      _avg: {
        durationMs: true,
      },
      _sum: {
        energyKwh: true,
        cost: true,
      },
    });

    res.json({
      totalRequests: stats._count.id,
      avgDurationMs: stats._avg.durationMs || 0,
      totalEnergyKwh: stats._sum.energyKwh || 0,
      totalCost: stats._sum.cost || 0,
    });
  } catch (err) {
    console.error("Stats fetch failed:", err.message);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;