import pool from '../db/db.js';

// Create an escrow entry
export const createEscrowController = async (req, res) => {
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
export const releaseEscrowController = async (req, res) => {
    const { escrowId, sellerId } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const escrowResult = await client.query(
            `UPDATE escrow SET status = 'COMPLETED', updated_at = NOW() 
             WHERE id = $1 AND status = 'PENDING' RETURNING *`,
            [escrowId]
        );
        if (escrowResult.rows.length === 0) {
            throw new Error('Escrow not found or already completed');
        }
        const escrow = escrowResult.rows[0];

        // Update the seller's balance
        await client.query(
            `UPDATE balance SET current_balance = current_balance + $1, updated_at = NOW()
             WHERE user_id = $2`,
            [escrow.amount, sellerId]
        );
        await client.query('COMMIT');
        res.status(200).json(escrow);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

// Refund funds to the buyer
export const refundEscrowController = async (req, res) => {
    const { escrowId } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const escrowResult = await client.query(
            `UPDATE escrow SET status = 'REFUNDED', updated_at = NOW() 
             WHERE id = $1 AND status = 'PENDING' RETURNING *`,
            [escrowId]
        );
        if (escrowResult.rows.length === 0) {
            throw new Error('Escrow not found or already refunded');
        }
        const escrow = escrowResult.rows[0];

        // Update the buyer's balance
        await client.query(
            `UPDATE balance SET current_balance = current_balance + $1, updated_at = NOW()
             WHERE user_id = $2`,
            [escrow.amount, escrow.user_id]
        );
        await client.query('COMMIT');
        res.status(200).json(escrow);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};
