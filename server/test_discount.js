const { Client } = require('pg');
require('dotenv').config();

async function test_discount() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const userId = 70;
    const testAmount = '999.99';
    console.log(`Setting discount for user ${userId} to ${testAmount}`);
    
    await client.query('UPDATE users SET coupon_discount_amount = $1 WHERE id = $2', [testAmount, userId]);
    
    const res = await client.query('SELECT coupon_discount_amount FROM users WHERE id = $1', [userId]);
    console.log('Retrieved:', res.rows[0]);
    
    if (res.rows[0].coupon_discount_amount == testAmount) {
      console.log('✅ DISCOUNT PERSISTENCE VERIFIED');
    } else {
      console.log('❌ DISCOUNT PERSISTENCE FAILED');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

test_discount();
