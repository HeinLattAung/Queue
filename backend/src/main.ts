import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(null, true); // Allow all for now, log unknown origins
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);

  // Auto-seed test data when using in-memory DB
  if (!process.env.MONGODB_URI) {
    await autoSeed(port);
  }
}

async function autoSeed(port: number | string) {
  const base = `http://localhost:${port}/api`;
  console.log('\n🌱 Auto-seeding test data (in-memory DB)...');

  // Admin account
  try {
    const res = await fetch(`${base}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin Test',
        email: 'admin@test.com',
        password: 'admin123',
        phone: '09123456789',
        restaurantName: 'Test Restaurant',
        location: 'Yangon, Myanmar',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log('  ✅ Admin:    admin@test.com / admin123');

      // Seed menu items with admin token
      const meals = [
        { name: 'Grilled Beef Steak', description: 'Premium ribeye steak grilled to perfection with mashed potatoes.', price: 24.99, category: 'Meat' },
        { name: 'BBQ Pork Ribs', description: 'Slow-smoked pork ribs glazed with house-made BBQ sauce.', price: 19.99, category: 'Meat' },
        { name: 'Lamb Chops', description: 'Herb-crusted lamb chops with rosemary garlic butter.', price: 27.99, category: 'Meat' },
        { name: 'Chicken Teriyaki', description: 'Juicy grilled chicken with sweet teriyaki glaze over rice.', price: 14.99, category: 'Meat' },
        { name: 'Beef Burger Deluxe', description: 'Double smash patty with cheddar and secret sauce.', price: 12.99, category: 'Meat' },
        { name: 'Grilled Salmon Fillet', description: 'Atlantic salmon with lemon dill sauce and asparagus.', price: 22.99, category: 'Fish & Seafood' },
        { name: 'Fish & Chips', description: 'Beer-battered cod with crispy fries and tartar sauce.', price: 13.99, category: 'Fish & Seafood' },
        { name: 'Garlic Butter Shrimp', description: 'Tiger prawns sautéed in garlic herb butter.', price: 18.99, category: 'Fish & Seafood' },
        { name: 'Tuna Poke Bowl', description: 'Fresh ahi tuna with sushi rice, avocado, and sesame soy.', price: 16.99, category: 'Fish & Seafood' },
        { name: 'Lobster Tail', description: 'Broiled lobster tail with drawn butter and fries.', price: 34.99, category: 'Fish & Seafood' },
        { name: 'Caesar Salad', description: 'Crisp romaine, parmesan, croutons, classic dressing.', price: 9.99, category: 'Appetizers' },
        { name: 'Mozzarella Sticks', description: 'Golden-fried mozzarella with marinara sauce.', price: 7.99, category: 'Appetizers' },
        { name: 'Soup of the Day', description: "Chef's daily selection — ask your server.", price: 6.99, category: 'Appetizers' },
        { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center and ice cream.', price: 10.99, category: 'Desserts' },
        { name: 'Cheesecake Slice', description: 'New York-style cheesecake with berry compote.', price: 8.99, category: 'Desserts' },
        { name: 'Fresh Lemonade', description: 'House-squeezed lemonade with mint.', price: 4.99, category: 'Drinks' },
        { name: 'Iced Thai Tea', description: 'Creamy Thai iced tea with condensed milk.', price: 5.49, category: 'Drinks' },
        { name: 'Mango Smoothie', description: 'Blended fresh mango with yogurt and honey.', price: 6.49, category: 'Drinks' },
      ];

      let count = 0;
      for (const meal of meals) {
        const r = await fetch(`${base}/meals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
          body: JSON.stringify(meal),
        });
        if (r.ok) count++;
      }
      console.log(`  ✅ Menu:     ${count} items seeded`);
    }
  } catch (e) {
    console.log('  ❌ Admin seed failed:', e.message);
  }

  // Customer account
  try {
    const res = await fetch(`${base}/auth/customer/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Customer Test',
        email: 'customer@test.com',
        password: 'customer123',
        phone: '09987654321',
      }),
    });
    if (res.ok) console.log('  ✅ Customer: customer@test.com / customer123');
  } catch (e) {
    console.log('  ❌ Customer seed failed:', e.message);
  }

  console.log('  🎉 Seed complete!\n');
}

bootstrap();
