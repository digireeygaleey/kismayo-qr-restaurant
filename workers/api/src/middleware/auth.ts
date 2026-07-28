import { createClient } from '@supabase/supabase-js';
import { Context } from 'hono';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
  restaurantId: string;
}

export async function requireAuth(c: Context): Promise<AuthUser> {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const env = c.env as any;
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }

  const token = header.slice(7);
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error('Invalid token');
  }

  const db = c.get('db');
  const rows = await db`SELECT id, name, email, role, "restaurantId" FROM "User" WHERE "authUid" = ${user.id} LIMIT 1`;
  if (!rows.length) {
    throw new Error('User not found');
  }

  return {
    id: rows[0].id,
    name: rows[0].name,
    email: rows[0].email,
    role: rows[0].role,
    restaurantId: rows[0].restaurantId,
  };
}
