import { parentPort, workerData } from 'worker_threads';
import pool from '../db/db.js';

const POLL_INTERVAL_MS = 1000; // Time between checks (1 seconds)

// Function to handle proxy bidding
async function startProxyBid(user_id, auction_id, amount, increasing_amount) {
    const client = await pool.connect();

    try {
        while (true) {
            // Begin a new transaction
            await client.query('BEGIN');

            // Lock the auction row to prevent concurrent updates during bidding
            const auctionResult = await client.query('SELECT * FROM "auction" WHERE id = $1 FOR UPDATE', [auction_id]);

            if (auctionResult.rows.length === 0) {
                // Auction not found, rollback and send error message
                await client.query('ROLLBACK');
                parentPort.postMessage({ error: 'Auction not found' });
                break;
            }

            const selectedAuction = auctionResult.rows[0];

            // Check if the auction has ended
            if (selectedAuction.status !== 'running') {
                await client.query('ROLLBACK');
                parentPort.postMessage({ message: 'Auction ended' });
                break;
            }

            // Check if the user is already the highest bidder
            if (selectedAuction.bid_winner_id === user_id) {
                await client.query('ROLLBACK');
                parentPort.postMessage({ message: 'You are already the highest bidder' });
                // Continue to next iteration after a delay
                await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
                continue;
            }

            // Check user's balance
            const balanceResult = await client.query('SELECT current_balance FROM "balance" WHERE user_id = $1 FOR UPDATE', [user_id]);

            if (balanceResult.rows.length === 0) {
                // User balance not found, rollback and send error message
                await client.query('ROLLBACK');
                parentPort.postMessage({ error: 'User balance not found' });
                break;
            }

            const currentBalance = parseFloat(balanceResult.rows[0].current_balance);

            // Check if the user has already placed a bid in this auction
            const previousBidResult = await client.query(
                'SELECT * FROM "bid" WHERE user_id = $1 AND auction_id = $2',
                [user_id, auction_id]
            );

            let newBidAmount;
            // Calculate new bid amount based on auction style
            if (selectedAuction.auction_style === 'increasing') {
                newBidAmount = parseFloat(selectedAuction.current_max_bid) + increasing_amount;

                if (newBidAmount > amount) {
                    await client.query('ROLLBACK');
                    parentPort.postMessage({ error: 'Your proxy bid amount is less than the required bid to win' });
                    break;
                }
            } else if (selectedAuction.auction_style === 'decreasing') {
                newBidAmount = parseFloat(selectedAuction.current_max_bid) - increasing_amount;

                if (newBidAmount < amount) {
                    await client.query('ROLLBACK');
                    parentPort.postMessage({ error: 'Your proxy bid amount is greater than the required bid to win' });
                    break;
                }
            }

            const isFirstBid = previousBidResult.rows.length === 0;

            // Handle balance and initial bid for the first bid
            if (isFirstBid) {
                let requiredBalance = selectedAuction.starting_bid * 0.1; // 10% of the starting bid

                // Ensure the user has enough balance
                if (currentBalance < requiredBalance) {
                    await client.query('ROLLBACK');
                    parentPort.postMessage({ error: 'Insufficient balance to place proxy bid' });
                    break;
                }

                // Deduct the user's balance
                const newBalance = currentBalance - requiredBalance;
                await client.query(
                    `UPDATE "balance" 
                     SET current_balance = $1, updated_at = NOW()
                     WHERE user_id = $2`,
                    [newBalance, user_id]
                );
            }

            // Insert the new bid into the database
            await client.query(
                `INSERT INTO "bid" (user_id, auction_id, amount) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [user_id, auction_id, newBidAmount]
            );
            await client.query(
                `INSERT INTO "proxy_bidding" (user_id, auction_id, amount,increasing_amount) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [user_id, auction_id, amount, increasing_amount]
            );

            // Update the auction with the new highest bid
            await client.query(
                `UPDATE "auction" 
                 SET "current_max_bid" = $1, "bid_winner_id" = $2
                 WHERE "id" = $3`,
                [newBidAmount, user_id, auction_id]
            );

            await client.query('COMMIT');
            parentPort.postMessage({ message: 'Proxy bid placed successfully', bidAmount: newBidAmount });

            // Wait for a while before checking the auction status again
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
        client.release(); // Release the database client
    }
}

// Start the bidding process with data passed from the main thread
startProxyBid(workerData.user_id, workerData.auction_id, workerData.amount, workerData.increasing_amount);
