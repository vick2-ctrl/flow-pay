const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
const mongoose = require('mongoose');

// Cleaning Booking Schema
const bookingSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  serviceType: { type: String, required: true }, // e.g., "Deep Clean", "Standard Clean"
  appointmentDate: { type: Date, required: true },
  address: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);
// 1. Connect to MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGODB_CONNECTION_STRING_HERE';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully!');
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });

// 2. M-Pesa STK Push Route
app.post('/stk/push', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    
    const consumerKey = 'VDZSKY08g91qVGtAqBIO1naXzJsqfMe0GqY4ypWlJF8nGmAT';
    const consumerSecret = 'JTtgBwyA6IOyqSovK65bQwGcfqg2eVmfdfLancaKn6IOf2xU0G6gCzsMJilSydUo';
    const shortCode = '174379';
    const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

    // Generate Timestamp
    const date = new Date();
    const timestamp = String(date.getFullYear()) + 
      String(date.getMonth() + 1).padStart(2, '0') + 
      String(date.getDate()).padStart(2, '0') + 
      String(date.getHours()).padStart(2, '0') + 
      String(date.getMinutes()).padStart(2, '0') + 
      String(date.getSeconds()).padStart(2, '0');

    // Generate Password
    const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');

    // Get Access Token
    const credentials = Buffer.from(consumerKey + ':' + consumerSecret).toString('base64');
    const tokenResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      method: 'GET',
      headers: { 'Authorization': 'Basic ' + credentials }
    });
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Send STK Push Request
    const url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
    const requestBody = {
      "BusinessShortCode": shortCode,
      "Password": password,
      "Timestamp": timestamp,
      "TransactionType": "CustomerPayBillOnline",
      "Amount": amount || "1",
      "PartyA": phone,
      "PartyB": shortCode,
      "PhoneNumber": phone,
      "CallBackURL": "https://mydomain.com/path",
      "AccountReference": "FlowPay",
      "TransactionDesc": "Test Payment"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error in STK Push:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Start the Server at the very bottom
// 3. CREATE a new cleaning booking (POST)
app.post('/api/bookings', async (req, res) => {
  try {
    const { customerName, serviceType, appointmentDate, address } = req.body;
    
    const newBooking = new Booking({
      customerName,
      serviceType,
      appointmentDate,
      address
    });

    const savedBooking = await newBooking.save();
    res.status(201).json({ message: 'Booking created successfully!', booking: savedBooking });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking', details: err.message });
  }
});

// 4. GET all bookings (GET)
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ appointmentDate: 1 });
    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings', details: err.message });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Flow Pay server running on port ${PORT}`);
});
