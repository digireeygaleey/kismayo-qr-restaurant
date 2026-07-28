import { Router } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const tableSchema = z.object({
  tableNumber: z.number().int().positive(),
  capacity: z.number().int().positive().optional(),
});

async function generateQrDataUrl(restaurantSlug: string, tableNumber: number) {
  const customerUrl = process.env.CUSTOMER_URL || 'http://localhost:3000';
  const url = `${customerUrl}/menu/${restaurantSlug}?table=${tableNumber}`;
  return QRCode.toDataURL(url, { width: 300, margin: 2 });
}

router.get('/:id/tables', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user!.restaurantId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const tables = await prisma.table.findMany({
    where: { restaurantId: req.params.id },
    orderBy: { tableNumber: 'asc' },
  });
  return res.json(tables);
});

router.post('/:id/tables', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user!.restaurantId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const data = tableSchema.parse(req.body);
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.id },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const qrCode = await generateQrDataUrl(restaurant.slug, data.tableNumber);
    const table = await prisma.table.create({
      data: {
        restaurantId: req.params.id,
        tableNumber: data.tableNumber,
        capacity: data.capacity ?? 4,
        qrCode,
      },
    });
    return res.status(201).json(table);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Failed to create table' });
  }
});

const tablesRouter = Router();

tablesRouter.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const table = await prisma.table.findUnique({
    where: { id: req.params.id as string },
    include: { restaurant: true },
  }) as any;
  if (!table || table.restaurantId !== req.user!.restaurantId) {
    return res.status(404).json({ error: 'Table not found' });
  }
  const data = tableSchema.partial().parse(req.body);
  let qrCode = table.qrCode;
  if (data.tableNumber && data.tableNumber !== table.tableNumber) {
    qrCode = await generateQrDataUrl(table.restaurant.slug, data.tableNumber);
  }
  const updated = await prisma.table.update({
    where: { id: req.params.id as string },
    data: { ...data, qrCode },
  });
  return res.json(updated);
});

tablesRouter.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const table = await prisma.table.findUnique({ where: { id: req.params.id as string } });
  if (!table || table.restaurantId !== req.user!.restaurantId) {
    return res.status(404).json({ error: 'Table not found' });
  }
  await prisma.table.delete({ where: { id: req.params.id as string } });
  return res.json({ success: true });
});

tablesRouter.get('/:id/qr', async (req, res) => {
  const table = await prisma.table.findUnique({
    where: { id: req.params.id as string },
    include: { restaurant: true },
  }) as any;
  if (!table) return res.status(404).json({ error: 'Table not found' });

  let qrCode = table.qrCode;
  if (!qrCode) {
    qrCode = await generateQrDataUrl(table.restaurant.slug, table.tableNumber);
    await prisma.table.update({ where: { id: table.id }, data: { qrCode } });
  }

  return res.json({ qrCode, tableNumber: table.tableNumber, restaurant: (table as any).restaurant.name });
});

export { tablesRouter };
export default router;
