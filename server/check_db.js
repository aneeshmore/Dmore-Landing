const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const columns = [
      'coupon_code',
      'payment_base_amount',
      'payment_discount_amount',
      'payment_gst_amount',
      'payment_final_amount'
    ];
    for (const col of columns) {
      const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='${col}'`);
      if (res.rows.length === 0) {
        console.log(`Column ${col} missing. Adding it...`);
        await client.query(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
        console.log(`Column ${col} added successfully.`);
      } else {
        console.log(`Column ${col} already exists.`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

check();
