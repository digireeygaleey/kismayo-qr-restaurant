import { Router } from 'express';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { prisma, serializeOrder } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { emitNewOrder, emitOrderUpdate } from '../services/socket';

const router = Router();

const orderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  specialInstructions: z.string().optional(),
});

const createOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  tableId: z.string().uuid().optional(),
  tableNumber: z.number().int().positive().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  paymentMethod: z.enum(['EVC_PLUS', 'EDAHAB', 'SAHAL', 'CASH', 'BANK']).optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

router.post('/', async (req, res) => {
  try {
    const data = createOrderSchema.parse(req.body);

    let tableId = data.tableId;
    if (!tableId && data.tableNumber) {
      const table = await prisma.table.findFirst({
        where: { restaurantId: data.restaurantId, tableNumber: data.tableNumber },
      });
      if (!table) {
        return res.status(400).json({ error: 'Table not found' });
      }
      tableId = table.id;
    }
    if (!tableId) {
      return res.status(400).json({ error: 'Table ID or table number required' });
    }

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: data.items.map((i) => i.menuItemId) },
        restaurantId: data.restaurantId,
        isAvailable: true,
      },
    });

    if (menuItems.length !== data.items.length) {
      return res.status(400).json({ error: 'Some menu items are unavailable' });
    }

    const itemMap = new Map(menuItems.map((m) => [m.id, m]));
    let totalAmount = 0;
    const orderItems = data.items.map((item) => {
      const menuItem = itemMap.get(item.menuItemId)!;
      const unitPrice = Number(menuItem.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        specialInstructions: item.specialInstructions,
      };
    });

    const isMobileMoney = data.paymentMethod && data.paymentMethod !== 'CASH' && data.paymentMethod !== 'BANK';
    const initialStatus = isMobileMoney ? 'PENDING' : 'CONFIRMED';

    const order = await prisma.order.create({
      data: {
        restaurantId: data.restaurantId,
        tableId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        totalAmount,
        status: initialStatus,
        paymentStatus: isMobileMoney ? 'UNPAID' : 'UNPAID',
        items: { create: orderItems },
      },
      include: {
        items: { include: { menuItem: true } },
        table: true,
      },
    });

    const serialized = serializeOrder(order);
    emitNewOrder(data.restaurantId, serialized);

    // Increment order counts for menu items
    for (const item of data.items) {
      await prisma.menuItem.update({
        where: { id: item.menuItemId },
        data: { orderCount: { increment: item.quantity } },
      }).catch(() => {});
    }

    return res.status(201).json(serialized);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

router.get('/:id', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      items: { include: { menuItem: true } },
      table: true,
    },
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  return res.json(serializeOrder(order));
});

router.get('/:id/payment-status', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, paymentStatus: true },
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  return res.json(order);
});

router.post('/:id/cancel', async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
    return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
  }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
    include: {
      items: { include: { menuItem: true } },
      table: true,
    },
  });

  const serialized = serializeOrder(updated);
  emitOrderUpdate(updated.restaurantId, serialized);
  return res.json(serialized);
});

router.put('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  const status = req.body.status as OrderStatus;
  const validStatuses: OrderStatus[] = [
    'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'PAID', 'CANCELLED',
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.restaurantId !== req.user!.restaurantId) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (existing.paymentStatus === 'PAID') {
    return res.status(400).json({ error: 'Cannot change a paid order' });
  }
  if (existing.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Cannot change a cancelled order' });
  }

  const updateData: Record<string, unknown> = {
    status,
    paymentStatus: status === 'PAID' ? 'PAID' : undefined,
  };

  if (status === 'CONFIRMED' && !existing.confirmedAt) {
    updateData.confirmedBy = req.user!.name;
    updateData.confirmedAt = new Date();
  }
  if (status === 'SERVED' && !existing.servedAt) {
    updateData.servedBy = req.user!.name;
    updateData.servedAt = new Date();
  }
  if (status === 'PREPARING' && !existing.prepStartedAt) {
    updateData.prepStartedAt = new Date();
  }
  if (status === 'READY' && !existing.prepCompletedAt) {
    updateData.prepCompletedAt = new Date();
  }

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      items: { include: { menuItem: true } },
      table: true,
    },
  });

  const serialized = serializeOrder(order);
  emitOrderUpdate(order.restaurantId, serialized);
  return res.json(serialized);
});

const restaurantOrdersRouter = Router();

restaurantOrdersRouter.get('/:id/orders', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user!.restaurantId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const orders = await prisma.order.findMany({
    where: { restaurantId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { menuItem: true } },
      table: true,
    },
    take: 100,
  });
  return res.json(orders.map(serializeOrder));
});

restaurantOrdersRouter.get('/:id/orders/active', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user!.restaurantId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const orders = await prisma.order.findMany({
    where: {
      restaurantId: req.params.id,
      status: { in: ['CONFIRMED', 'PREPARING', 'READY'] },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      items: { include: { menuItem: true } },
      table: true,
    },
  });
  return res.json(orders.map(serializeOrder));
});

export { restaurantOrdersRouter };
export default router;
