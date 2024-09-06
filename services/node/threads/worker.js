import { parentPort, workerData } from 'worker_threads';
import pool from '../db/db.js';

const POLL_INTERVAL_MS = 2000; // Time between checks (e.g., 2 seconds)

async function startProxyBid(user_id, auction_id, amount, increasing_amount) {
    const client = await pool.connect();

    try {
        while (true) {
            // Begin a new transaction
            await client.query('BEGIN');

            // Lock the auction row to prevent concurrent updates during bidding
            const auctionResult = await client.query('SELECT * FROM "auction" WHERE id = $1 FOR UPDATE', [auction_id]);

            if (auctionResult.rows.length === 0) {
                await client.query('ROLLBACK');
                parentPort.postMessage({ error: 'Auction not found' });
                break;
            }

            const selectedAuction = auctionResult.rows[0];

            if (selectedAuction.status !== 'running') {
                await client.query('ROLLBACK');
                parentPort.postMessage({ message: 'Auction ended' });
                break;
            }

            if (selectedAuction.bid_winner_id === user_id) {
                await client.query('ROLLBACK');
                parentPort.postMessage({ message: 'You are already the highest bidder' });
                // Continue to next iteration without making changes
                await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
                continue;
            }

            const currentBid = parseFloat(selectedAuction.current_max_bid);
            let newBidAmount;

            if (selectedAuction.auction_style === 'increasing') {
                newBidAmount = currentBid + increasing_amount;

                if (newBidAmount > amount) {
                    await client.query('ROLLBACK');
                    parentPort.postMessage({ error: 'Your proxy bid amount is less than the required bid to win' });
                    break;
                }
            } else if (selectedAuction.auction_style === 'decreasing') {
                newBidAmount = currentBid - increasing_amount;

                if (newBidAmount < amount) {
                    await client.query('ROLLBACK');
                    parentPort.postMessage({ error: 'Your proxy bid amount is greater than the required bid to win' });
                    break;
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
            parentPort.postMessage({ message: 'Proxy bid placed successfully', bidAmount: newBidAmount });

            // Wait for a while before checking again
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

            // Re-fetch the auction details to check the status for the next iteration
            const updatedAuctionResult = await client.query('SELECT * FROM "auction" WHERE id = $1 FOR UPDATE', [auction_id]);
            if (updatedAuctionResult.rows.length === 0 || updatedAuctionResult.rows[0].status !== 'running') {
                break;
            }
        }
    } catch (error) {
        console.error('Error in worker:', error);
        await client.query('ROLLBACK');
        parentPort.postMessage({ error: 'Error placing proxy bid' });
    } finally {
        client.release();
    }
}

// Start the bidding process with data passed from the main thread
startProxyBid(workerData.user_id, workerData.auction_id, workerData.amount, workerData.increasing_amount);
