/**
 * Seed script — creates test Admin + Customer accounts + Menu items.
 *
 * Usage:  npx ts-node seed.ts
 * (Run while the backend is running on port 3000)
 */

const API = process.env.API_URL || 'http://localhost:3000/api';

const menuItems = [
  // 🥩 Meat
  { name: 'Grilled Beef Steak',       description: 'Premium ribeye steak grilled to perfection, served with mashed potatoes and seasonal vegetables.',  price: 24.99, category: 'Meat' },
  { name: 'BBQ Pork Ribs',            description: 'Slow-smoked pork ribs glazed with house-made BBQ sauce. Fall-off-the-bone tender.',                 price: 19.99, category: 'Meat' },
  { name: 'Lamb Chops',               description: 'Herb-crusted lamb chops with rosemary garlic butter and roasted potatoes.',                         price: 27.99, category: 'Meat' },
  { name: 'Chicken Teriyaki',          description: 'Juicy grilled chicken thighs with sweet teriyaki glaze, served over steamed rice.',                 price: 14.99, category: 'Meat' },
  { name: 'Beef Burger Deluxe',        description: 'Double smash patty with cheddar, caramelized onions, pickles, and secret sauce.',                   price: 12.99, category: 'Meat' },

  // 🐟 Fish & Seafood
  { name: 'Grilled Salmon Fillet',     description: 'Atlantic salmon fillet with lemon dill sauce, asparagus, and wild rice.',                           price: 22.99, category: 'Fish & Seafood' },
  { name: 'Fish & Chips',              description: 'Beer-battered cod with crispy fries, mushy peas, and tartar sauce.',                                price: 13.99, category: 'Fish & Seafood' },
  { name: 'Garlic Butter Shrimp',      description: 'Tiger prawns sautéed in garlic herb butter, served with crusty bread.',                             price: 18.99, category: 'Fish & Seafood' },
  { name: 'Tuna Poke Bowl',            description: 'Fresh ahi tuna with sushi rice, avocado, edamame, and sesame soy dressing.',                        price: 16.99, category: 'Fish & Seafood' },
  { name: 'Lobster Tail',              description: 'Broiled lobster tail with drawn butter, served with coleslaw and fries.',                           price: 34.99, category: 'Fish & Seafood' },

  // 🥗 Appetizers & Sides
  { name: 'Caesar Salad',              description: 'Crisp romaine, parmesan, croutons, and classic Caesar dressing.',                                   price: 9.99,  category: 'Appetizers' },
  { name: 'Mozzarella Sticks',         description: 'Golden-fried mozzarella sticks with marinara dipping sauce.',                                       price: 7.99,  category: 'Appetizers' },
  { name: 'Soup of the Day',           description: 'Chef\'s daily selection. Ask your server for today\'s flavor.',                                     price: 6.99,  category: 'Appetizers' },

  // 🍰 Desserts
  { name: 'Chocolate Lava Cake',       description: 'Warm chocolate cake with a molten center, topped with vanilla ice cream.',                          price: 10.99, category: 'Desserts' },
  { name: 'Cheesecake Slice',          description: 'New York-style cheesecake with berry compote.',                                                     price: 8.99,  category: 'Desserts' },

  // 🥤 Drinks
  { name: 'Fresh Lemonade',            description: 'House-squeezed lemonade with mint.',                                                                price: 4.99,  category: 'Drinks' },
  { name: 'Iced Thai Tea',             description: 'Creamy Thai iced tea with condensed milk.',                                                         price: 5.49,  category: 'Drinks' },
  { name: 'Mango Smoothie',            description: 'Blended fresh mango with yogurt and honey.',                                                       price: 6.49,  category: 'Drinks' },
];

async function seed() {
  console.log('🌱 Seeding test data...\n');

  let adminToken: string | null = null;

  // ── 1. Admin (Owner) Account ──
  try {
    // Try signup first
    let res = await fetch(`${API}/auth/signup`, {
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
      adminToken = data.token;
      console.log('✅ Admin account created');
      console.log(`   Email:    admin@test.com`);
      console.log(`   Password: admin123`);
      console.log(`   Role:     ${data.user.role}`);
      console.log(`   Business: ${data.user.businessId}\n`);
    } else {
      // Already exists — login instead
      res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' }),
      });

      if (res.ok) {
        const data = await res.json();
        adminToken = data.token;
        console.log('✅ Admin account already exists — logged in');
        console.log(`   Email:    admin@test.com`);
        console.log(`   Password: admin123\n`);
      } else {
        console.log('⚠️  Admin: could not signup or login\n');
      }
    }
  } catch (e: any) {
    console.error('❌ Admin signup failed — is the backend running?\n', e.message);
  }

  // ── 2. Customer Account ──
  try {
    let res = await fetch(`${API}/auth/customer/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Customer Test',
        email: 'customer@test.com',
        password: 'customer123',
        phone: '09987654321',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log('✅ Customer account created');
      console.log(`   Email:    customer@test.com`);
      console.log(`   Password: customer123`);
      console.log(`   Role:     ${data.user.role}\n`);
    } else {
      console.log('⚠️  Customer: already exists\n');
    }
  } catch (e: any) {
    console.error('❌ Customer signup failed\n', e.message);
  }

  // ── 3. Seed Menu Items ──
  if (!adminToken) {
    console.log('⚠️  Skipping menu items — no admin token available.\n');
    return;
  }

  console.log('🍽️  Seeding menu items...\n');

  let created = 0;
  let skipped = 0;

  for (const item of menuItems) {
    try {
      const res = await fetch(`${API}/meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(item),
      });

      if (res.ok) {
        created++;
        console.log(`   ✅ ${item.category.padEnd(16)} ${item.name}`);
      } else {
        skipped++;
        console.log(`   ⚠️  ${item.category.padEnd(16)} ${item.name} — skipped`);
      }
    } catch (e: any) {
      skipped++;
      console.log(`   ❌ ${item.name} — ${e.message}`);
    }
  }

  console.log(`\n📊 Menu: ${created} created, ${skipped} skipped`);
  console.log('\n════════════════════════════════════════');
  console.log('  TEST CREDENTIALS');
  console.log('════════════════════════════════════════');
  console.log('  Admin:    admin@test.com / admin123');
  console.log('  Customer: customer@test.com / customer123');
  console.log('════════════════════════════════════════\n');
  console.log('Done! ✨');
}

seed();
