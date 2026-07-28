import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

async function generateQr(slug: string, tableNumber: number) {
  const url = `http://localhost:3000/menu/${slug}?table=${tableNumber}`;
  return QRCode.toDataURL(url, { width: 300, margin: 2 });
}

async function main() {
  console.log('Seeding database...');

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  let authUid: string | undefined;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@mecca-hotel.so',
      password: 'admin123',
      email_confirm: true,
    });
    if (error) {
      console.warn('Supabase user creation failed (may already exist):', error.message);
    } else {
      authUid = data.user.id;
    }
  } else {
    console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping auth user creation.');
    console.warn('Run `npx tsx prisma/seed.ts` after configuring Supabase credentials in .env');
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Mecca Hotel Restaurant',
      slug: 'mecca-hotel',
      description: 'Premium dining in the heart of Kismayo',
      phone: '+252 61 1234567',
      address: 'Kismayo, Jubaland, Somalia',
      currency: 'USD',
      language: 'so',
      users: {
        create: {
          authUid,
          name: 'Admin User',
          email: 'admin@mecca-hotel.so',
          role: 'OWNER',
        },
      },
    },
  });

  const categories = await Promise.all([
    prisma.category.create({
      data: { restaurantId: restaurant.id, name: 'Food', sortOrder: 1 },
    }),
    prisma.category.create({
      data: { restaurantId: restaurant.id, name: 'Drinks', sortOrder: 2 },
    }),
    prisma.category.create({
      data: { restaurantId: restaurant.id, name: 'Desserts', sortOrder: 3 },
    }),
  ]);

  const [food, drinks, desserts] = categories;

  await prisma.menuItem.createMany({
    data: [
      { restaurantId: restaurant.id, categoryId: food.id, name: 'Bariis iyo Hilib', description: 'Traditional Somali rice with goat meat', price: 8.5, sortOrder: 1, isChefSpecial: true, tags: JSON.stringify(['Halal']), prepTimeMinutes: 25, orderCount: 45 },
      { restaurantId: restaurant.id, categoryId: food.id, name: 'Suqaar', description: 'Diced meat with vegetables and spices', price: 7.0, sortOrder: 2, tags: JSON.stringify(['Halal', 'Gluten-Free']), prepTimeMinutes: 20, orderCount: 32 },
      { restaurantId: restaurant.id, categoryId: food.id, name: 'Canjeero & Maraq', description: 'Somali pancake with stew', price: 5.5, sortOrder: 3, tags: JSON.stringify(['Halal']), prepTimeMinutes: 15, orderCount: 28 },
      { restaurantId: restaurant.id, categoryId: food.id, name: 'Grilled Fish', description: 'Fresh Indian Ocean fish, grilled', price: 12.0, sortOrder: 4, isChefSpecial: true, tags: JSON.stringify(['Halal', 'Gluten-Free']), prepTimeMinutes: 30, orderCount: 18 },
      { restaurantId: restaurant.id, categoryId: food.id, name: 'Falafel Plate', description: 'Crispy chickpea fritters with hummus', price: 6.0, sortOrder: 5, tags: JSON.stringify(['Vegan', 'Halal']), prepTimeMinutes: 15, orderCount: 12 },
      { restaurantId: restaurant.id, categoryId: drinks.id, name: 'Shaah', description: 'Somali spiced tea', price: 1.5, sortOrder: 1, tags: JSON.stringify(['Vegan']), prepTimeMinutes: 5, orderCount: 55 },
      { restaurantId: restaurant.id, categoryId: drinks.id, name: 'Caano', description: 'Fresh camel milk', price: 2.0, sortOrder: 2, tags: JSON.stringify(['Halal']), prepTimeMinutes: 2, orderCount: 38 },
      { restaurantId: restaurant.id, categoryId: drinks.id, name: 'Bottled Water', description: '500ml mineral water', price: 1.0, sortOrder: 3, tags: JSON.stringify(['Vegan', 'Gluten-Free']), prepTimeMinutes: 1, orderCount: 60 },
      { restaurantId: restaurant.id, categoryId: drinks.id, name: 'Fresh Juice', description: 'Mango or passion fruit', price: 3.0, sortOrder: 4, tags: JSON.stringify(['Vegan']), prepTimeMinutes: 5, orderCount: 25 },
      { restaurantId: restaurant.id, categoryId: desserts.id, name: 'Halwa', description: 'Traditional Somali sweet', price: 3.5, sortOrder: 1, isChefSpecial: true, tags: JSON.stringify(['Halal']), prepTimeMinutes: 5, orderCount: 22 },
      { restaurantId: restaurant.id, categoryId: desserts.id, name: 'Ice Cream', description: 'Vanilla or chocolate', price: 2.5, sortOrder: 2, tags: JSON.stringify(['Halal']), prepTimeMinutes: 2, orderCount: 30 },
    ],
  });

  for (let i = 1; i <= 8; i++) {
    const qrCode = await generateQr(restaurant.slug, i);
    await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        tableNumber: i,
        capacity: i <= 4 ? 4 : 6,
        qrCode,
      },
    });
  }

  console.log('Seed complete!');
  if (!authUid) {
    console.log('');
    console.log('⚠ No Supabase user was created. Configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
    console.log('  in .env and run `npx tsx prisma/seed.ts` again to create the demo auth user.');
  }
  console.log('');
  console.log('Demo credentials:');
  console.log('  Email: admin@mecca-hotel.so');
  console.log('  Password: admin123');
  console.log('');
  console.log('Customer menu: http://localhost:3000/menu/mecca-hotel?table=1');
  console.log('Admin dashboard: http://localhost:3001');
  console.log('Kitchen display: http://localhost:3002');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
