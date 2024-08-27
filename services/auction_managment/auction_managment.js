const express = require('express');
const { Pool } = require('pg');
const ejs = require('ejs');
const path = require('path');

const app = express();
app.use(express.json());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use('/static', express.static('static'));
app.use(express.urlencoded({ extended: true }));

// PostgreSQL connection
const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: '1234',
    database: 'setup_db'
});

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database', err);
        process.exit(1); // Exit the process if the connection fails
    } else {
        console.log('Connected to the database', res.rows[0].now);
    }
});
app.listen(3000, () => { console.log('listning') });


app.get('/', async(req, res) => {
    const data = await pool.query('SELECT * FROM auction');
    //  res.render('auctions', { data: data.rows });
    res.status(201).json(data.rows[0]);
});

app.put('/update/:id', async(req, res) => {
    try {
        const id = req.params.id;
        const data = await pool.query('SELECT * FROM auction WHERE id=$1', [id]);
        res.render('update', { data: data.rows });
    } catch (error) {
        console.error('Error executing SQL query:', error);
    }

});
app.delete('/delete/:id', async(req, res) => {
    try {
        const id = req.params.id;
        await pool.query('DELETE FROM auction WHERE id=$1 RETURNING *', [id]);
        res.redirect('/');
    } catch (error) {
        console.error('Error executing SQL query:', error);
        res.status(500).json({ error: 'An error occurred while processing the request.' });
    }
});


app.post('/auctions', async(req, res) => {
    const {
        user_id,
        auction_style,
        auction_category,
        auction_type,
        auction_description,
        starting_bid,
        increment_amount,
        bid_starting_time,
        bid_closing_time
    } = req.body;

    try {
        // Insert the auction data into the database
        const result = await pool.query(
            'INSERT INTO auction (user_id, auction_style, auction_category, auction_type, auction_description, starting_bid, increment_amount, bid_starting_time, bid_closing_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [
                user_id,
                auction_style,
                auction_category,
                auction_type,
                auction_description,
                starting_bid,
                increment_amount,
                bid_starting_time,
                bid_closing_time
            ]
        );
        console.log(result);
        res.redirect('/');
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'internal server error' });
    }
});



////////////////////////////////
app.get('/filter', async(req, res) => {
    try {
        const { id, auction_category, bid_starting_time, bid_closing_time } = req.body;
        let query = 'SELECT * FROM auction';
        const params = [];

        if (id) {
            query += ' WHERE id = $1';
            params.push(id);
        } else if (auction_category) {
            query += ' WHERE auction_category = $1';
            params.push(auction_category);
        } else if (bid_starting_time && bid_closing_time) {
            query += ' WHERE bid_starting_time >= $1 AND bid_closing_time <= $2';
            params.push(bid_starting_time, bid_closing_time);
        }

        const data = await pool.query(query, params);
        res.render('filter', { data: data.rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
///////////////////////////////////
app.put('/update/:id', async(req, res) => {

    try {
        const { id } = req.params;
        const {
            auction_style,
            auction_category,
            auction_type,
            auction_description,
            starting_bid,
            increment_amount,
            bid_starting_time,
            bid_closing_time
        } = req.body;
        const result = await pool.query('UPDATE auction SET auction_style = $1, auction_category = $2, auction_type = $3, auction_description = $4, starting_bid = $5, increment_amount = $6, bid_starting_time = $7, bid_closing_time = $8 WHERE id = $9 RETURNING *', [
            auction_style,
            auction_category,
            auction_type,
            auction_description,
            starting_bid,
            increment_amount,
            bid_starting_time,
            bid_closing_time,
            id
        ]);
        res.redirect('/');
    } catch (error) {
        console.log('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});