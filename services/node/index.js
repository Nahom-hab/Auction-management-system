import express from 'express';
import dotenv from 'dotenv';
import bidRouter from './route/bid.route.js';
import testRouter from './route/test-router.js';
import escrowRoute from './route/escrow.route.js';
import chapaRoute from './route/chapa.route.js';
import balanceRoute from './route/balance.route.js';
import pool from './db/db.js';

dotenv.config();

const app = express();
app.use(express.json());

// Database connection
const connectToDataBase = async () => {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('Connected to the database:', res.rows[0].now);
    } catch (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }
};

// Route handlers
app.use('/api/balance', balanceRoute);
app.use('/api/payment', chapaRoute);
app.use('/api/escrow', escrowRoute);
app.use('/api/bid', bidRouter);
app.use('/api/sample', testRouter);

const PORT = 5000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await connectToDataBase(); // Ensure DB connection happens after the server starts
});
