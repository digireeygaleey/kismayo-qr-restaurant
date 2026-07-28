import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';

const router = new Hono<any>();

const registerSchema = z.object({
  restaurantName: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function getSupabase(c: any) {
  const url = c.env.SUPABASE_URL || c.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

router.post('/register', async (c) => {
  try {
    const db = c.get('db');
    const body = await c.req.json();
    const data = registerSchema.parse(body);

    const existing = await db`SELECT id FROM "User" WHERE email = ${data.email} LIMIT 1`;
    if (existing.length) return c.json({ error: 'Email already registered' }, 400);

    const slugExists = await db`SELECT id FROM "Restaurant" WHERE slug = ${data.slug} LIMIT 1`;
    if (slugExists.length) return c.json({ error: 'Restaurant slug already taken' }, 400);

    const supabase = getSupabase(c);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (authError || !authData.user) {
      return c.json({ error: authError?.message || 'Registration failed' }, 400);
    }

    const rows = await db`
      INSERT INTO "Restaurant" (id, name, slug, currency, language)
      VALUES (gen_random_uuid(), ${data.restaurantName}, ${data.slug}, 'USD', 'so')
      RETURNING id, name, slug
    `;
    const restaurant = rows[0];

    const users = await db`
      INSERT INTO "User" (id, name, email, role, "restaurantId", "authUid")
      VALUES (gen_random_uuid(), ${data.name}, ${data.email}, 'OWNER', ${restaurant.id}, ${authData.user.id})
      RETURNING id, name, email, role, "restaurantId"
    `;
    const user = users[0];

    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (sessionError || !sessionData.session) {
      return c.json({ error: 'Registration succeeded but login failed' }, 500);
    }

    return c.json({
      token: sessionData.session.access_token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, restaurantId: user.restaurantId },
      restaurant,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    console.error(error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

router.post('/login', async (c) => {
  try {
    const db = c.get('db');
    const body = await c.req.json();
    const data = loginSchema.parse(body);

    const supabase = getSupabase(c);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (authError || !authData.user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const rows = await db`
      SELECT u.id, u.name, u.email, u.role, u."restaurantId",
             row_to_json(r.*) as restaurant
      FROM "User" u
      JOIN "Restaurant" r ON r.id = u."restaurantId"
      WHERE u."authUid" = ${authData.user.id}
      LIMIT 1
    `;
    if (!rows.length) return c.json({ error: 'Invalid credentials' }, 401);

    const user = rows[0];
    if (!authData.session) return c.json({ error: 'No session returned' }, 500);

    return c.json({
      token: authData.session.access_token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, restaurantId: user.restaurantId },
      restaurant: user.restaurant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: 'Login failed' }, 500);
  }
});

router.get('/me', async (c) => {
  const user = await requireAuth(c);
  const db = c.get('db');
  const rows = await db`
    SELECT u.id, u.name, u.email, u.role, u."restaurantId",
           row_to_json(r.*) as restaurant
    FROM "User" u
    JOIN "Restaurant" r ON r.id = u."restaurantId"
    WHERE u.id = ${user.id}
    LIMIT 1
  `;
  if (!rows.length) return c.json({ error: 'User not found' }, 404);
  const u = rows[0];
  return c.json({ id: u.id, name: u.name, email: u.email, role: u.role, restaurantId: u.restaurantId, restaurant: u.restaurant });
});

export default router;
