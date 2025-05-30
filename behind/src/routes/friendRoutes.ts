import { Router } from 'express';
import { sendFriendRequest, getFriendList, removeFriend } from '../controllers/friendController';
import { protect } from '../middlewares/auth';

const router = Router();

router.post('/add', protect, sendFriendRequest);
router.get('/list', protect, getFriendList);
router.delete('/:friendId', protect, removeFriend);

export default router;