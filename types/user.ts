export interface User {
  id: string
  username: string
  email: string
  role: "admin" | "user"
  status: "active" | "inactive" | "banned"
  avatar?: string
  friends?: string[]
  authToken?: string
  tokenExpiry?: string
  securitySettings: SecuritySettings
  audioSettings: AudioSettings
  devicePreferences: DevicePreferences
  lastActive: string
}

export interface SecuritySettings {
  twoFactorEnabled: boolean
  lastLoginAttempts: LoginAttempt[]
  ipWhitelist: string[]
  deviceHistory: DeviceInfo[]
}

export interface AudioSettings {
  volume: number
  noiseReduction: boolean
  echoCancellation: boolean
  autoGainControl: boolean
  sampleRate: number
  bitDepth: number
  preferredCodec?: string
}

export interface DevicePreferences {
  preferredInputDevice?: string
  preferredOutputDevice?: string
  defaultPTTKey?: string
  automaticVolumeControl: boolean
}

export interface LoginAttempt {
  timestamp: string
  ip: string
  success: boolean
  userAgent: string
  location?: string
}

export interface DeviceInfo {
  id: string
  name: string
  firstLogin: string
  lastLogin: string
  trusted: boolean
  userAgent: string
}

export interface Room {
  id: string
  name: string
  description?: string
  createdBy: string
  createdByName: string
  participants: string[]
  isActive: boolean
  hasPassword: boolean
  password?: string
  maxParticipants: number
  createdAt: string
  lastActivity: string
  settings?: RoomSettings
}

export interface RoomSettings {
  allowRecording: boolean
  qualityPreference: "high" | "balanced" | "low"
  encryptionEnabled: boolean
  moderators?: string[]
  bannedUsers?: string[]
  muteOnJoin: boolean
}

export interface EncryptedVoiceData {
  data: ArrayBuffer
  iv: Uint8Array
  salt: Uint8Array
  timestamp?: number
  messageId?: string
  signature?: ArrayBuffer
}

export interface VoiceStats {
  volume: number
  speaking: boolean
  muted: boolean
  codec: string
  packetLoss: number
  bitrate: number
  latency: number
}

export interface NetworkStats {
  connected: boolean
  connectionType?: string
  signalStrength?: number
  uplinkCapacity?: number
  downlinkCapacity?: number
}

export interface FriendRequest {
  id: string
  fromUserId: string
  fromUserName: string
  toUserId: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
  message?: string
}
