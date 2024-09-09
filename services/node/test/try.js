const Chapa = require('chapa');
const express = require('express');
const app = express();
const { Client } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');
var secret = "abcdef";

const myChapa = new Chapa('CHASECK_TEST-a2JpV9mvvvhf9RgUYD93fAOwezvIIia1');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'auctionDB',
    password: 'password',
    port: 5432,
});

client.connect();



app.post('/add_balance', (req, res) => {
    const { amount, user_id, email, first_name, last_name } = req.body;

    const customerInfo = {
        amount: amount,
        currency: 'ETB',
        email: email,
        first_name: first_name,
        last_name: last_name,
        callback_url: 'https://localhost:3000/web/hook',
        return_url: 'https://localhost:3000/success',
        customization: {
            title: 'I love e-auction',
            description: 'It is time to pay'
        }
    };

    myChapa.initialize(customerInfo, { autoRef: true }).then(response => {
        const paymentUrl = response.data.checkout_url;
        console.log(response);
        res.redirect(paymentUrl); // Redirect to payment
    }).catch(e => console.log(e)); // catch errors
});

app.get('/success', async (req, res) => {
    //  const { user_id, amount } = req.body; // Get user_id and amount from query parameters
    const user_id = user_id;
    const amount = amount;
    if (!user_id || !amount) {
        return res.status(400).send('Missing user_id or amount');
    }

    try {
        const result = await client.query(
            'UPDATE balance SET current_balance = current_balance + $1 WHERE user_id = $2', [amount, user_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('User not found or balance update failed');
        }

        res.status(200).send('Balance updated successfully');
    } catch (error) {
        console.error('Error updating balance:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.post("/web/hook", function (req, res) {
    //validate event
    const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash == req.headers['Chapa-Signature']) {
        // Retrieve the request's body
        const event = req.body;
        res.json(event);
        console.log(event);
        // Do something with event  
    }
    res.send(200);
});
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});