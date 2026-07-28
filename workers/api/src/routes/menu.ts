import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';

const router = new Hono<any>();
const categoriesRouter = new Hono<any>();
const itemsRouter = new Hono<any>();

router.get('/:id/menu', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const categories = await db`
    SELECT c.*,
      COALESCE(json_agg(
        json_build_object(
          'id', mi.id, 'name', mi.name, 'description', mi.description,
          'price', mi.price, 'imageUrl', mi."imageUrl", 'sortOrder', mi."sortOrder",
          'isAvailable', mi."isAvailable", 'isChefSpecial', mi."isChefSpecial",
          'prepTimeMinutes', mi."prepTimeMinutes", 'tags', mi.tags,
          'categoryId', mi."categoryId", 'orderCount', mi."orderCount"
        ) ORDER BY mi."sortOrder" ASC
      ) FILTER (WHERE mi.id IS NOT NULL), '[]') as items
    FROM "Category" c
    LEFT JOIN "MenuItem" mi ON mi."categoryId" = c.id
    WHERE c."restaurantId" = ${id}
    GROUP BY c.id
    ORDER BY c."sortOrder" ASC
  `;
  return c.json(categories);
});

router.post('/:id/categories', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const rows = await db`
    INSERT INTO "Category" (id, name, "sortOrder", "restaurantId")
    VALUES (gen_random_uuid(), ${body.name}, ${body.sortOrder || 0}, ${id})
    RETURNING *
  `;
  return c.json(rows[0], 201);
});

router.post('/:id/items', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const rows = await db`
    INSERT INTO "MenuItem" (id, name, description, price, "imageUrl", "sortOrder", "isAvailable", "isChefSpecial", "prepTimeMinutes", tags, "categoryId", "restaurantId")
    VALUES (gen_random_uuid(), ${body.name}, ${body.description || null}, ${body.price}, ${body.imageUrl || null}, ${body.sortOrder || 0}, true, ${body.isChefSpecial || false}, ${body.prepTimeMinutes || null}, ${body.tags || null}, ${body.categoryId}, ${id})
    RETURNING *
  `;
  return c.json(rows[0], 201);
});

categoriesRouter.put('/:id', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const rows = await db`
    UPDATE "Category" SET name = ${body.name}, "sortOrder" = ${body.sortOrder || 0}
    WHERE id = ${id} RETURNING *
  `;
  return c.json(rows[0]);
});

categoriesRouter.delete('/:id', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  await db`DELETE FROM "Category" WHERE id = ${id}`;
  return c.json({ success: true });
});

itemsRouter.put('/:id', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const allowed = ['name', 'description', 'price', 'imageUrl', 'sortOrder', 'isAvailable', 'isChefSpecial', 'prepTimeMinutes', 'tags', 'categoryId'];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  const keys = Object.keys(updates);
  const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = [...Object.values(updates), id];
  const rows = await db.unsafe(`UPDATE "MenuItem" SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`, values);
  return c.json(rows[0]);
});

itemsRouter.delete('/:id', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  await db`DELETE FROM "MenuItem" WHERE id = ${id}`;
  return c.json({ success: true });
});

itemsRouter.put('/:id/availability', async (c) => {
  await requireAuth(c);
  const db = c.get('db');
  const id = c.req.param('id');
  const rows = await db`
    UPDATE "MenuItem" SET "isAvailable" = NOT "isAvailable" WHERE id = ${id} RETURNING *
  `;
  return c.json(rows[0]);
});

export { categoriesRouter, itemsRouter };
export default router;
