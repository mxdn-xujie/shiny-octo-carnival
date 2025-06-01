import { Socket } from 'socket.io';

export interface ServerToClientEvents {
  'new-voice-message': (message: any) => void;
  'user-status-change': (data: { userId: string; status: 'online' | 'offline' }) => void;
  'user-joined': (data: { userId: string; socketId: string }) => void;
  'user-left': (data: { userId: string; socketId: string }) => void;
  'room-users-update': (data: { roomId: string; users: string[] }) => void;
  'user-speaking': (data: { userId: string; isSpeaking: boolean }) => void;
  'user-paused': (data: { userId: string }) => void;
  'user-resumed': (data: { userId: string }) => void;
  'voice-data': (data: { userId: string; socketId: string; data: ArrayBuffer }) => void;
  'error': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'ping': (callback: () => void) => void;
  'user-online': (userId: string) => void;
  'join-room': (data: { roomId: string; userId: string }) => void;
  'leave-room': (data: { roomId: string; userId: string }) => void;
  'voice-message': (data: {
    roomId: string;
    audioData: ArrayBuffer;
    duration: number;
    messageId: string;
    timestamp: number;
  }) => void;
  'speaking-state': (data: { roomId: string; isSpeaking: boolean }) => void;
  'pause-voice': (data: { roomId: string }) => void;
  'resume-voice': (data: { roomId: string }) => void;
  'audio-quality': (data: { roomId: string; quality: number }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  username: string;
  rooms: Set<string>;
}

export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;