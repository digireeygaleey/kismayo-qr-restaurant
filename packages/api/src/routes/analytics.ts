import { Router } from 'express';
import { prisma, decimalToNumber } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/:id/analytics/revenue', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user!.restaurantId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const days = parseInt(req.query.days as string) || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: req.params.id,
      createdAt: { gte: since },
      paymentStatus: 'PAID',
    },
    select: { createdAt: true, totalAmount: true },
  });

  const byDay: Record<string, number> = {};
  orders.forEach((o) => {
    const day = o.createdAt.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + decimalToNumber(o.totalAmount);
  });

  return res.json(
    Object.entries(byDay)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date))
  );
});

router.get('/:id/analytics/popular', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user!.restaurantId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const items = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    where: { order: { restaurantId: req.params.id } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 10,
  });

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((i) => i.menuItemId) } },
  });

  const itemMap = new Map(menuItems.map((m) => [m.id, m]));
  return res.json(
    items.map((i) => ({
      menuItem: itemMap.get(i.menuItemId),
      totalOrdered: i._sum.quantity,
    }))
  );
});

router.get('/:id/analytics/peak', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user!.restaurantId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const orders = await prisma.order.findMany({
    where: { restaurantId: req.params.id },
    select: { createdAt: true },
  });

  const byHour: Record<number, number> = {};
  for (let h = 0; h < 24; h++) byHour[h] = 0;
  orders.forEach((o) => {
    const hour = o.createdAt.getHours();
    byHour[hour]++;
  });

  return res.json(
    Object.entries(byHour).map(([hour, count]) => ({
      hour: parseInt(hour),
      count,
    }))
  );
});

export default router;
