import { Router } from 'express';
import { SystemController } from '../controllers/systemController';
import { WebSocketManager } from '../utils/WebSocketManager';
import { protect } from '../middlewares/auth';

const router = Router();

// 创建SystemController实例
const wsManager = new WebSocketManager(global.server);
const systemController = new SystemController(wsManager);

// 启动系统监控
systemController.startMonitoring();

// 获取系统状态路由（需要认证）
router.get('/stats', protect, systemController.getSystemStats);

export default router;