export interface VoiceMessage {
  id: string
  senderId: string
  senderName: string
  duration: number
  timestamp: Date
  url: string
}

export interface AudioStats {
  volume: number
  speaking: boolean
  muted: boolean
  codec: string
  packetLoss: number
  bitrate: number
  latency: number
}

export interface VoiceData {
  data: ArrayBuffer
  iv: Uint8Array
  salt: Uint8Array
  timestamp?: number
  messageId?: string
  signature?: ArrayBuffer
}