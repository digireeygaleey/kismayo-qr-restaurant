import { Router } from 'express';
import { z } from 'zod';
import { prisma, serializeMenuItem } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().optional(),
});

const itemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  categoryId: z.string().uuid(),
  imageUrl: z.string().optional(),
  sortOrder: z.number().optional(),
  isAvailable: z.boolean().optional(),
  isChefSpecial: z.boolean().optional(),
  tags: z.string().optional(),
  prepTimeMinutes: z.number().int().positive().optional(),
});

router.get('/:id/menu', async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { restaurantId: req.params.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      menuItems: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return res.json(
    categories.map((cat: typeof categories[number]) => ({
      ...cat,
      menuItems: cat.menuItems.map(serializeMenuItem),
    }))
  );
});

router.post('/:id/categories', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user!.restaurantId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({
      data: { ...data, restaurantId: req.params.id },
    });
    return res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Failed to create category' });
  }
});

router.post('/:id/items', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user!.restaurantId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const data = itemSchema.parse(req.body);
    const item = await prisma.menuItem.create({
      data: { ...data, restaurantId: req.params.id },
    });
    return res.status(201).json(serializeMenuItem(item));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Failed to create item' });
  }
});

const categoriesRouter = Router();

categoriesRouter.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const category = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!category || category.restaurantId !== req.user!.restaurantId) {
    return res.status(404).json({ error: 'Category not found' });
  }
  const data = categorySchema.partial().parse(req.body);
  const updated = await prisma.category.update({ where: { id: req.params.id }, data });
  return res.json(updated);
});

categoriesRouter.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const category = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!category || category.restaurantId !== req.user!.restaurantId) {
    return res.status(404).json({ error: 'Category not found' });
  }
  await prisma.category.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});

const itemsRouter = Router();

itemsRouter.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!item || item.restaurantId !== req.user!.restaurantId) {
    return res.status(404).json({ error: 'Item not found' });
  }
  const data = itemSchema.partial().parse(req.body);
  const updated = await prisma.menuItem.update({ where: { id: req.params.id }, data });
  return res.json(serializeMenuItem(updated));
});

itemsRouter.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!item || item.restaurantId !== req.user!.restaurantId) {
    return res.status(404).json({ error: 'Item not found' });
  }
  await prisma.menuItem.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});

itemsRouter.put('/:id/availability', authMiddleware, async (req: AuthRequest, res) => {
  const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!item || item.restaurantId !== req.user!.restaurantId) {
    return res.status(404).json({ error: 'Item not found' });
  }
  const updated = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { isAvailable: !!req.body.isAvailable },
  });
  return res.json(serializeMenuItem(updated));
});

export { categoriesRouter, itemsRouter };
export default router;
