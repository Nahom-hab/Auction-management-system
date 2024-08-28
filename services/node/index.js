import express from 'express';
import dotenv from 'dotenv';
import bidRouter from './route/bid.route.js'
import testRouter from './route/test-router.js'
import escrowRoute from './route/escrow.route.js'
import pool from './db/db.js';


dotenv.config();

const app = express();
app.use(express.json());


//data base connection
const connectToDataBase = async () => {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('Connected to the database:', res.rows[0].now);
    } catch (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }
}

app.use('/escrow', escrowRoute);
app.use('/api/bid', bidRouter)
app.use('api/sample', testRouter)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectToDataBase()
});

