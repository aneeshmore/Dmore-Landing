const { Client } = require('pg');
require('dotenv').config();

async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const userId = 110; 
    console.log('--- Testing Persistence for User 110 ---');
    
    // 1. Update
    await client.query("UPDATE users SET coupon_code = 'TEST123PERSIST' WHERE id = $1", [userId]);
    console.log('Updated user 110 with coupon TEST123PERSIST');
    
    // 2. Fetch
    const res = await client.query("SELECT coupon_code FROM users WHERE id = $1", [userId]);
    console.log('Fetch result:', res.rows[0]);
    
    if (res.rows[0].coupon_code === 'TEST123PERSIST') {
      console.log('✅ DATABASE PERSISTENCE VERIFIED');
    } else {
      console.log('❌ DATABASE PERSISTENCE FAILED');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

test();
