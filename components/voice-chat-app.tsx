"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Phone, PhoneOff, Users, Wifi, WifiOff, LogOut, UserIcon, Settings2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { User } from "@/types/user"
import AudioSettings, { type AudioSettings } from "@/components/audio-settings"
import DeviceManager from "@/components/device-manager"
import AudioVisualizer from "@/components/audio-visualizer"
import VoiceHistory from "./voice-history"
import { Switch } from "@/components/ui/switch"
import { useWebSocket } from "@/hooks/use-websocket"
import { QualityIndicator } from "./quality-indicator"
import { VoiceMessage, AudioStats, VoiceData } from "@/types/voice"
import { AudioEncryption } from "@/lib/audio-encryption"
import {
  getStatusColor,
  getStatusText,
  initializeAudioAnalyser,
  activatePTT,
  deactivatePTT,
  toggleMute,
  generateSecureSessionId,
  togglePTTMode as togglePTTModeUtil,
  encryptVoiceData,
  decryptVoiceData,
} from "@/lib/utils"

interface Participant {
  id: string
  name: string
  isMuted: boolean
  isPaused?: boolean
}

interface VoiceChatAppProps {
  user: User
  onLogout: () => void
  socket: Socket
}

interface AudioSettings {
  volume: number
  noiseReduction: boolean
  echoCancellation: boolean
  autoGainControl: boolean
  sampleRate: number
  bitDepth: number
}

