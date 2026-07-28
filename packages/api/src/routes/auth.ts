import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, signToken, AuthRequest } from '../middleware/auth';

const router = Router();

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

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const slugExists = await prisma.restaurant.findUnique({ where: { slug: data.slug } });
    if (slugExists) {
      return res.status(400).json({ error: 'Restaurant slug already taken' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const restaurant = await prisma.restaurant.create({
      data: {
        name: data.restaurantName,
        slug: data.slug,
        users: {
          create: {
            name: data.name,
            email: data.email,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const user = restaurant.users[0];
    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: restaurant.id,
    };

    return res.status(201).json({
      token: signToken(authUser),
      user: { ...authUser, restaurant },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { restaurant: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    return res.json({
      token: signToken(authUser),
      user: { ...authUser, restaurant: user.restaurant },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { restaurant: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    restaurantId: user.restaurantId,
    restaurant: user.restaurant,
  });
});

export default router;
