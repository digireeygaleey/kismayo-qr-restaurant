import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDb } from './db';
import { AuthUser } from './middleware/auth';
import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import menuRoutes, { categoriesRouter, itemsRouter } from './routes/menu';
import tableRoutes, { tablesRouter } from './routes/tables';
import orderRoutes, { restaurantOrdersRouter } from './routes/orders';
import paymentRoutes from './routes/payments';
import analyticsRoutes from './routes/analytics';

type Variables = {
  db: any;
  user: AuthUser;
};

export interface Env {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  API_URL?: string;
  CUSTOMER_URL?: string;
  ADMIN_URL?: string;
  KITCHEN_URL?: string;
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', cors({ origin: '*', credentials: true }));
app.use('*', async (c, next) => {
  const db = createDb(c.env as any);
  c.set('db', db);
  await next();
});

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.route('/api/auth', authRoutes);
app.route('/api/restaurants', restaurantRoutes);
app.route('/api/restaurants', menuRoutes);
app.route('/api/restaurants', tableRoutes);
app.route('/api/restaurants', restaurantOrdersRouter);
app.route('/api/restaurants', analyticsRoutes);
app.route('/api/categories', categoriesRouter);
app.route('/api/items', itemsRouter);
app.route('/api/tables', tablesRouter);
app.route('/api/orders', orderRoutes);
app.route('/api/payments', paymentRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
