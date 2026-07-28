import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

const router = new Hono<any>();
const restaurantOrdersRouter = new Hono<any>();

const ORDER_FLOW: Record<string, string> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'SERVED',
  SERVED: 'PAID',
};

router.post('/', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const table = await db`SELECT * FROM "Table" WHERE id = ${body.tableId} LIMIT 1`;
  if (!table.length) return c.json({ error: 'Table not found' }, 404);

  const restaurantId = table[0].restaurantId;
  const status = body.paymentMethod && body.paymentMethod !== 'CASH' ? 'PENDING' : 'CONFIRMED';
  const totalAmount = body.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

  const orders = await db`
    INSERT INTO "Order" (id, status, "customerName", "customerPhone", notes, "totalAmount", "paymentMethod", "paymentStatus", "tableId", "restaurantId")
    VALUES (gen_random_uuid(), ${status}, ${body.customerName || 'Guest'}, ${body.customerPhone || null}, ${body.notes || null}, ${totalAmount}, ${body.paymentMethod || null}, 'UNPAID', ${body.tableId}, ${restaurantId})
    RETURNING *
  `;
  const order = orders[0];

  if (body.items?.length) {
    for (const item of body.items) {
      const menuItem = await db`SELECT * FROM "MenuItem" WHERE id = ${item.id} LIMIT 1`;
      if (menuItem.length) {
        await db`
          INSERT INTO "OrderItem" (id, quantity, "subtotal", "specialInstructions", "orderId", "menuItemId")
          VALUES (gen_random_uuid(), ${item.quantity}, ${item.price * item.quantity}, ${item.specialInstructions || null}, ${order.id}, ${item.id})
        `;
        await db`UPDATE "MenuItem" SET "orderCount" = "orderCount" + 1 WHERE id = ${item.id}`;
      }
    }
  }

  const result = await db`
    SELECT o.*,
      json_build_object('id', t.id, 'tableNumber', t."tableNumber") as table
    FROM "Order" o
    JOIN "Table" t ON t.id = o."tableId"
    WHERE o.id = ${order.id} LIMIT 1
  `;
  return c.json(result[0], 201);
});

router.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const rows = await db`
    SELECT o.*,
      json_build_object('id', t.id, 'tableNumber', t."tableNumber") as table,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', oi.id, 'quantity', oi.quantity, 'subtotal', oi."subtotal",
          'specialInstructions', oi."specialInstructions",
          'menuItem', json_build_object('id', mi.id, 'name', mi.name, 'price', mi.price)
        ))
        FROM "OrderItem" oi
        JOIN "MenuItem" mi ON mi.id = oi."menuItemId"
        WHERE oi."orderId" = o.id
      ), '[]') as items
    FROM "Order" o
    LEFT JOIN "Table" t ON t.id = o."tableId"
    WHERE o.id = ${id} LIMIT 1
  `;
  if (!rows.length) return c.json({ error: 'Order not found' }, 404);
  return c.json(rows[0]);
});

router.get('/:id/payment-status', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const rows = await db`SELECT "paymentStatus", "paymentMethod" FROM "Order" WHERE id = ${id} LIMIT 1`;
  if (!rows.length) return c.json({ error: 'Order not found' }, 404);
  return c.json(rows[0]);
});

router.post('/:id/cancel', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const order = await db`SELECT * FROM "Order" WHERE id = ${id} LIMIT 1`;
  if (!order.length) return c.json({ error: 'Order not found' }, 404);
  if (!['PENDING', 'CONFIRMED'].includes(order[0].status)) {
    return c.json({ error: 'Order cannot be cancelled' }, 400);
  }
  const rows = await db`UPDATE "Order" SET status = 'CANCELLED' WHERE id = ${id} RETURNING *`;
  return c.json(rows[0]);
});

