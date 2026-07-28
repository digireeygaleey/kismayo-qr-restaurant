import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import menuRoutes, { categoriesRouter, itemsRouter } from './routes/menu';
import tableRoutes, { tablesRouter } from './routes/tables';
import orderRoutes, { restaurantOrdersRouter } from './routes/orders';
import paymentRoutes from './routes/payments';
import analyticsRoutes from './routes/analytics';
import { initSocket } from './services/socket';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

initSocket(server);

const origins = [
  process.env.CUSTOMER_URL || 'http://localhost:3000',
  process.env.ADMIN_URL || 'http://localhost:3001',
  process.env.KITCHEN_URL || 'http://localhost:3002',
];

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/restaurants', menuRoutes);
app.use('/api/restaurants', tableRoutes);
app.use('/api/restaurants', restaurantOrdersRouter);
app.use('/api/restaurants', analyticsRoutes);
app.use('/api/categories', categoriesRouter);
app.use('/api/items', itemsRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
