import { errorHandeler } from "../utils/errorHandler.js";
import pool from '../db/db.js';

export const placebid = async (req, res, next) => {
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
                // errorcode 4001 id dead lock happend in postgress 
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
// Initial Proxy Bid: The startProxyBid function places an initial bid 
// for the user based on the auction style (increasing or decreasing) and 
// the proxy amount they have set.

// Continuous Bidding: The function uses setImmediate to continuously check
//  if the user has been outbid. If so, it places another bid automatically until
//   the user either wins or their maximum proxy amount is reached.


export const startProxyBid = async (req, res, next) => {
    // Extract user ID from request parameters and auction details from request body
    const user_id = req.params.id;
    const { auction_id, amount, increasing_amount } = req.body;
    // Acquire a connection from the PostgreSQL connection pool
    const client = await pool.connect();

    try {
        // Set the number of retry attempts for handling potential deadlocks
        let retries = 3;

        while (retries > 0) {
            try {
                // Begin a new transaction
                await client.query('BEGIN');

                // Lock the auction row to prevent concurrent updates during bidding
                const auctionResult = await client.query('SELECT * FROM "auction" WHERE id = $1 FOR UPDATE', [auction_id]);

                // If the auction does not exist, rollback the transaction and return an error
                if (auctionResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return next(errorHandeler(404, 'Auction not found'));
                }

                const selectedAuction = auctionResult.rows[0];

                // Check if the auction is not running; if so, rollback the transaction and return an error
                if (selectedAuction.status !== 'running') {
                    await client.query('ROLLBACK');
                    return next(errorHandeler(400, 'Auction is not running'));
                }

                // If the user is already the highest bidder, rollback the transaction and return an error
                if (selectedAuction.bid_winner_id === user_id) {
                    await client.query('ROLLBACK');
                    return next(errorHandeler(400, 'You are already the highest bidder'));
                }

                // Get the current highest bid amount
                const currentBid = selectedAuction.current_max_bid;
                let newBidAmount;
                console.log(increasing_amount);


                // Handle the bid logic based on the auction style (increasing or decreasing)
                if (selectedAuction.auction_style === 'increasing') {
                    // Calculate the new bid amount by increasing the current bid
                    const currentBid = parseFloat(selectedAuction.current_max_bid);
                    const increasing_amount = parseFloat(req.body.increasing_amount);
                    const newBidAmount = currentBid + increasing_amount;
                    console.log(newBidAmount);
                    console.log(newBidAmount > amount);


                    // If the new bid amount exceeds the user's max proxy amount, rollback and return an error
                    if (newBidAmount > amount) {
                        await client.query('ROLLBACK');
                        return next(errorHandeler(400, 'Your proxy bid amount is less than the required bid to win'));
                    }

                    // Insert the new bid into the "bid" table
                    await client.query(
                        `INSERT INTO "bid" (user_id, auction_id, amount) 
                         VALUES ($1, $2, $3) RETURNING *`,
                        [user_id, auction_id, newBidAmount]
                    );

                    // Update the auction with the new highest bid and the current user as the bid winner
                    await client.query(
                        `UPDATE "auction" 
                         SET "current_max_bid" = $1, "bid_winner_id" = $2
                         WHERE "id" = $3`,
                        [newBidAmount, user_id, auction_id]
                    );

                } else if (selectedAuction.auction_style === 'decreasing') {
                    // Calculate the new bid amount by decreasing the current bid
                    newBidAmount = currentBid - increasing_amount;

                    // If the new bid amount is lower than the user's max proxy amount, rollback and return an error
                    if (newBidAmount < amount) {
                        await client.query('ROLLBACK');
                        return next(errorHandeler(400, 'Your proxy bid amount is greater than the required bid to win'));
                    }

                    // Insert the new bid into the "bid" table
                    await client.query(
                        `INSERT INTO "bid" (user_id, auction_id, amount) 
                         VALUES ($1, $2, $3) RETURNING *`,
                        [user_id, auction_id, newBidAmount]
                    );

                    // Update the auction with the new highest bid and the current user as the bid winner
                    await client.query(
                        `UPDATE "auction" 
                         SET "current_max_bid" = $1, "bid_winner_id" = $2
                         WHERE "id" = $3`,
                        [newBidAmount, user_id, auction_id]
                    );
                }

                // Commit the transaction
                await client.query('COMMIT');
                res.status(201).json({ message: 'Proxy bid placed successfully' });

                // Start an asynchronous task to continuously place proxy bids until the user wins or their max proxy amount is exceeded
                setImmediate(async () => {
                    while (true) {
                        await client.query('BEGIN');

                        // Lock the auction row again to check for changes in the current bid
                        const currentAuction = await client.query('SELECT * FROM "auction" WHERE id = $1 FOR UPDATE', [auction_id]);
                        const auction = currentAuction.rows[0];

                        // Check if the user has been outbid and the auction is still running
                        if (auction.bid_winner_id !== user_id && auction.status === 'running') {
                            if (auction.auction_style === 'increasing') {
                                // Calculate the new bid amount by increasing the current bid
                                newBidAmount = auction.current_max_bid + increasing_amount;

                                // If the new bid amount is within the user's max proxy amount, place another bid
                                if (newBidAmount <= amount) {
                                    await client.query(
                                        `INSERT INTO "bid" (user_id, auction_id, amount) 
                                         VALUES ($1, $2, $3) RETURNING *`,
                                        [user_id, auction_id, newBidAmount]
                                    );

                                    // Update the auction with the new highest bid and the current user as the bid winner
                                    await client.query(
                                        `UPDATE "auction" 
                                         SET "current_max_bid" = $1, "bid_winner_id" = $2
                                         WHERE "id" = $3`,
                                        [newBidAmount, user_id, auction_id]
                                    );
                                } else {
                                    // If the new bid amount exceeds the user's max proxy amount, stop bidding
                                    await client.query('ROLLBACK');
                                    break;
                                }
                            } else if (auction.auction_style === 'decreasing') {
                                // Calculate the new bid amount by decreasing the current bid
                                newBidAmount = auction.current_max_bid - increasing_amount;

                                // If the new bid amount is within the user's max proxy amount, place another bid
                                if (newBidAmount >= amount) {
                                    await client.query(
                                        `INSERT INTO "bid" (user_id, auction_id, amount) 
                                         VALUES ($1, $2, $3) RETURNING *`,
                                        [user_id, auction_id, newBidAmount]
                                    );

                                    // Update the auction with the new highest bid and the current user as the bid winner
                                    await client.query(
                                        `UPDATE "auction" 
                                         SET "current_max_bid" = $1, "bid_winner_id" = $2
                                         WHERE "id" = $3`,
                                        [newBidAmount, user_id, auction_id]
                                    );
                                } else {
                                    // If the new bid amount is lower than the user's max proxy amount, stop bidding
                                    await client.query('ROLLBACK');
                                    break;
                                }
                            }
                        } else {
                            // If the user is already the highest bidder or the auction has ended, stop bidding
                            await client.query('ROLLBACK');
                            break;
                        }

                        // Commit the transaction
                        await client.query('COMMIT');
                    }
                });

                // Exit the retry loop since the transaction was successful
                break;

            } catch (error) {
                // If a deadlock error occurs, retry the transaction up to the specified number of retries
                if (retries === 0 || !error.code || error.code !== '40001') {
                    await client.query('ROLLBACK');
                    throw error;
                }
                retries -= 1;
            }
        }
    } catch (error) {
        // Handle any errors that occurred during the transaction
        console.error('Error placing proxy bid:', error);
        return next(errorHandeler(500, 'Internal server error placing proxy bid'));
    } finally {
        // Release the database connection back to the pool
        client.release();
    }
};

// import biddingQueue from '../utils/queue.js';
// // bidController.js

// export const startProxyBid = async (req, res, next) => {
//     const user_id = req.params.id;
//     const { auction_id, amount, increasing_amount, auction_style } = req.body;

//     try {
//         await biddingQueue.add({
//             user_id,
//             auction_id,
//             amount,
//             increasing_amount,
//             auction_style,
//         });

//         res.status(201).json({ message: 'Proxy bid job added successfully' });
//     } catch (error) {
//         console.error('Error adding proxy bid job:', error);
//         return next(errorHandeler(500, 'Internal server error adding proxy bid job'));
//     }
// };
