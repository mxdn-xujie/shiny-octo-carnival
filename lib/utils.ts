import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { customAlphabet } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 安全工具类
import { EncryptedVoiceData } from "@/types/user";
import type { User } from "@/types/user";

// 创建安全的会话ID
export const generateSecureSessionId = customAlphabet(
  "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  32
);

// 生成加密密钥
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// AES-GCM 加密音频数据
export async function encryptVoiceData(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<EncryptedVoiceData> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const salt = window.crypto.getRandomValues(new Uint8Array(16));

  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: salt,
    },
    key,
    data
  );

  return {
    data: encryptedData,
    iv,
    salt,
  };
}

// AES-GCM 解密音频数据
export async function decryptVoiceData(
  encryptedData: EncryptedVoiceData,
  key: CryptoKey
): Promise<ArrayBuffer> {
  return await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: encryptedData.iv,
      additionalData: encryptedData.salt,
    },
    key,
    encryptedData.data
  );
}

// JWT Token验证
export async function verifyToken(token: string): Promise<boolean> {
  try {
    if (!token) return false;
    const users: User[] = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u) => u.authToken === token);
    if (!user) return false;

    const tokenExpiry = new Date(user.tokenExpiry || 0);
    return tokenExpiry > new Date();
  } catch {
    return false;
  }
}

// 密码安全性检查
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const strengthTests = {
    length: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(strengthTests).filter(Boolean).length;
  const feedback = [];

  if (!strengthTests.length) feedback.push("密码长度至少8位");
  if (!strengthTests.hasUpperCase) feedback.push("需要包含大写字母");
  if (!strengthTests.hasLowerCase) feedback.push("需要包含小写字母");
  if (!strengthTests.hasNumbers) feedback.push("需要包含数字");
  if (!strengthTests.hasSpecialChar) feedback.push("需要包含特殊字符");

  return { score, feedback };
}

// 验证音频数据完整性
export async function verifyAudioIntegrity(
  audioData: ArrayBuffer,
  signature: ArrayBuffer,
  publicKey: CryptoKey
): Promise<boolean> {
  try {
    return await window.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      publicKey,
      signature,
      audioData
    );
  } catch (error) {
    console.error("音频完整性验证失败:", error);
    return false;
  }
}

// 防重放攻击检查
const messageCache = new Set<string>();
export const MESSAGE_CACHE_TIMEOUT = 5000; // 5秒消息缓存超时

export function checkReplayAttack(messageId: string): boolean {
  if (messageCache.has(messageId)) return false;

  messageCache.add(messageId);
  setTimeout(() => messageCache.delete(messageId), MESSAGE_CACHE_TIMEOUT);

  return true;
}

// 防止重放攻击的消息缓存
export class MessageCache {
  private cache = new Set<string>();
  private readonly maxAge: number;

  constructor(maxAge: number = 30000) {
    // 默认30秒过期
    this.maxAge = maxAge;
  }

  add(messageId: string): void {
    this.cache.add(messageId);
    setTimeout(() => this.cache.delete(messageId), this.maxAge);
  }

  has(messageId: string): boolean {
    return this.cache.has(messageId);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 音频质量监控类型定义
export interface AudioQualityMetrics {
  packetLoss: number;
  bitrate: number;
  latency: number;
  jitter: number;
}

export const AUDIO_QUALITY_THRESHOLDS = {
  GOOD: {
    packetLoss: 5,
    latency: 100,
    jitter: 30,
    minBitrate: 24000,
  },
  WARNING: {
    packetLoss: 10,
    latency: 200,
    jitter: 50,
    minBitrate: 16000,
  },
  CRITICAL: {
    packetLoss: 15,
    latency: 300,
    jitter: 100,
    minBitrate: 8000,
  },
};

// 状态管理和音频处理辅助函数
export const getStatusColor = (
  status: "connected" | "connecting" | "disconnected"
): string => {
  switch (status) {
    case "connected":
      return "bg-green-500";
    case "connecting":
      return "bg-yellow-500";
    case "disconnected":
      return "bg-red-500";
  }
};

export const getStatusText = (
  status: "connected" | "connecting" | "disconnected"
): string => {
  switch (status) {
    case "connected":
      return "已连接";
    case "connecting":
      return "连接中...";
    case "disconnected":
      return "未连接";
  }
};

export const initializeAudioAnalyser = (
  stream: MediaStream
): [AnalyserNode, Uint8Array, number] => {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();

  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);

  return [analyser, dataArray, bufferLength];
};

export const activatePTT = (stream: MediaStream | null): void => {
  if (stream) {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = true;
    }
  }
};

export const deactivatePTT = (stream: MediaStream | null): void => {
  if (stream) {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = false;
    }
  }
};

export const toggleMute = (stream: MediaStream | null): boolean => {
  if (stream) {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled;
    }
  }
  return false;
};

export const generateSecureSessionId = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const togglePTTMode = (
  isPTTMode: boolean,
  stream: MediaStream | null,
  setIsPTTMode: (value: boolean) => void,
  setIsMuted: (value: boolean) => void
): void => {
  setIsPTTMode(!isPTTMode);
  if (stream) {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      if (!isPTTMode) {
        audioTrack.enabled = false;
        setIsMuted(true);
      } else {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }
};
