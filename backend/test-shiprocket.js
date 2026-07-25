
require('dotenv').config();
const axios = require('axios');
console.log("EMAIL:", process.env.SHIPROCKET_EMAIL);
console.log("PASSWORD:", process.env.SHIPROCKET_PASSWORD);
const test = async () => {
  try {
    const res = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/auth/login',
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }
    );
    console.log('Token:', res.data.token);
  } catch (err) {
    console.log('Error:', err.response?.data || err.message);
  }
};
test();