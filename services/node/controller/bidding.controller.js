import { errorHandeler } from "../utils/errorHandler.js";
import pool from '../db/db.js';
import { Worker } from 'worker_threads'

export const placeBid = async (req, res, next) => {
    const { user_id, auction_id, amount } = req.body;
    const client = await pool.connect();

    try {
        let retries = 3;

        while (retries > 0) {
            try {
                await client.query('BEGIN');

                // Lock auction row to prevent concurrent updates
                const result = await client.query('SELECT * FROM "auction" WHERE id = $1 FOR UPDATE', [auction_id]);

                if (result.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return next(errorHandeler(404, 'Auction not found'));
                }

                const selectedAuction = result.rows[0];

                // Validate bid based on auction style and status
                const isValidBid = (
                    (selectedAuction.auction_style === 'increasing' &&
                        amount > selectedAuction.current_max_bid &&
                        (amount - selectedAuction.current_max_bid) >= selectedAuction.increment_amount)
                    ||
                    (selectedAuction.auction_style === 'decreasing' &&
                        amount < selectedAuction.current_max_bid &&
                        (selectedAuction.current_max_bid - amount) >= selectedAuction.increment_amount)
                ) && selectedAuction.status === 'running';

                if (parseInt(selectedAuction.user_id) === parseInt(user_id)) {
                    await client.query('ROLLBACK');
                    return next(errorHandeler(400, 'Cannot place a bid on your own auction'));
                }

                if (!isValidBid) {
                    await client.query('ROLLBACK');
                    return next(errorHandeler(400, 'Invalid bid amount or auction is not running'));
                }

                // Check user's balance
                const balanceResult = await client.query('SELECT current_balance FROM "balance" WHERE user_id = $1 FOR UPDATE', [user_id]);

                if (balanceResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return next(errorHandeler(404, 'User balance not found'));
                }

                const currentBalance = parseFloat(balanceResult.rows[0].current_balance);

                // Check if the user has already placed a bid in this auction
                const previousBidResult = await client.query(
                    'SELECT * FROM "bid" WHERE user_id = $1 AND auction_id = $2',
                    [user_id, auction_id]
                );

                const isFirstBid = previousBidResult.rows.length === 0;

                // If it's the first bid do all these taking money from balance and adding it to escrow account 
                if (isFirstBid) {
                    const requiredBalance = selectedAuction.starting_bid * (.1);


                    // Ensure the user has sufficient balance
                    if (currentBalance < requiredBalance) {
                        await client.query('ROLLBACK');
                        return next(errorHandeler(400, 'Insufficient balance to place the bid'));
                    }

                    // Deduct the balance (including $300 if it's the first bid)
                    const newBalance = currentBalance - requiredBalance;
                    await client.query(
                        `UPDATE "balance" 
                     SET current_balance = $1, updated_at = NOW()
                     WHERE user_id = $2`,
                        [newBalance, user_id]
                    );
                    //handel the amount decresed from balance is placed on the escrow amount 
                    await client.query(
                        `INSERT INTO escrow (auction_id, user_id, amount, status, updated_at)
                         VALUES ($1, $2, $3, 'PENDING', NOW()) RETURNING *`,
                        [auction_id, user_id, requiredBalance]
                    );
                    //handel the amount decresed from balance is placed on the escrow amount 
                    await client.query(
                        `INSERT INTO escrow (auction_id, user_id, amount, status, updated_at)
                         VALUES ($1, $2, $3, 'PENDING', NOW()) RETURNING *`,
                        [auction_id, user_id, requiredBalance]
                    );
                }

                // Insert new bid
                const newBid = await client.query(
                    `INSERT INTO "bid" (user_id, auction_id, amount) 
                     VALUES ($1, $2, $3) RETURNING *`,
                    [user_id, auction_id, amount]
                );

                // Update auction with the new highest bid
                await client.query(
                    `UPDATE "auction" 
                     SET "current_max_bid" = $1, "bid_winner_id" = $2
                     WHERE "id" = $3`,
                    [amount, user_id, auction_id]
                );

                await client.query('COMMIT');
                res.status(201).json(newBid.rows[0]);
                break;
            } catch (error) {
                // Errorcode 40001 means deadlock in Postgres
                if (retries === 0 || !error.code || error.code !== '40001') {
                    await client.query('ROLLBACK');
                    throw error;
                }
                retries -= 1;
            }
        }
    } catch (error) {
        console.error('Error placing bid:', error);
        return next(errorHandeler(500, 'Internal server error placing bid'));
    } finally {
        client.release();
    }
};


export const startProxyBid = (req, res, next) => {
    const user_id = req.params.id;
    const { auction_id, amount, increasing_amount } = req.body;

    // Track whether the response has been sent
    let responseSent = false;

    // Start a new worker thread for the bidding process
    const worker = new Worker('./threads/Proxyworker.js', {
        workerData: { user_id, auction_id, amount, increasing_amount }
    });

    // Listen for messages from the worker
    worker.on('message', (message) => {
        if (responseSent) return; // Prevent multiple responses

        if (message.error) {
            responseSent = true;
            return next(errorHandeler(400, message.error));
        } else {
            responseSent = true;
            res.status(201).json(message);
        }
    });

    // Listen for worker errors
    worker.on('error', (error) => {
        if (responseSent) return; // Prevent multiple responses

        console.error('Worker error:', error);
        responseSent = true;
        return next(errorHandeler(500, 'Internal server error in worker'));
    });

    // Handle worker exit
    worker.on('exit', (code) => {
        if (code !== 0) {
            console.error(`Worker stopped with exit code ${code}`);
        }
    });
};
