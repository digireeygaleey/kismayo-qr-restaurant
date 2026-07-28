import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  initiateEdahabPayment,
  initiateEvcPlusPayment,
  verifyPaymentCallback,
} from '../services/payment';

const router = Router();

const paymentSchema = z.object({
  orderId: z.string().uuid(),
  phone: z.string().min(7),
});

router.post('/evc-plus', async (req, res) => {
  try {
    const { orderId, phone } = paymentSchema.parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const result = await initiateEvcPlusPayment(phone, Number(order.totalAmount), orderId);
    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Payment failed' });
  }
});

router.post('/edahab', async (req, res) => {
  try {
    const { orderId, phone } = paymentSchema.parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const result = await initiateEdahabPayment(phone, Number(order.totalAmount), orderId);
    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Payment failed' });
  }
});

router.post('/callback', async (req, res) => {
  const body = req.body;
  if (!verifyPaymentCallback(body)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const orderId = body.orderId || body.reference;
  if (!orderId) return res.status(400).json({ error: 'Missing order reference' });

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
    include: { items: { include: { menuItem: true } }, table: true },
  });

  return res.json({ success: true });
});

router.post('/:orderId/mark-paid', authMiddleware, async (req: AuthRequest, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
  if (!order || order.restaurantId !== req.user!.restaurantId) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const updated = await prisma.order.update({
    where: { id: req.params.orderId },
    data: { paymentStatus: 'PAID', status: 'PAID' },
    include: { items: { include: { menuItem: true } }, table: true },
  });

  return res.json(updated);
});

router.get('/:id/status', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    select: { id: true, paymentStatus: true, status: true },
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  return res.json(order);
});

export default router;
