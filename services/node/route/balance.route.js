import { Router } from 'express';
import { createBalance, getBalance, updateBalance } from '../controller/balance.controller.js';

const router = Router();

// Route for creating a balance entry
router.post('/create', createBalance);
router.put('/update', updateBalance);
router.get('/:user_id', getBalance);



export default router;
