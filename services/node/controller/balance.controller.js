import { errorHandeler } from "../utils/errorHandler.js";
import pool from '../db/db.js';

// Create balance record for a user
export const createBalance = async (req, res, next) => {
    const { user_id, current_balance } = req.body;
    const client = await pool.connect();
    try {
        // Start transaction
        await client.query('BEGIN');

        // Check if user exists
        const userResult = await client.query('SELECT id FROM "user" WHERE id = $1', [user_id]);
        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return next(errorHandeler(404, 'User not found'));
        }

        // Insert the new balance
        const result = await client.query(
            `INSERT INTO "balance" (user_id, current_balance, updated_at) 
             VALUES ($1, $2, NOW()) RETURNING *`,
            [user_id, current_balance || 0]
        );

        // Commit transaction
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating balance:', error);
        await client.query('ROLLBACK');
        return next(errorHandeler(500, 'Internal server error creating balance'));
    } finally {
        client.release();
    }
};

// Update balance record for a user
export const updateBalance = async (req, res, next) => {
    const { user_id, amount } = req.body;
    const client = await pool.connect();

    try {
        // Start transaction
        await client.query('BEGIN');

        // Lock the balance row to prevent concurrent updates
        const balanceResult = await client.query('SELECT * FROM "balance" WHERE user_id = $1 FOR UPDATE', [user_id]);
        if (balanceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return next(errorHandeler(404, 'Balance record not found'));
        }

        const newBalance = balanceResult.rows[0].current_balance + amount;

        // Update the balance
        const result = await client.query(
            `UPDATE "balance" 
             SET current_balance = $1, updated_at = NOW() 
             WHERE user_id = $2 RETURNING *`,
            [newBalance, user_id]
        );

        // Commit transaction
        await client.query('COMMIT');
        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error('Error updating balance:', error);
        await client.query('ROLLBACK');
        return next(errorHandeler(500, 'Internal server error updating balance'));
    } finally {
        client.release();
    }
};

// Get balance record for a user
export const getBalance = async (req, res, next) => {
    const { user_id } = req.params;
    const client = await pool.connect();

    try {
        // Fetch the balance for the specified user
        const result = await client.query('SELECT * FROM "balance" WHERE user_id = $1', [user_id]);

        if (result.rows.length === 0) {
            return next(errorHandeler(404, 'Balance record not found'));
        }

        // Send the balance record as the response
        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error('Error retrieving balance:', error);
        return next(errorHandeler(500, 'Internal server error retrieving balance'));
    } finally {
        client.release();
    }
};
