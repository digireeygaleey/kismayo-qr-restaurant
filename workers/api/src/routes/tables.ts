import { Hono } from 'hono';
import QRCode from 'qrcode';
import { requireAuth } from '../middleware/auth';

const router = new Hono<any>();
const tablesRouter = new Hono<any>();

async function generateQrDataUrl(slug: string, tableNumber: number, env: any) {
  const customerUrl = env.CUSTOMER_URL || 'http://localhost:3000';
  const url = `${customerUrl}/menu/${slug}?table=${tableNumber}`;
  return QRCode.toDataURL(url, { width: 300, margin: 2 });
}

router.get('/:id/tables', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const rows = await db`SELECT * FROM "Table" WHERE "restaurantId" = ${id} ORDER BY "tableNumber" ASC`;
  return c.json(rows);
});

router.post('/:id/tables', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const restaurant = await db`SELECT slug FROM "Restaurant" WHERE id = ${id} LIMIT 1`;
  if (!restaurant.length) return c.json({ error: 'Restaurant not found' }, 404);

  const qrCode = await generateQrDataUrl(restaurant[0].slug, body.tableNumber, c.env);
  const rows = await db`
    INSERT INTO "Table" (id, "tableNumber", capacity, "qrCode", "restaurantId")
    VALUES (gen_random_uuid(), ${body.tableNumber}, ${body.capacity || 4}, ${qrCode}, ${id})
    RETURNING *
  `;
  return c.json(rows[0], 201);
});

tablesRouter.put('/:id', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user') as { restaurantId: string };
  const body = await c.req.json();

  const table = await db`SELECT t.*, r.slug FROM "Table" t JOIN "Restaurant" r ON r.id = t."restaurantId" WHERE t.id = ${id} LIMIT 1`;
  if (!table.length || table[0].restaurantId !== user.restaurantId) {
    return c.json({ error: 'Table not found' }, 404);
  }

  let qrCode = table[0].qrCode;
  if (body.tableNumber && body.tableNumber !== table[0].tableNumber) {
    qrCode = await generateQrDataUrl(table[0].slug, body.tableNumber, c.env);
  }

  const updates: Record<string, any> = {};
  if (body.tableNumber !== undefined) updates.tableNumber = body.tableNumber;
  if (body.capacity !== undefined) updates.capacity = body.capacity;
  updates.qrCode = qrCode;

  const keys = Object.keys(updates);
  const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = [...Object.values(updates), id];
  const rows = await db.unsafe(`UPDATE "Table" SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`, values);
  return c.json(rows[0]);
});

tablesRouter.delete('/:id', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  await db`DELETE FROM "Table" WHERE id = ${id}`;
  return c.json({ success: true });
});

tablesRouter.get('/:id/qr', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const table = await db`
    SELECT t.*, r.slug, r.name FROM "Table" t
    JOIN "Restaurant" r ON r.id = t."restaurantId"
    WHERE t.id = ${id} LIMIT 1
  `;
  if (!table.length) return c.json({ error: 'Table not found' }, 404);

  let qrCode = table[0].qrCode;
  if (!qrCode) {
    qrCode = await generateQrDataUrl(table[0].slug, table[0].tableNumber, c.env);
    await db`UPDATE "Table" SET "qrCode" = ${qrCode} WHERE id = ${id}`;
  }

  return c.json({ qrCode, tableNumber: table[0].tableNumber, restaurant: table[0].name });
});

export { tablesRouter };
export default router;
