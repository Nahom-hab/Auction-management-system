
import { Router } from 'express'
import { placebid, startProxyBid } from '../controller/bidding.controller.js'

const router = Router()

router.post('/', placebid)
router.post('/proxybid/:id', startProxyBid)


export default router
