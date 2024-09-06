import { Router } from 'express';
import {
    createEscrow,
    releaseWinnersEscrowToSeller,
    refundEscrowToBuyers
} from '../controller/escrow.controller.js';

const router = Router();

// Route to create an escrow entry
router.post('/create', createEscrow);

// Route to release funds from escrow to the seller
router.post('/release', releaseWinnersEscrowToSeller);

// Route to refund funds to the buyer
router.post('/refund', refundEscrowToBuyers);

export default router;
