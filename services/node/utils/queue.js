import Queue from 'bull';

const biddingQueue = new Queue('bidding', 'redis://127.0.0.1:6379');

export default biddingQueue;
