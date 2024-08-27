const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const ejs = require('ejs');
const path = require('path');


const app = express();
const port = 3000;

// Connect to PostgreSQL
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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Middleware
app.use(express.json());
app.use(express.json());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use('/static', express.static('static'));
app.use(express.urlencoded({ extended: true }));


// Item routes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });



app.get('/', async(req, res) => {
    res.render('additem');
});



app.post('/api/items', upload.single('preview_image'), async(req, res) => {
    try {
        const { auction_id, item_name, images_url } = req.body;
        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO item (auction_id, item_name, preview_image, images_url) VALUES ($1, $2, $3, $4) RETURNING *', [auction_id, item_name, req.file ? req.file.filename : null, images_url]
        );
        client.release();
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/items', async(req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM item');
        client.release();
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/items/:id', async(req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM item WHERE id = $1', [req.params.id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/items/:id', upload.single('preview_image'), async(req, res) => {
    try {
        const { auction_id, item_name, images_url } = req.body;
        const client = await pool.connect();
        const result = await client.query(
            'UPDATE item SET auction_id = $1, item_name = $2, preview_image = $3, images_url = $4 WHERE id = $5 RETURNING *', [auction_id, item_name, req.file ? req.file.filename : null, images_url, req.params.id]
        );
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/items/:id', async(req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('DELETE FROM item WHERE id = $1 RETURNING *', [req.params.id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.use('/uploads', express.static('public/uploads'));