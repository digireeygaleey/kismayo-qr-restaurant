import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

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

    const supabase = getSupabase();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Registration failed' });
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name: data.restaurantName,
        slug: data.slug,
        users: {
          create: {
            authUid: authData.user.id,
            name: data.name,
            email: data.email,
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

    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    return res.status(201).json({
      token: sessionData?.session?.access_token || '',
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

    const supabase = getSupabase();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = await prisma.user.findUnique({
      where: { authUid: authData.user.id },
      include: { restaurant: true },
    });

    if (!user) {
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
      token: authData.session?.access_token || '',
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
