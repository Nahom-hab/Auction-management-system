import { Router } from 'express';
import { createBalance, getBalance, updateBalance } from '../controller/balance.controller.js';

const router = Router();

// Route for creating a balance entry
router.post('/', createBalance);
router.put('/', updateBalance);
router.get('/:user_id', getBalance);



export default router;
