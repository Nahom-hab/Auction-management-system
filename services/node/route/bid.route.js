
import { Router } from 'express'
import { placeBid, startProxyBid } from '../controller/bidding.controller.js'

const router = Router()

router.post('/', placeBid)
router.post('/proxybid/:id', startProxyBid)


export default router
