// processBid.js
import pool from '../db/db.js'; // Ensure the path to your db file is correct
import biddingQueue from './queue.js';

const processBid = async (job) => {
    const { user_id, auction_id, amount, increasing_amount, auction_style } = job.data;
    const client = await pool.connect();

    try {
        console.log(`Processing bid for auction ID ${auction_id} by user ID ${user_id}`);
        await client.query('BEGIN');

        const result = await client.query('SELECT * FROM "auction" WHERE id = $1 FOR UPDATE', [auction_id]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            throw new Error('Auction not found');
        }

        const auction = result.rows[0];
        console.log(`Auction details:`, auction);

        if (auction.status !== 'running') {
            await client.query('ROLLBACK');
            throw new Error('Auction is not running');
        }

        if (auction.bid_winner_id === user_id) {
            await client.query('ROLLBACK');
            throw new Error('You are already the highest bidder');
        }

        let newBidAmount;
        if (auction_style === 'increasing') {
            newBidAmount = auction.current_max_bid + increasing_amount;
            if (newBidAmount > amount) {
                await client.query('ROLLBACK');
                throw new Error('Your proxy bid amount is less than the required bid to win');
            }
        } else if (auction_style === 'decreasing') {
            newBidAmount = auction.current_max_bid - increasing_amount;
            if (newBidAmount < amount) {
                await client.query('ROLLBACK');
                throw new Error('Your proxy bid amount is greater than the required bid to win');
            }
        }

        await client.query(
            `INSERT INTO "bid" (user_id, auction_id, amount) 
             VALUES ($1, $2, $3) RETURNING *`,
            [user_id, auction_id, newBidAmount]
        );

        await client.query(
            `UPDATE "auction" 
             SET "current_max_bid" = $1, "bid_winner_id" = $2
             WHERE "id" = $3`,
            [newBidAmount, user_id, auction_id]
        );

        await client.query('COMMIT');
        console.log(`Bid processed successfully: ${newBidAmount}`);
    } catch (error) {
        console.error('Error processing bid:', error);
        await client.query('ROLLBACK');
    } finally {
        client.release();
    }
};

biddingQueue.process(processBid);
