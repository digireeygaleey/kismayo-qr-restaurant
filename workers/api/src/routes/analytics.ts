import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

const router = new Hono<any>();

router.get('/:id/analytics/revenue', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const days = parseInt(c.req.query('days') || '30');

  const rows = await db`
    SELECT DATE("createdAt") as date, COALESCE(SUM("totalAmount"), 0) as revenue, COUNT(*) as orders
    FROM "Order"
    WHERE "restaurantId" = ${id} AND status != 'CANCELLED'
      AND "createdAt" >= NOW() - (${days} || ' days')::INTERVAL
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;
  return c.json(rows.map((r: any) => ({ date: r.date, revenue: Number(r.revenue), orders: Number(r.orders) })));
});

router.get('/:id/analytics/popular', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const rows = await db`
    SELECT mi.id, mi.name, SUM(oi.quantity) as total
    FROM "OrderItem" oi
    JOIN "MenuItem" mi ON mi.id = oi."menuItemId"
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."restaurantId" = ${id} AND o.status != 'CANCELLED'
    GROUP BY mi.id, mi.name
    ORDER BY total DESC
    LIMIT 10
  `;
  return c.json(rows.map((r: any) => ({ id: r.id, name: r.name, total: Number(r.total) })));
});

router.get('/:id/analytics/peak', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const rows = await db`
    SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*) as orders, COALESCE(SUM("totalAmount"), 0) as revenue
    FROM "Order"
    WHERE "restaurantId" = ${id} AND status != 'CANCELLED'
    GROUP BY hour
    ORDER BY hour ASC
  `;
  return c.json(rows.map((r: any) => ({ hour: Number(r.hour), orders: Number(r.orders), revenue: Number(r.revenue) })));
});

router.get('/:id/analytics/report', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const period = c.req.query('period') || 'daily';
  const startDate = c.req.query('start') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = c.req.query('end') || new Date().toISOString().slice(0, 10);

  let dateTrunc: string;
  switch (period) {
    case 'weekly': dateTrunc = 'DATE_TRUNC(\'week\', "createdAt")'; break;
    case 'monthly': dateTrunc = 'DATE_TRUNC(\'month\', "createdAt")'; break;
    default: dateTrunc = 'DATE("createdAt")';
  }

  const periods = await db.unsafe(`
    SELECT ${dateTrunc} as date,
      COUNT(*) as "totalOrders",
      COALESCE(SUM("totalAmount") FILTER (WHERE "paymentStatus" = 'PAID'), 0) as "paidRevenue",
      COALESCE(SUM("totalAmount") FILTER (WHERE "paymentMethod" = 'CASH'), 0) as "cashRevenue",
      COALESCE(SUM("totalAmount") FILTER (WHERE "paymentMethod" = 'EVC_PLUS'), 0) as "evcRevenue",
      COALESCE(SUM("totalAmount") FILTER (WHERE "paymentMethod" = 'EDAHAB'), 0) as "edahabRevenue",
      COUNT(*) FILTER (WHERE "paymentMethod" = 'CASH') as "cashOrders",
      COUNT(*) FILTER (WHERE "paymentMethod" = 'EVC_PLUS') as "evcOrders",
      COUNT(*) FILTER (WHERE "paymentMethod" = 'EDAHAB') as "edahabOrders"
    FROM "Order"
    WHERE "restaurantId" = '${id}' AND status != 'CANCELLED'
      AND DATE("createdAt") >= '${startDate}' AND DATE("createdAt") <= '${endDate}'
    GROUP BY date
    ORDER BY date ASC
  `);

  const summary = await db.unsafe(`
    SELECT
      COUNT(*) as "totalOrders",
      COALESCE(SUM("totalAmount") FILTER (WHERE "paymentStatus" = 'PAID'), 0) as "totalRevenue",
      COUNT(*) FILTER (WHERE "paymentMethod" = 'CASH') as "cashOrders",
      COUNT(*) FILTER (WHERE "paymentMethod" = 'EVC_PLUS') as "evcOrders",
      COUNT(*) FILTER (WHERE "paymentMethod" = 'EDAHAB') as "edahabOrders"
    FROM "Order"
    WHERE "restaurantId" = '${id}' AND status != 'CANCELLED'
      AND DATE("createdAt") >= '${startDate}' AND DATE("createdAt") <= '${endDate}'
  `);

  const items = await db.unsafe(`
    SELECT mi.name, SUM(oi.quantity) as "totalSold", SUM(oi."subtotal") as "totalRevenue"
    FROM "OrderItem" oi
    JOIN "MenuItem" mi ON mi.id = oi."menuItemId"
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."restaurantId" = '${id}' AND o.status != 'CANCELLED'
      AND DATE(o."createdAt") >= '${startDate}' AND DATE(o."createdAt") <= '${endDate}'
    GROUP BY mi.name
    ORDER BY "totalSold" DESC
  `);

  const periodsWithKeys = periods.map((p: any) => {
    const date = p.date instanceof Date ? p.date.toISOString() : String(p.date);
    let key: string;
    if (period === 'weekly') {
      const d = new Date(date);
      key = d.toISOString().slice(0, 10);
    } else if (period === 'monthly') {
      key = date.slice(0, 7);
    } else {
      key = date.slice(0, 10);
    }
    return { ...p, key, date };
  });

  return c.json({
    summary: summary[0] ? { ...summary[0], totalRevenue: Number(summary[0].totalRevenue || 0), totalOrders: Number(summary[0].totalOrders || 0), cashOrders: Number(summary[0].cashOrders || 0), evcOrders: Number(summary[0].evcOrders || 0), edahabOrders: Number(summary[0].edahabOrders || 0) } : null,
    periods: periodsWithKeys.map((p: any) => ({ ...p, totalOrders: Number(p.totalOrders || 0), paidRevenue: Number(p.paidRevenue || 0), cashRevenue: Number(p.cashRevenue || 0), evcRevenue: Number(p.evcRevenue || 0), edahabRevenue: Number(p.edahabRevenue || 0), cashOrders: Number(p.cashOrders || 0), evcOrders: Number(p.evcOrders || 0), edahabOrders: Number(p.edahabOrders || 0) })),
    items: items.map((i: any) => ({ name: i.name, totalSold: Number(i.totalSold || 0), totalRevenue: Number(i.totalRevenue || 0) })),
  });
});

export default router;
