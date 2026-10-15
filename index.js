const express = require('express');
const app = express();

app.use(express.json());

app.post('/stk/push', async (req, res) => {
  try {
    const { phone, amount } = req.body;

    // 1. Credentials & Configuration
    const consumerKey = 'VDZSKY08g91qVGtAqBIO1naXzJsqfMe0GqY4ypWlJF8nGmAT'; //
    const consumerSecret = 'JTtgBwyA6IOyqSovK65bQwGcfqg2eVmfdfLancaKn6IOf2xU0G6gCzsMJilSydUo'; //
    const shortCode = '174379';
    const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

    // 2. Generate Timestamp
    const date = new Date();
    const timestamp = 
      String(date.getFullYear()) +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0') +
      String(date.getHours()).padStart(2, '0') +
      String(date.getMinutes()).padStart(2, '0') +
      String(date.getSeconds()).padStart(2, '0');

    // 3. Generate Password
    const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');

    // 4. Get Access Token
    const credentials = Buffer.from(consumerKey + ':' + consumerSecret).toString('base64');
    const tokenResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + credentials
      }
    });
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 5. Send STK Push Request
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
    return res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Flow Pay server running on port 3000');
});