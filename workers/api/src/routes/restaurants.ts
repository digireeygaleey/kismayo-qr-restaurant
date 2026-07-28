import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

const router = new Hono<any>();

router.get('/:id/details', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const rows = await db`SELECT * FROM "Restaurant" WHERE id = ${id} LIMIT 1`;
  if (!rows.length) return c.json({ error: 'Restaurant not found' }, 404);
  return c.json(rows[0]);
});

router.put('/:id', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const allowed = ['name', 'description', 'phone', 'address', 'currency', 'language', 'logoUrl'];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) return c.json({ error: 'No fields to update' }, 400);
  const keys = Object.keys(updates);
  const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = [...Object.values(updates), id];
  const rows = await db.unsafe(`UPDATE "Restaurant" SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`, values);
  return c.json(rows[0]);
});

router.get('/:slug', async (c) => {
  const db = c.get('db');
  const slug = c.req.param('slug');
  const rows = await db`SELECT id, name, slug, description, phone, address, currency, language, logoUrl FROM "Restaurant" WHERE slug = ${slug} LIMIT 1`;
  if (!rows.length) return c.json({ error: 'Restaurant not found' }, 404);
  return c.json(rows[0]);
});

router.get('/:id/dashboard', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const today = new Date().toISOString().slice(0, 10);

  const summary = await db`
    SELECT
      COUNT(*) FILTER (WHERE DATE("createdAt") = ${today}::date) as "todayOrders",
      COALESCE(SUM("totalAmount") FILTER (WHERE DATE("createdAt") = ${today}::date AND "paymentStatus" = 'PAID'), 0) as "todayRevenue",
      COALESCE(AVG(
        EXTRACT(EPOCH FROM ("prepCompletedAt" - "prepStartedAt")) / 60
      ) FILTER (WHERE "prepCompletedAt" IS NOT NULL), 0) as "avgPrepTime"
    FROM "Order"
    WHERE "restaurantId" = ${id}
  `;

  const activeOrders = await db`
    SELECT COUNT(*) as count FROM "Order"
    WHERE "restaurantId" = ${id} AND status IN ('CONFIRMED', 'PREPARING', 'READY')
  `;

  const occupiedTables = await db`
    SELECT COUNT(DISTINCT "tableId") as count FROM "Order"
    WHERE "restaurantId" = ${id} AND status NOT IN ('PAID', 'CANCELLED')
  `;

  return c.json({
    todayOrders: Number(summary[0]?.todayOrders || 0),
    todayRevenue: Number(summary[0]?.todayRevenue || 0),
    avgPrepTime: Math.round(Number(summary[0]?.avgPrepTime || 0)),
    activeOrders: Number(activeOrders[0]?.count || 0),
    occupiedTables: Number(occupiedTables[0]?.count || 0),
  });
});

router.get('/:id/table-status', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const tables = await db`
    SELECT t.*,
      (SELECT json_build_object(
        'id', o.id, 'status', o.status, 'customerName', o."customerName",
        'totalAmount', o."totalAmount", 'paymentStatus', o."paymentStatus"
      ) FROM "Order" o
       WHERE o."tableId" = t.id AND o.status NOT IN ('PAID', 'CANCELLED')
       ORDER BY o."createdAt" DESC LIMIT 1
      ) as "currentOrder"
    FROM "Table" t
    WHERE t."restaurantId" = ${id}
    ORDER BY t."tableNumber" ASC
  `;
  return c.json(tables);
});

router.get('/:id/popular', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const items = await db`
    SELECT mi.name, oi."menuItemId", SUM(oi.quantity) as total
    FROM "OrderItem" oi
    JOIN "MenuItem" mi ON mi.id = oi."menuItemId"
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."restaurantId" = ${id} AND o.status != 'CANCELLED'
    GROUP BY oi."menuItemId", mi.name
    ORDER BY total DESC
    LIMIT 10
  `;
  return c.json(items.map((i: any) => ({ name: i.name, menuItemId: i.menuItemId, total: Number(i.total) })));
});

export default router;