export default function VoiceChatApp({ user, onLogout, socket }: VoiceChatAppProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [roomId, setRoomId] = useState("")
  const [participants, setParticipants] = useState<Participant[]>([])
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const [isPTTMode, setIsPTTMode] = useState(true)
  const [isPTTActive, setIsPTTActive] = useState(false)
  const [pttKeyPressed, setPttKeyPressed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
  const [audioVolume, setAudioVolume] = useState(1)
  const [currentRoomKey, setCurrentRoomKey] = useState<CryptoKey | null>(null)
  const [audioQualityStats, setAudioQualityStats] = useState({
    packetLoss: 0,
    bitrate: 0,
    latency: 0,
    jitter: 0,
  })
  const [showAudioSettings, setShowAudioSettings] = useState(false)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    volume: 1,
    noiseReduction: true,
    echoCancellation: true,
    autoGainControl: true,
    sampleRate: 48000,
    bitDepth: 16
  })
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([])
  const [isPlayingHistory, setIsPlayingHistory] = useState(false)

  const localAudioRef = useRef<HTMLAudioElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const audioContextRef = useRef<AudioContext>()
  const gainNodeRef = useRef<GainNode>()
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const messageQueueRef = useRef<ArrayBuffer[]>([])
  const processingLockRef = useRef(false)
  const statsIntervalRef = useRef<NodeJS.Timer>()

  const { toast } = useToast()

  const MAX_RETRY_ATTEMPTS = 3
  const RETRY_DELAY = 2000 // 2秒

  const { socket: wsSocket, isConnected: wsConnected, emit } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3500',
    onConnect: () => {
      if (roomId) {
        emit('join_room', { roomId });
      }
    },
    onDisconnect: () => {
      toast({
        title: '连接断开',
        description: '正在尝试重新连接...',
        variant: 'destructive',
      });
    },
    onError: (error) => {
      toast({
        title: '连接错误',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    // 初始化音频设备列表
    loadAudioDevices()

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat && isPTTMode && isConnected) {
        event.preventDefault()
        setPttKeyPressed(true)
        activatePTT()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space" && isPTTMode && isConnected) {
        event.preventDefault()
        setPttKeyPressed(false)
        deactivatePTT()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [isPTTMode, isConnected])

  useEffect(() => {
    if (isConnected && peerConnectionRef.current) {
      startQoSMonitoring()
    }
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current)
      }
    }
  }, [isConnected])

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter((device) => device.kind === "audioinput")
      setAudioDevices(audioInputs)

      if (audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId)
      }
    } catch (error) {
      console.error("获取音频设备失败:", error)
      toast({
        title: "设备错误",
        description: "无法获取音频设备列表",
        variant: "destructive",
      })
    }
  }

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    if (isConnected) {
      try {
        await switchAudioDevice(deviceId)
      } catch (error) {
        console.error("切换音频设备失败:", error)
        toast({
          title: "设备切换失败",
          description: "无法切换到选中的音频设备",
          variant: "destructive",
        })
      }
    }
  }

  const switchAudioDevice = async (deviceId: string) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    localStreamRef.current = newStream

    if (peerConnectionRef.current) {
      const senders = peerConnectionRef.current.getSenders()
      const audioSender = senders.find((sender) => sender.track?.kind === "audio")
      if (audioSender) {
        await audioSender.replaceTrack(newStream.getAudioTracks()[0])
      }
    }

    initializeAudioProcessing(newStream)
  }

  const handlePTTMouseDown = () => {
    if (isPTTMode && isConnected) {
      activatePTT(localStreamRef.current)
      setIsPTTActive(true)
      setIsMuted(false)
      setParticipants(prev =>
        prev.map(p => (p.name === user.username ? { ...p, isMuted: false } : p))
      )
    }
  }

  const handlePTTMouseUp = () => {
    if (isPTTMode && isConnected) {
      deactivatePTT(localStreamRef.current)
      setIsPTTActive(false)
      setIsMuted(true)
      setParticipants(prev =>
        prev.map(p => (p.name === user.username ? { ...p, isMuted: true } : p))
      )
    }
  }

  const handleToggleMute = () => {
    const newMutedState = toggleMute(localStreamRef.current)
    setIsMuted(newMutedState)
    setParticipants(prev =>
      prev.map(p => (p.name === user.username ? { ...p, isMuted: newMutedState } : p))
    )
  }

  const handleTogglePTTMode = () => {
    togglePTTModeUtil(isPTTMode, localStreamRef.current, setIsPTTMode, setIsMuted)
    setParticipants(prev =>
      prev.map(p => (p.name === user.username ? { ...p, isMuted: true } : p))
    )
  }

  const initializeAudioProcessing = (stream: MediaStream) => {
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }

    audioContextRef.current = new AudioContext()
    const [analyser, dataArray, bufferLength] = initializeAudioAnalyser(stream)
    
    const processor = audioContextRef.current.createScriptProcessor(1024, 1, 1)
    processor.onaudioprocess = async (e) => {
      if (isConnected && !isMuted && (isPTTActive || !isPTTMode)) {
        const inputData = e.inputBuffer.getChannelData(0)
        const rms = Math.sqrt(inputData.reduce((acc, val) => acc + val * val, 0) / inputData.length)
        const db = 20 * Math.log10(rms)
        
        if (db > -50) {
          const encryptedData = await encryptVoiceData(inputData.buffer, currentRoomKey!)
          const messageId = generateSecureSessionId()

          socket?.emit('voice-message', {
            roomId,
            audioData: encryptedData,
            duration: inputData.length / audioContextRef.current!.sampleRate,
            messageId,
            timestamp: Date.now()
          })
        }
      }
    }

    return processor
  }

  const handleVolumeChange = (value: number) => {
    setAudioVolume(value)
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = value
    }
  }

  const initializeMedia = async () => {
    try {
      const audioDevices = await navigator.mediaDevices.enumerateDevices()
      const inputDevices = audioDevices.filter(device => device.kind === 'audioinput')

      const constraints = {
        audio: {
          deviceId: selectedDeviceId || inputDevices[0]?.deviceId,
          echoCancellation: audioSettings.echoCancellation,
          noiseSuppression: audioSettings.noiseReduction,
          autoGainControl: audioSettings.autoGainControl,
          // 优化音频质量设置
          sampleRate: 48000,
          channelCount: 1,
          latency: 0,
          // 设置合适的音频比特率
          googMinBitrate: 24000,
          googTargetBitrate: 32000,
          googMaxBitrate: 48000,
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream

      // 音频上下文初始化
      const audioContext = new AudioContext({ 
        latencyHint: 'interactive',
        sampleRate: 48000
      })
      
      const source = audioContext.createMediaStreamSource(stream)
      const gainNode = audioContext.createGain()
      const analyser = audioContext.createAnalyser()
      
      // 设置音频分析参数
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      
      source.connect(gainNode)
      gainNode.connect(analyser)
      gainNode.connect(audioContext.destination)

      // 设置初始音量
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = audioVolume
      }

      // 监控音量水平
      const checkVolume = () => {
        if (!isConnected) return
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / bufferLength

        if (average > 130) {
          // 音量过大提醒
          toast({
            title: "音量过大",
            description: "请调低说话音量",
            variant: "warning",
          })
        }
      }

      const volumeInterval = setInterval(checkVolume, 1000)

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream
        localAudioRef.current.muted = true
      }

      return stream
    } catch (error) {
      console.error("获取音频设备失败:", error)
      toast({
        title: "音频设备错误",
        description: error instanceof Error ? error.message : "无法访问麦克风",
        variant: "destructive",
      })
      throw error
    }
  }

  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
          urls: "turn:turn.example.com:3478",
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        },
      ],
      iceTransportPolicy: "all",
      iceCandidatePoolSize: 10,
    }

    const pc = new RTCPeerConnection(configuration)
    let reconnectAttempts = 0
    const maxReconnectAttempts = 3

    pc.oniceconnectionstatechange = async () => {
      console.log("ICE连接状态:", pc.iceConnectionState)

      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        setConnectionStatus("disconnected")

        // 断线重连逻辑
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          toast({
            title: "连接中断",
            description: `正在尝试重新连接 (${reconnectAttempts}/${maxReconnectAttempts})...`,
          })

          try {
            await pc.restartIce()
            console.log("正在尝试ICE重启...")
          } catch (error) {
            console.error("ICE重启失败:", error)
            leaveRoom()
          }
        } else {
          toast({
            title: "连接失败",
            description: "重连次数已达上限，请重新加入房间",
            variant: "destructive",
          })
          leaveRoom()
        }
      } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setConnectionStatus("connected")
        reconnectAttempts = 0
      }
    }

    // 添加连接状态监控
    pc.onconnectionstatechange = () => {
      console.log("连接状态:", pc.connectionState)
      switch (pc.connectionState) {
        case "connected":
          toast({
            title: "连接已建立",
            description: "网络连接质量良好",
          })
          break
        case "disconnected":
          toast({
            title: "连接不稳定",
            description: "请检查网络连接",
            variant: "warning",
          })
          break
        case "failed":
          toast({
            title: "连接失败",
            description: "网络连接已断开",
            variant: "destructive",
          })
          break
      }
    }

    pc.ontrack = (event) => {
      console.log("接收到远程音频流")
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0]
      }
    }

    return pc
  }

  const handleEncryptedVoiceData = async (audioData: ArrayBuffer) => {
    if (!currentRoomKey) return

    try {
      const encryptedData = await encryptVoiceData(audioData, currentRoomKey)
      const messageId = generateSecureSessionId()
      const duration = audioData.byteLength / (48000 * 2) // 估算时长（48kHz采样率，16位）

      // 保存语音消息
      const voiceMessage: VoiceMessage = {
        id: messageId,
        senderId: user.id,
        senderName: user.username,
        duration,
        timestamp: new Date(),
        url: URL.createObjectURL(new Blob([audioData], { type: 'audio/webm;codecs=opus' }))
      }
      setVoiceMessages(prev => [...prev, voiceMessage])

      // 通过WebRTC数据通道发送数据
      if (peerConnectionRef.current?.dataChannel) {
        const message = {
          id: messageId,
          type: "voice",
          data: encryptedData,
          timestamp: Date.now(),
        }
        peerConnectionRef.current.dataChannel.send(JSON.stringify(message))
      }
    } catch (error) {
      console.error("音频加密失败:", error)
    }
  }

  useEffect(() => {
    if (socket && isConnected) {
      socket.on('new-voice-message', (message) => {
        setVoiceMessages(prev => [...prev, {
          id: message._id,
          senderId: message.senderId,
          senderName: message.sender.username,
          duration: message.voiceData.duration,
          timestamp: new Date(message.createdAt),
          url: message.voiceData.url
        }]);
      });

      socket.on('user-paused', ({ userId }) => {
        if (userId !== user.id) {
          setParticipants(prev =>
            prev.map(p => p.id === userId ? { ...p, isPaused: true } : p)
          );
        }
      });

      socket.on('user-resumed', ({ userId }) => {
        if (userId !== user.id) {
          setParticipants(prev =>
            prev.map(p => p.id === userId ? { ...p, isPaused: false } : p)
          );
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('new-voice-message');
        socket.off('user-paused');
        socket.off('user-resumed');
      }
    };
  }, [socket, isConnected]);

  const handleHistoryPlayStart = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
        setIsMuted(true);
        setIsPlayingHistory(true);
        
        // 通知其他用户
        socket?.emit('pause-voice', { roomId });
      }
    }
  };

  const handleHistoryPlayEnd = () => {
    if (localStreamRef.current && !isPTTMode) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        setIsMuted(false);
        setIsPlayingHistory(false);
        
        // 通知其他用户
        socket?.emit('resume-voice', { roomId });
      }
    }
  };

  // 修改 joinRoom 函数以加载历史消息
  const joinRoom = async (roomId: string, encryptionKey: CryptoKey) => {
    // ...existing code...
    
    try {
      const response = await fetch(`/api/messages/${roomId}/voice`);
      if (response.ok) {
        const messages = await response.json();
        setVoiceMessages(messages.map(msg => ({
          id: msg._id,
          senderId: msg.senderId,
          senderName: msg.sender.username,
          duration: msg.voiceData.duration,
          timestamp: new Date(msg.createdAt),
          url: msg.voiceData.url
        })));
      }
    } catch (error) {
      console.error('加载语音历史记录失败:', error);
    }
    
    // ...existing code...
  };

  const handleJoinRoom = (newRoomId: string) => {
    if (!isConnected) {
      toast({
        title: '未连接',
        description: '请等待WebSocket连接成功',
        variant: 'destructive',
      });
      return;
    }

    setRoomId(newRoomId);
    emit('join_room', { roomId: newRoomId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部用户信息 */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">网络对讲</h1>
            <p className="text-gray-600">实时语音通信平台</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
              <UserIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">{user.username}</span>
              <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                {user.role === "admin" ? "管理员" : "用户"}
              </Badge>
            </div>
            <Button onClick={onLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 连接控制面板 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {connectionStatus === "connected" ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                连接控制
              </CardTitle>
              <CardDescription>加入或创建语音房间</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>

              {!isConnected ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">房间ID</label>
                    <Input
                      placeholder="输入房间ID或创建新房间"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                    />
                  </div>

                  <Button onClick={joinRoom} className="w-full" disabled={connectionStatus === "connecting"}>
                    <Phone className="w-4 h-4 mr-2" />
                    {connectionStatus === "connecting" ? "连接中..." : "加入房间"}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      已连接到房间: <strong>{roomId}</strong>
                    </p>
                    <p className="text-sm text-green-600">用户: {user.username}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`w-2 h-2 rounded-full ${isPTTMode ? "bg-orange-500" : "bg-blue-500"}`} />
                      <span className="text-xs text-gray-600">{isPTTMode ? "PTT模式" : "常规模式"}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button onClick={togglePTTMode} variant="outline" className="w-full">
                      {isPTTMode ? "切换到常规模式" : "切换到PTT模式"}
                    </Button>

                    {isPTTMode && (
                      <div className="text-center">
                        <Button
                          onMouseDown={handlePTTMouseDown}
                          onMouseUp={handlePTTMouseUp}
                          onMouseLeave={handlePTTMouseUp}
                          onTouchStart={handlePTTMouseDown}
                          onTouchEnd={handlePTTMouseUp}
                          className={`w-24 h-24 rounded-full text-white font-bold text-lg transition-all duration-150 ${
                            isPTTActive
                              ? "bg-red-500 hover:bg-red-600 scale-110 shadow-lg"
                              : "bg-gray-500 hover:bg-gray-600"
                          }`}
                          disabled={!isConnected}
                        >
                          {isPTTActive ? "ON AIR" : "PTT"}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">按住说话 | 空格键快捷键</p>
                        {pttKeyPressed && <p className="text-xs text-orange-600 font-medium">🎤 正在使用键盘PTT</p>}
                      </div>
                    )}
                  </div>

                  {!isPTTMode && (
                    <div className="flex gap-2">
                      <Button onClick={toggleMute} variant={isMuted ? "destructive" : "default"} className="flex-1">
                        {isMuted ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                        {isMuted ? "取消静音" : "静音"}
                      </Button>
                    </div>
                  )}

                  <Button onClick={leaveRoom} variant="destructive" className="w-full">
                    <PhoneOff className="w-4 h-4 mr-2" />
                    离开房间
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 参与者列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                参与者 ({participants.length})
              </CardTitle>
              <CardDescription>当前房间内的用户</CardDescription>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无参与者</p>
                  <p className="text-sm">加入房间后显示参与者列表</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{participant.name}</span>
                        {participant.name === user.username && (
                          <Badge variant="secondary" className="text-xs">
                            你
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {participant.isMuted ? (
                          <MicOff className="w-4 h-4 text-red-500" />
                        ) : (
                          <Mic className="w-4 h-4 text-green-500" />
                        )}
                        {participant.name === user.username && isPTTMode && isPTTActive && (
                          <Badge variant="destructive" className="text-xs animate-pulse">
                            ON AIR
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 音频设置面板 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                音频设置
              </CardTitle>
              <CardDescription>调整麦克风和扬声器设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">输入设备</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    className="mt-1 block w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {audioDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `设备 ${device.deviceId}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">输出音量</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={audioVolume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={loadAudioDevices} variant="outline" className="flex-1">
                  刷新设备
                </Button>
                <Button
                  onClick={() => setShowAudioSettings(!showAudioSettings)}
                  variant={showAudioSettings ? "default" : "outline"}
                  className="flex-1"
                >
                  {showAudioSettings ? "隐藏高级设置" : "显示高级设置"}
                </Button>
              </div>

              {showAudioSettings && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">高级音频设置</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">回声消除</label>
                      <Switch
                        checked={audioSettings.echoCancellation}
                        onCheckedChange={(checked) =>
                          setAudioSettings((prev) => ({ ...prev, echoCancellation: checked }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">噪声抑制</label>
                      <Switch
                        checked={audioSettings.noiseReduction}
                        onCheckedChange={(checked) =>
                          setAudioSettings((prev) => ({ ...prev, noiseReduction: checked }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">自动增益控制</label>
                      <Switch
                        checked={audioSettings.autoGainControl}
                        onCheckedChange={(checked) =>
                          setAudioSettings((prev) => ({ ...prev, autoGainControl: checked }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">采样率</label>
                      <select
                        value={audioSettings.sampleRate}
                        onChange={(e) =>
                          setAudioSettings((prev) => ({ ...prev, sampleRate: Number(e.target.value) }))
                        }
                        className="mt-1 block w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value={48000}>48 kHz</option>
                        <option value={44100}>44.1 kHz</option>
                        <option value={32000}>32 kHz</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">位深</label>
                      <select
                        value={audioSettings.bitDepth}
                        onChange={(e) =>
                          setAudioSettings((prev) => ({ ...prev, bitDepth: Number(e.target.value) }))
                        }
                        className="mt-1 block w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value={16}>16 位</option>
                        <option value={24}>24 位</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 音频质量监控 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                音频质量监控
              </CardTitle>
              <CardDescription>实时监控音频连接质量</CardDescription>
            </CardHeader>
            <CardContent>
              <QualityIndicator />
            </CardContent>
          </Card>
        </div>

        {/* 使用说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="font-medium mb-2">如何开始</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>1. 输入房间ID（相同ID的用户会进入同一房间）</li>
                  <li>2. 点击"加入房间"开始语音通话</li>
                  <li>3. 允许浏览器访问麦克风权限</li>
                  <li>4. 开始与其他用户通话</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">PTT模式使用</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 按住PTT按钮说话</li>
                  <li>• 松开按钮接收他人语音</li>
                  <li>• 空格键快捷操作</li>
                  <li>• 可切换到常规通话模式</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">账号功能</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 个人账号系统</li>
                  <li>• 管理员权限管理</li>
                  <li>• 用户状态显示</li>
                  <li>• 安全登录认证</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <audio ref={localAudioRef} autoPlay muted />
        <audio ref={remoteAudioRef} autoPlay />
      </div>
    </div>
  )
}
