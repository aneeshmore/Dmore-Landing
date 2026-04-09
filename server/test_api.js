const axios = require('axios');

async function test() {
  try {
    console.log('--- Testing Coupon Validation API ---');
    const res = await axios.post('http://localhost:4000/api/users/validate-coupon', {
      code: 'nonexistent'
    });
    console.log('Result:', res.data);
  } catch (err) {
    console.log('Expected Error:', err.response?.data?.message || err.message);
  }
}

test();
