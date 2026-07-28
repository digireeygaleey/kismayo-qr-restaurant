import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

const router = new Hono<any>();

function generateReference(): string {
  return `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

router.post('/evc-plus', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const order = await db`SELECT * FROM "Order" WHERE id = ${body.orderId} LIMIT 1`;
  if (!order.length) return c.json({ error: 'Order not found' }, 404);

  const reference = generateReference();

  await db`
    INSERT INTO "Payment" (id, amount, method, reference, status, "orderId")
    VALUES (gen_random_uuid(), ${order[0].totalAmount}, 'EVC_PLUS', ${reference}, 'PENDING', ${body.orderId})
  `;

  return c.json({
    success: true,
    reference,
    message: 'EVC Plus payment initiated. Check your phone for the PIN prompt.',
  });
});

router.post('/edahab', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const order = await db`SELECT * FROM "Order" WHERE id = ${body.orderId} LIMIT 1`;
  if (!order.length) return c.json({ error: 'Order not found' }, 404);

  const reference = generateReference();

  await db`
    INSERT INTO "Payment" (id, amount, method, reference, status, "orderId")
    VALUES (gen_random_uuid(), ${order[0].totalAmount}, 'EDAHAB', ${reference}, 'PENDING', ${body.orderId})
  `;

  return c.json({
    success: true,
    reference,
    message: 'eDahab payment initiated. Check your phone for the PIN prompt.',
  });
});

router.post('/callback', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();

  const payment = await db`SELECT * FROM "Payment" WHERE reference = ${body.reference} LIMIT 1`;
  if (!payment.length) return c.json({ error: 'Payment not found' }, 404);

  if (body.status === 'COMPLETED') {
    await db`UPDATE "Payment" SET status = 'COMPLETED' WHERE id = ${payment[0].id}`;
    await db`UPDATE "Order" SET status = 'CONFIRMED', "paymentStatus" = 'PAID' WHERE id = ${payment[0].orderId}`;
  } else {
    await db`UPDATE "Payment" SET status = 'FAILED' WHERE id = ${payment[0].id}`;
  }

  return c.json({ success: true });
});

router.post('/:orderId/mark-paid', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const orderId = c.req.param('orderId');

  const order = await db`SELECT * FROM "Order" WHERE id = ${orderId} LIMIT 1`;
  if (!order.length) return c.json({ error: 'Order not found' }, 404);

  await db`UPDATE "Order" SET "paymentStatus" = 'PAID' WHERE id = ${orderId}`;
  const rows = await db`SELECT * FROM "Order" WHERE id = ${orderId} LIMIT 1`;
  return c.json(rows[0]);
});

router.get('/:id/status', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const payments = await db`
    SELECT * FROM "Payment" WHERE "orderId" = ${id} ORDER BY "createdAt" DESC LIMIT 1
  `;
  if (!payments.length) return c.json({ status: 'NOT_FOUND' });
  return c.json(payments[0]);
});

export default router;
