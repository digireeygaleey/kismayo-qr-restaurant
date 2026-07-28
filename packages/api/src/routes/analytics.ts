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

router.get('/:id/analytics/report', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user!.restaurantId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const period = (req.query.period as string) || 'daily';
  const now = new Date();
  let since: Date;

  if (period === 'weekly') {
    since = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  } else if (period === 'monthly') {
    since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: req.params.id,
      createdAt: { gte: since },
      paymentStatus: 'PAID',
    },
    include: {
      items: {
        include: {
          menuItem: { select: { name: true } },
        },
      },
    },
  });

  const paymentBreakdown: Record<string, { count: number; revenue: number }> = {
    CASH: { count: 0, revenue: 0 },
    EVC_PLUS: { count: 0, revenue: 0 },
    EDAHAB: { count: 0, revenue: 0 },
    SAHAL: { count: 0, revenue: 0 },
  };

  const periodMap: Record<string, { key: string; label: string; orders: number; revenue: number }> = {};
  const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  const uniqueItemIds = new Set<string>();

  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  for (const order of orders) {
    const revenue = decimalToNumber(order.totalAmount);
    const pm = order.paymentMethod || 'CASH';
    if (paymentBreakdown[pm]) {
      paymentBreakdown[pm].count++;
      paymentBreakdown[pm].revenue += revenue;
    }

    const d = order.createdAt;
    let periodKey: string;
    let periodLabel: string;

    if (period === 'weekly') {
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      periodKey = monday.toISOString().split('T')[0];
      periodLabel = `${monthNames[monday.getMonth()]} ${monday.getDate()}`;
    } else if (period === 'monthly') {
      periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      periodLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    } else {
      periodKey = d.toISOString().split('T')[0];
      periodLabel = `${shortDayNames[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}`;
    }

    if (!periodMap[periodKey]) {
      periodMap[periodKey] = { key: periodKey, label: periodLabel, orders: 0, revenue: 0 };
    }
    periodMap[periodKey].orders++;
    periodMap[periodKey].revenue += revenue;

    for (const item of order.items) {
      const qty = item.quantity;
      const itemRevenue = decimalToNumber(item.unitPrice) * qty;
      uniqueItemIds.add(item.menuItemId);

      if (!itemMap[item.menuItemId]) {
        itemMap[item.menuItemId] = { name: item.menuItem.name, quantity: 0, revenue: 0 };
      }
      itemMap[item.menuItemId].quantity += qty;
      itemMap[item.menuItemId].revenue += itemRevenue;
    }
  }

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + decimalToNumber(o.totalAmount), 0);

  const topItems = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity);
  const topItem = topItems[0] || { name: '', quantity: 0, revenue: 0 };

  const periods = Object.entries(periodMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, val]) => ({ key: val.key, label: val.label, orders: val.orders, revenue: val.revenue }));

  return res.json({
    summary: {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      topItem,
      itemCount: uniqueItemIds.size,
    },
    paymentBreakdown,
    periods,
    topItems,
  });
});

export default router;
