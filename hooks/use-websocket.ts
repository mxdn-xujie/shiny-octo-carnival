import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface WebSocketOptions {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useWebSocket({
  url,
  reconnectAttempts = 5,
  reconnectDelay = 3000,
  onConnect,
  onDisconnect,
  onError,
}: WebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(url, {
      reconnection: false, // 我们自己处理重连逻辑
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      reconnectCountRef.current = 0;
      onConnect?.();
      toast.success('WebSocket连接成功');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      onDisconnect?.();
      handleReconnect();
    });

    socketRef.current.on('error', (error: Error) => {
      onError?.(error);
      toast.error(`WebSocket错误: ${error.message}`);
    });

    socketRef.current.on('ping', () => {
      socketRef.current?.emit('pong');
    });
  };

  const handleReconnect = () => {
    if (reconnectCountRef.current >= reconnectAttempts) {
      toast.error('WebSocket重连次数超限，请刷新页面重试');
      return;
    }

    reconnectTimerRef.current = setTimeout(() => {
      reconnectCountRef.current += 1;
      toast.info(`正在尝试重新连接... (${reconnectCountRef.current}/${reconnectAttempts})`);
      connect();
    }, reconnectDelay);
  };

  useEffect(() => {
    connect();

    return () => {
      reconnectTimerRef.current && clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
      }
    };
  }, [url]);

  const emit = (event: string, data: any) => {
    if (!socketRef.current?.connected) {
      toast.error('WebSocket未连接，请等待重连');
      return;
    }
    socketRef.current.emit(event, data);
  };

  return {
    socket: socketRef.current,
    isConnected,
    emit,
  };
}