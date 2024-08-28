import { Router } from 'express';
import {
    createEscrowController,
    releaseEscrowController,
    refundEscrowController
} from '../controller/escrow.controller.js';

const router = Router();

// Route to create an escrow entry
router.post('/create', createEscrowController);

// Route to release funds from escrow to the seller
router.post('/release', releaseEscrowController);

// Route to refund funds to the buyer
router.post('/refund', refundEscrowController);

export default router;
