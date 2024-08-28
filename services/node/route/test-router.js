import { Router } from 'express'

const router = Router()


// Create a new user
router.post('/users', async (req, res) => {
    const {
        firstName,
        lastName,
        countryCode,
        phoneNumber,
        profileImgUrl,
        status,
        password,
        email,
        verified
    } = req.body;

    try {
        const newUser = await pool.query(
            `INSERT INTO "user" (first_name, last_name, country_code, phone_number, profile_img_url, status, password, email, verified, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *`,
            [firstName, lastName, countryCode, phoneNumber, profileImgUrl, status, password, email, verified]
        );
        res.status(201).json(newUser.rows[0]);  // This line is correct

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Read all users
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM "user"');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/auctions', async (req, res) => {
    const {
        user_id,
        auction_style,
        auction_category,
        auction_type,
        auction_description,
        starting_bid,
        increment_amount,
        bid_starting_time,
        current_max_bid,
        bid_closing_time,
        bid_winner_id,
        status,
        created_at,
        updated_at
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO "auction" (
                "user_id", "auction_style", "auction_category", "auction_type", 
                "auction_description", "starting_bid", "increment_amount", 
                "bid_starting_time", "current_max_bid", "bid_closing_time", 
                "bid_winner_id", "status", "created_at", "updated_at"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                user_id,
                auction_style,
                auction_category,
                auction_type,
                auction_description,
                starting_bid,
                increment_amount,
                bid_starting_time,
                current_max_bid,
                bid_closing_time,
                bid_winner_id,
                status,
                created_at,
                updated_at
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
router.get('/auctions/:id', async (req, res) => {
    const auctionId = parseInt(req.params.id, 10);

    if (isNaN(auctionId)) {
        return res.status(400).send('Invalid Auction ID');
    }

    try {
        const result = await pool.query('SELECT * FROM "auction" WHERE id = $1', [auctionId]);
        if (result.rows.length === 0) {
            return res.status(404).send('Auction Not Found');
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
router.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'internal server error';
    res.status(statusCode).json({
        success: false,
        statusCode,
        message
    })
})

export default router