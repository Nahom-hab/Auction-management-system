import pool from '../db/db.js';

// Create an escrow entry
export const createEscrow = async (req, res) => {
    const { auctionId, buyerId, amount } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `INSERT INTO escrow (auction_id, user_id, amount, status, updated_at)
             VALUES ($1, $2, $3, 'PENDING', NOW()) RETURNING *`,
            [auctionId, buyerId, amount]
        );
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

// Release funds from escrow to the seller
export const releaseWinnersEscrowToSeller = async (req, res, next) => {
    const { auction_id } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Lock auction row to prevent concurrent updates
        const auctionResult = await client.query('SELECT * FROM "auction" WHERE id = $1 FOR UPDATE', [auction_id]);

        if (auctionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return next(errorHandeler(404, 'Auction not found'));
        }

        const selectedAuction = auctionResult.rows[0];
        const now = new Date();
        const isClosingTimeReached = selectedAuction.bid_closing_time <= now;

        if (isClosingTimeReached) {
            // Lock escrow row to prevent concurrent updates
            const escrowResult = await client.query(
                'SELECT * FROM "escrow" WHERE auction_id = $1 AND user_id = $2 FOR UPDATE',
                [auction_id, selectedAuction.bid_winner_id]
            );

            if (escrowResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return next(errorHandeler(404, 'Escrow not found'));
            }

            const selectedEscrow = escrowResult.rows[0];

            // Check if the seller balance exists
            const sellerBalanceResult = await client.query('SELECT * FROM "balance" WHERE user_id = $1 FOR UPDATE', [selectedAuction.user_id]);
            if (sellerBalanceResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return next(errorHandeler(404, 'Seller balance not found'));
            }

            const selectedBalance = sellerBalanceResult.rows[0];
            const newBalance = parseFloat(selectedBalance.current_balance) + parseFloat(selectedEscrow.amount);

            // Update the seller's balance
            await client.query(
                `UPDATE "balance" 
                 SET current_balance = $1, updated_at = NOW() 
                 WHERE user_id = $2 RETURNING *`,
                [newBalance, selectedAuction.user_id]
            );

            // Delete the escrow record
            await client.query(
                'DELETE FROM "escrow" WHERE auction_id = $1 AND user_id = $2 RETURNING *',
                [auction_id, selectedAuction.bid_winner_id]
            );

            await client.query('COMMIT');
            res.status(200).json({ message: 'Escrow released and seller balance updated successfully' });
        } else {
            await client.query('ROLLBACK');
            res.status(400).json({ error: 'Auction is not yet closed' });
        }

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};


// Refund funds to the all the buyers that didn't win the auction
// Refund funds to all buyers who didn't win the auction
export const refundEscrowToBuyers = async (req, res) => {
    const { auction_id } = req.body;

    if (!auction_id) {
        return res.status(400).json({ error: 'Auction ID is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock auction row to prevent concurrent updates
        const auctionResult = await client.query('SELECT * FROM "auction" WHERE id = $1 FOR UPDATE', [auction_id]);

        if (auctionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Auction not found' });
        }

        const selectedAuction = auctionResult.rows[0];
        const now = new Date();
        const isClosingTimeReached = selectedAuction.bid_closing_time <= now;

        if (isClosingTimeReached) {
            const escrowResult = await client.query('SELECT * FROM "escrow" WHERE auction_id = $1 FOR UPDATE', [auction_id]);

            if (escrowResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'No escrow found for this auction' });
            }

            const UserEscrowAccounts = escrowResult.rows;

            for (let userEscrow of UserEscrowAccounts) {
                if (userEscrow.user_id !== selectedAuction.bid_winner_id) {
                    const balanceResult = await client.query('SELECT * FROM "balance" WHERE user_id = $1 FOR UPDATE', [userEscrow.user_id]);

                    if (balanceResult.rows.length === 0) {
                        await client.query('ROLLBACK');
                        return res.status(404).json({ error: 'Seller balance not found' });
                    }

                    const selectedBalance = balanceResult.rows[0];
                    const newBalance = parseFloat(selectedBalance.current_balance) + parseFloat(userEscrow.amount);

                    await client.query(
                        `UPDATE "balance" 
                        SET current_balance = $1, updated_at = NOW() 
                        WHERE user_id = $2 RETURNING *`,
                        [newBalance, userEscrow.user_id]
                    );

                    // Delete the escrow record
                    await client.query(
                        'DELETE FROM "escrow" WHERE auction_id = $1 AND user_id = $2 RETURNING *',
                        [auction_id, userEscrow.user_id]
                    );
                }
            }

            await client.query('COMMIT');
            res.status(200).json({ message: 'Escrow refunded successfully to all buyers who did not win the auction' });
        } else {
            await client.query('ROLLBACK');
            res.status(400).json({ error: 'Auction closing time has not been reached' });
        }
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};
