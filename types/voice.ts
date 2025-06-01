export interface VoiceMessage {
  id: string;
  senderId: string;
  senderName: string;
  duration: number;
  timestamp: Date;
  url?: string;
}

export interface VoiceData {
  roomId: string;
  audioData: ArrayBuffer;
  duration: number;
  messageId: string;
  timestamp: number;
}

export interface AudioStats {
  packetLoss: number;
  bitrate: number;
  latency: number;
  jitter: number;
}

export interface RoomParticipant {
  id: string;
  name: string;
  isMuted: boolean;
  isPaused?: boolean;
}

export interface AudioQualityEvent {
  roomId: string;
  quality: number;
}