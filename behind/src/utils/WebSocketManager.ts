import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import logger from './logger';

export class WebSocketManager {
  private io: SocketServer;
  private heartbeatInterval: number = 30000;
  private reconnectAttempts: number = 5;

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 10000,
      pingInterval: 5000
    });

    this.setupErrorHandling();
    this.setupConnectionMonitoring();
  }

  private setupErrorHandling() {
    this.io.on('error', (error) => {
      logger.error(`WebSocket错误: ${error.message}`);
    });

    this.io.on('connect_error', (error) => {
      logger.error(`WebSocket连接错误: ${error.message}`);
    });
  }

  private setupConnectionMonitoring() {
    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      logger.info(`客户端连接成功: ${clientId}`);

      // 心跳检测
      const heartbeat = setInterval(() => {
        socket.emit('ping');
      }, this.heartbeatInterval);

      socket.on('pong', () => {
        logger.debug(`收到客户端心跳响应: ${clientId}`);
      });

      socket.on('disconnect', (reason) => {
        clearInterval(heartbeat);
        logger.info(`客户端断开连接: ${clientId}, 原因: ${reason}`);
      })     socket.on('error', (error) => {
        logger.error(`客户端错误: ${clientId}, 错误: ${error.message}`);
      });
    });
  }

  public broadcast(event: string, data: any, room?: string) {
    try {
      if (room) {
        this.io.to(room).emit(event, data);
      } else {
        this.io.emit(event, data);
      }
    } catch (error) {
      logger.error(`广播消息失败: ${error.message}`);
    }
  }

  public getIO(): SocketServer {
    return this.io;
  }
}