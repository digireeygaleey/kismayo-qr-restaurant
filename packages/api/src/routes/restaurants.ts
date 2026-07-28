import { Router } from 'express';
import { z } from 'zod';
import { prisma, decimalToNumber } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/:slug', async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: req.params.slug },
  });
  if (!restaurant || !restaurant.isActive) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }
  return res.json(restaurant);
});

router.get('/:id/details', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user!.restaurantId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.params.id },
  });
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }
  return res.json(restaurant);
});

router.get('/:id/dashboard', authMiddleware, async (req: AuthRequest, res) => {
  const restaurantId = req.params.id;
  if (req.user!.restaurantId !== restaurantId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayOrders, activeOrders, revenueAgg, avgPrep] = await Promise.all([
    prisma.order.count({
      where: { restaurantId, createdAt: { gte: today } },
    }),
    prisma.order.count({
      where: {
        restaurantId,
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] },
      },
    }),
    prisma.order.aggregate({
      where: { restaurantId, createdAt: { gte: today }, paymentStatus: 'PAID' },
      _sum: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        prepStartedAt: { not: null },
        prepCompletedAt: { not: null },
        createdAt: { gte: today },
      },
      select: { prepStartedAt: true, prepCompletedAt: true },
      take: 50,
    }),
  ]);

  const todayRevenue = decimalToNumber(revenueAgg._sum.totalAmount || 0);
  const averageOrderValue = todayOrders > 0 ? todayRevenue / todayOrders : 0;

  let avgPrepTimeMinutes = 0;
  if (avgPrep.length > 0) {
    const totalMinutes = avgPrep.reduce((sum, o) => {
      const start = new Date(o.prepStartedAt!).getTime();
      const end = new Date(o.prepCompletedAt!).getTime();
      return sum + (end - start) / 60000;
    }, 0);
    avgPrepTimeMinutes = Math.round(totalMinutes / avgPrep.length);
  }

  return res.json({
    todayOrders,
    todayRevenue,
    activeOrders,
    averageOrderValue,
    avgPrepTimeMinutes,
  });
});

router.get('/:id/table-status', authMiddleware, async (req: AuthRequest, res) => {
  const restaurantId = req.params.id;
  if (req.user!.restaurantId !== restaurantId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const tables = await prisma.table.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { tableNumber: 'asc' },
    include: {
      orders: {
        where: { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          customerName: true,
          totalAmount: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      },
    },
  });

  return res.json(
    tables.map((t) => ({
      id: t.id,
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      isActive: t.isActive,
      currentOrder: t.orders[0]
        ? {
            id: t.orders[0].id,
            status: t.orders[0].status,
            customerName: t.orders[0].customerName,
            totalAmount: decimalToNumber(t.orders[0].totalAmount),
            createdAt: t.orders[0].createdAt.toISOString(),
            itemCount: t.orders[0]._count.items,
          }
        : null,
    }))
  );
});

router.get('/:id/popular', authMiddleware, async (req: AuthRequest, res) => {
  const restaurantId = req.params.id;
  if (req.user!.restaurantId !== restaurantId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const items = await prisma.menuItem.findMany({
    where: { restaurantId },
    orderBy: { orderCount: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      price: true,
      orderCount: true,
      isChefSpecial: true,
      tags: true,
    },
  });

  return res.json(items);
});

const updateRestaurantSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  currency: z.string().optional(),
  language: z.string().optional(),
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const restaurantId = req.params.id;
  if (req.user!.restaurantId !== restaurantId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const data = updateRestaurantSchema.parse(req.body);
    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data,
    });
    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Failed to update restaurant' });
  }
});

export default router;
