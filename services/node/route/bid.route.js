
import { Router } from 'express'
import { placeBid, startProxyBid, IsProxyBidOn } from '../controller/bidding.controller.js'

const router = Router()

router.post('/', placeBid)
router.get('/proxyOn', IsProxyBidOn)
router.post('/proxybid/:id', startProxyBid)



export default router