router.put('/:id/status', async (c) => {
  const user = await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const order = await db`SELECT * FROM "Order" WHERE id = ${id} LIMIT 1`;
  if (!order.length) return c.json({ error: 'Order not found' }, 404);
  if (['PAID', 'CANCELLED'].includes(order[0].status)) {
    return c.json({ error: 'Order is locked - already paid or cancelled' }, 400);
  }

  const nextStatus = body.status;
  const validFlow = ['CONFIRMED', 'PREPARING', 'READY', 'SERVED'];
  if (!validFlow.includes(nextStatus)) {
    return c.json({ error: 'Invalid status transition' }, 400);
  }

  const now = new Date().toISOString();
  const updates: Record<string, any> = { status: nextStatus };
  if (nextStatus === 'CONFIRMED') { updates.confirmedBy = user.name; updates.confirmedAt = now; }
  if (nextStatus === 'PREPARING') { updates.prepStartedAt = now; }
  if (nextStatus === 'READY') { updates.prepCompletedAt = now; }
  if (nextStatus === 'SERVED') { updates.servedBy = user.name; updates.servedAt = now; }

  const keys = Object.keys(updates);
  const cols = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const vals = [...Object.values(updates), id];
  const rows = await db.unsafe(`UPDATE "Order" SET ${cols} WHERE id = $${keys.length + 1} RETURNING *`, vals);
  return c.json(rows[0]);
});

restaurantOrdersRouter.get('/:id/orders', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const statusFilter = c.req.query('status');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;

  let rows;
  let countRows;
  if (statusFilter) {
    rows = await db`
      SELECT o.*,
        json_build_object('id', t.id, 'tableNumber', t."tableNumber") as table,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', oi.id, 'quantity', oi.quantity, 'subtotal', oi."subtotal",
            'specialInstructions', oi."specialInstructions",
            'menuItem', json_build_object('id', mi.id, 'name', mi.name, 'price', mi.price)
          ))
          FROM "OrderItem" oi
          JOIN "MenuItem" mi ON mi.id = oi."menuItemId"
          WHERE oi."orderId" = o.id
        ), '[]') as items
      FROM "Order" o
      LEFT JOIN "Table" t ON t.id = o."tableId"
      WHERE o."restaurantId" = ${id} AND o.status = ${statusFilter}
      ORDER BY o."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const cnt = await db`SELECT COUNT(*) as total FROM "Order" o WHERE o."restaurantId" = ${id} AND o.status = ${statusFilter}`;
    countRows = cnt;
  } else {
    rows = await db`
      SELECT o.*,
        json_build_object('id', t.id, 'tableNumber', t."tableNumber") as table,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', oi.id, 'quantity', oi.quantity, 'subtotal', oi."subtotal",
            'specialInstructions', oi."specialInstructions",
            'menuItem', json_build_object('id', mi.id, 'name', mi.name, 'price', mi.price)
          ))
          FROM "OrderItem" oi
          JOIN "MenuItem" mi ON mi.id = oi."menuItemId"
          WHERE oi."orderId" = o.id
        ), '[]') as items
      FROM "Order" o
      LEFT JOIN "Table" t ON t.id = o."tableId"
      WHERE o."restaurantId" = ${id}
      ORDER BY o."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const cnt = await db`SELECT COUNT(*) as total FROM "Order" o WHERE o."restaurantId" = ${id}`;
    countRows = cnt;
  }

  return c.json({ orders: rows, total: Number(countRows[0]?.total || 0), page, limit });
});

restaurantOrdersRouter.get('/:id/orders/active', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const rows = await db`
    SELECT o.*,
      json_build_object('id', t.id, 'tableNumber', t."tableNumber") as table,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', oi.id, 'quantity', oi.quantity, 'subtotal', oi."subtotal",
          'specialInstructions', oi."specialInstructions",
          'menuItem', json_build_object('id', mi.id, 'name', mi.name, 'price', mi.price)
        ) ORDER BY oi.id)
        FROM "OrderItem" oi
        JOIN "MenuItem" mi ON mi.id = oi."menuItemId"
        WHERE oi."orderId" = o.id
      ), '[]') as items
    FROM "Order" o
    LEFT JOIN "Table" t ON t.id = o."tableId"
    WHERE o."restaurantId" = ${id} AND o.status IN ('CONFIRMED', 'PREPARING', 'READY')
    ORDER BY o."createdAt" ASC
  `;
  return c.json(rows);
});

export { restaurantOrdersRouter };
export default router;
