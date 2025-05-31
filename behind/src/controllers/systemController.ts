import { Request, Response } from 'express';
import os from 'os';
import { WebSocketManager } from '../utils/WebSocketManager';
import logger from '../utils/logger';

export class SystemController {
  private startTime: number;
  private wsManager: WebSocketManager;

  constructor(wsManager: WebSocketManager) {
    this.startTime = Date.now();
    this.wsManager = wsManager;
  }

  getSystemStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = {
        connectedUsers: this.getConnectedUsers(),
        uptime: this.getUptime(),
        memoryUsage: this.getMemoryUsage(),
        cpuLoad: await this.getCPULoad(),
      };

      res.json(stats);
    } catch (error) {
      logger.error('获取系统状态失败:', error);
      res.status(500).json({ message: '获取系统状态失败' });
    }
  };

  private getConnectedUsers(): number {
    const io = this.wsManager.getIO();
    return io ? Object.keys(io.sockets.sockets).length : 0;
  }

  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  private getMemoryUsage(): number {
    const used = process.memoryUsage().heapUsed;
    const total = os.totalmem();
    return Math.round((used / total) * 100);
  }

  private async getCPULoad(): Promise<number> {
    const startUsage = process.cpuUsage();
    
    // 等待100ms来计算CPU使用率
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endUsage = process.cpuUsage(startUsage);
    const userCPUUsage = (endUsage.user / 1000000); // 转换为秒
    const sysCPUUsage = (endUsage.system / 1000000);
    
    return Math.round(((userCPUUsage + sysCPUUsage) / os.cpus().length) * 100);
  }

  // 定期记录系统状态
  startMonitoring(interval: number = 300000): void {  // 默认每5分钟
    setInterval(async () => {
      try {
        const stats = {
          connectedUsers: this.getConnectedUsers(),
          memoryUsage: this.getMemoryUsage(),
          cpuLoad: await this.getCPULoad(),
        };

        logger.info('系统状态:', stats);

        // 如果系统负载过高，发出警告
        if (stats.memoryUsage > 80 || stats.cpuLoad > 80) {
          logger.warn('系统负载过高:', stats);
        }
      } catch (error) {
        logger.error('监控系统状态失败:', error);
      }
    }, interval);
  }
}