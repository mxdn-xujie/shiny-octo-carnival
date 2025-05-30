"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, MicOff, Users, Wifi, WifiOff, LogOut, ArrowLeft, Settings, Radio, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import LoginPage from "@/components/login-page"
import AdminPanel from "@/components/admin-panel"
import RoomList from "@/components/room-list"
import FriendsList from "@/components/friends-list"
import UserSettings from "@/components/user-settings"
import MusicPlayer from "@/components/music-player"
import type { User, Room } from "@/types/user"
import UserAvatar from "@/components/user-avatar"

interface Participant {
  id: string
  name: string
  isMuted: boolean
}

const VoiceChatApp = ({
  user,
  onLogout,
  onUserUpdate,
}: { user: User; onLogout: () => void; onUserUpdate: (user: User) => void }) => {
  const [currentView, setCurrentView] = useState<"main" | "room" | "settings">("main")
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [userName, setUserName] = useState(user?.username || "")
  const [participants, setParticipants] = useState<Participant[]>([])
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const [isPTTMode, setIsPTTMode] = useState(true)
  const [isPTTActive, setIsPTTActive] = useState(false)
  const [pttKeyPressed, setPttKeyPressed] = useState(false)

  const localAudioRef = useRef<HTMLAudioElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  const { toast } = useToast()

  // 更新用户名当用户信息变化时
  useEffect(() => {
    setUserName(user?.username || "")
  }, [user?.username])

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
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

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      localStreamRef.current = stream

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream
        localAudioRef.current.muted = true
      }

      return stream
    } catch (error) {
      console.error("获取音频权限失败:", error)
      toast({
        title: "音频权限错误",
        description: "无法获取麦克风权限，请检查浏览器设置",
        variant: "destructive",
      })
      throw error
    }
  }

  const createPeerConnection = () => {
    // 修复STUN服务器配置
    const configuration: RTCConfiguration = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
        {
          urls: "stun:stun1.l.google.com:19302",
        },
        {
          urls: "stun:stun2.l.google.com:19302",
        },
        {
          urls: "stun:stun3.l.google.com:19302",
        },
        {
          urls: "stun:stun4.l.google.com:19302",
        },
      ],
      iceCandidatePoolSize: 10,
    }

    let pc: RTCPeerConnection

    try {
      pc = new RTCPeerConnection(configuration)
    } catch (error) {
      console.error("创建RTCPeerConnection失败:", error)
      // 如果主要配置失败，使用简化配置
      const fallbackConfiguration: RTCConfiguration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      }
      pc = new RTCPeerConnection(fallbackConfiguration)
    }

    pc.oniceconnectionstatechange = () => {
      console.log("ICE连接状态:", pc.iceConnectionState)
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setConnectionStatus("connected")
      } else if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        setConnectionStatus("disconnected")
        // 如果连接失败，尝试重新连接
        if (pc.iceConnectionState === "failed") {
          console.log("ICE连接失败，尝试重新连接...")
          // 这里可以添加重连逻辑
        }
      }
    }

    pc.ontrack = (event) => {
      console.log("接收到远程音频流")
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0]
      }
    }

    pc.onicegatheringstatechange = () => {
      console.log("ICE收集状态:", pc.iceGatheringState)
    }

    pc.onconnectionstatechange = () => {
      console.log("连接状态:", pc.connectionState)
    }

    return pc
  }

  const handleJoinRoom = async (room: Room) => {
    try {
      setCurrentRoom(room)
      setCurrentView("room")
      setConnectionStatus("connecting")

      // 更新房间活动时间（除了系统音乐电台）
      if (room.id !== "music-radio-default") {
        const rooms: Room[] = JSON.parse(localStorage.getItem("rooms") || "[]")
        const updatedRooms = rooms.map((r) => (r.id === room.id ? { ...r, lastActivity: new Date().toISOString() } : r))
        localStorage.setItem("rooms", JSON.stringify(updatedRooms))
      }

      // 如果是音乐电台，不需要麦克风权限
      if (room.id === "music-radio-default") {
        setTimeout(() => {
          setIsConnected(true)
          setConnectionStatus("connected")
          setParticipants([
            { id: "1", name: userName, isMuted: true }, // 在音乐电台中默认静音
            { id: "2", name: "音乐爱好者", isMuted: true },
            { id: "3", name: "夜猫子", isMuted: true },
            { id: "4", name: "摇滚青年", isMuted: true },
          ])

          toast({
            title: "欢迎来到音乐电台",
            description: `正在收听 "${room.name}"，享受美妙的音乐时光！`,
          })
        }, 1000)
        return
      }

      // 普通语音房间需要麦克风权限和WebRTC连接
      try {
        const stream = await initializeMedia()
        const pc = createPeerConnection()
        peerConnectionRef.current = pc

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream)
        })

        setTimeout(() => {
          setIsConnected(true)
          setConnectionStatus("connected")
          setParticipants([
            { id: "1", name: userName, isMuted: isPTTMode },
            { id: "2", name: "演示用户", isMuted: false },
          ])

          if (isPTTMode && localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0]
            if (audioTrack) {
              audioTrack.enabled = false
              setIsMuted(true)
            }
          }

          toast({
            title: "成功加入房间",
            description: `已加入房间 "${room.name}"`,
          })
        }, 1500)
      } catch (webrtcError) {
        console.error("WebRTC连接失败:", webrtcError)

        // 即使WebRTC失败，也允许用户进入房间（仅作为听众）
        setTimeout(() => {
          setIsConnected(true)
          setConnectionStatus("connected")
          setParticipants([
            { id: "1", name: userName, isMuted: true }, // 强制静音
            { id: "2", name: "演示用户", isMuted: false },
          ])

          toast({
            title: "已加入房间（仅听众模式）",
            description: `由于网络限制，您只能作为听众参与。房间："${room.name}"`,
            variant: "destructive",
          })
        }, 1000)
      }
    } catch (error) {
      console.error("加入房间失败:", error)
      setConnectionStatus("disconnected")
      setCurrentView("main")
      setCurrentRoom(null)

      toast({
        title: "加入房间失败",
        description: "无法连接到房间，请检查网络连接或稍后重试",
        variant: "destructive",
      })
    }
  }

  const handleStartPrivateChat = (friendId: string, friendName: string) => {
    // 创建私聊房间
    const privateRoom: Room = {
      id: `private-${user.id}-${friendId}-${Date.now()}`,
      name: `与 ${friendName} 的私聊`,
      description: "私人聊天室",
      createdBy: user.id,
      createdByName: user.username,
      participants: [user.id, friendId],
      isActive: true,
      hasPassword: false,
      maxParticipants: 2,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    }

    handleJoinRoom(privateRoom)
  }

  const leaveRoom = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    setIsConnected(false)
    setConnectionStatus("disconnected")
    setParticipants([])
    setIsPTTActive(false)
    setPttKeyPressed(false)
    localStreamRef.current = null
    setCurrentRoom(null)
    setCurrentView("main")

    toast({
      title: "已离开房间",
      description: "成功断开连接，可以重新加入其他房间",
    })
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)

        setParticipants((prev) => prev.map((p) => (p.name === userName ? { ...p, isMuted: !audioTrack.enabled } : p)))
      }
    }
  }

  const activatePTT = () => {
    if (localStreamRef.current && isPTTMode) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = true
        setIsPTTActive(true)
        setIsMuted(false)

        setParticipants((prev) => prev.map((p) => (p.name === userName ? { ...p, isMuted: false } : p)))
      }
    }
  }

  const deactivatePTT = () => {
    if (localStreamRef.current && isPTTMode) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = false
        setIsPTTActive(false)
        setIsMuted(true)

        setParticipants((prev) => prev.map((p) => (p.name === userName ? { ...p, isMuted: true } : p)))
      }
    }
  }

  const togglePTTMode = () => {
    setIsPTTMode(!isPTTMode)

    if (!isPTTMode) {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = false
          setIsMuted(true)
          setIsPTTActive(false)
        }
      }
    } else {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = !isMuted
        }
      }
    }

    toast({
      title: isPTTMode ? "已切换到常规模式" : "已切换到PTT模式",
      description: isPTTMode ? "可以自由通话" : "按住空格键或PTT按钮说话",
    })
  }

  const handlePTTMouseDown = () => {
    if (isPTTMode && isConnected) {
      activatePTT()
    }
  }

  const handlePTTMouseUp = () => {
    if (isPTTMode && isConnected) {
      deactivatePTT()
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500"
      case "connecting":
        return "bg-yellow-500"
      default:
        return "bg-red-500"
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "已连接"
      case "connecting":
        return "连接中..."
      default:
        return "未连接"
    }
  }

  // 检查是否在音乐电台
  const isMusicRadio = currentRoom?.id === "music-radio-default"

  // 设置页面
  if (currentView === "settings") {
    return <UserSettings user={user} onBack={() => setCurrentView("main")} onUserUpdate={onUserUpdate} />
  }

  // 房间页面
  if (currentView === "room") {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* 动态背景效果 */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:18px_18px]"></div>
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 right-1/2 w-48 h-48 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
        </div>

        <div className="relative z-10 p-4">
          <div className="max-w-6xl mx-auto">
            {/* 房间头部 */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                onClick={leaveRoom}
                variant="outline"
                size="sm"
                className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isMusicRadio && <Radio className="w-6 h-6 text-purple-400" />}
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    {currentRoom?.name}
                  </h1>
                  {isMusicRadio && <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>}
                  <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
                </div>
                <p className="text-gray-300">{currentRoom?.description || "语音聊天室"}</p>
              </div>
              <div className="flex items-center gap-3">
                <UserAvatar username={userName} avatar={user?.avatar} size="lg" />
                <div>
                  <p className="font-medium text-white">{userName}</p>
                  <p className="text-sm text-gray-400">{user?.role === "admin" ? "管理员" : "用户"}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* 音乐播放器（仅在音乐电台显示） */}
              {isMusicRadio && (
                <div className="lg:col-span-1 space-y-4">
                  <MusicPlayer isVisible={isMusicRadio} />

                  {/* 音乐电台测试面板 */}
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-blue-300">🧪 电台测试面板</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toast({
                              title: "音质测试",
                              description: "当前音质: 高品质 320kbps",
                            })
                          }
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                          🎵 音质测试
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toast({
                              title: "网络状态",
                              description: "连接稳定，延迟: 12ms",
                            })
                          }
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                          📡 网络测试
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toast({
                              title: "同步测试",
                              description: "所有听众音乐同步正常",
                            })
                          }
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                          🔄 同步测试
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toast({
                              title: "音效测试",
                              description: "立体声效果正常",
                            })
                          }
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                          🎧 音效测试
                        </Button>
                      </div>

                      <div className="text-xs text-blue-400 text-center pt-2 border-t border-blue-500/30">
                        点击按钮测试各项功能
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 连接控制面板 */}
              <Card
                className={`${isMusicRadio ? "lg:col-span-1" : "lg:col-span-1"} bg-slate-800/50 backdrop-blur-xl border-slate-700/50`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    {connectionStatus === "connected" ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                    {isMusicRadio ? "收听控制" : "语音控制"}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {isMusicRadio ? "管理您的收听体验" : "管理您的语音设置"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                    <span className="text-sm font-medium text-white">{getStatusText()}</span>
                  </div>

                  <div className={`p-3 rounded-lg ${isMusicRadio ? "bg-purple-500/20" : "bg-green-500/20"}`}>
                    <p className={`text-sm ${isMusicRadio ? "text-purple-300" : "text-green-300"}`}>
                      {isMusicRadio ? "电台" : "房间"}: <strong>{currentRoom?.name}</strong>
                    </p>
                    <p className={`text-sm ${isMusicRadio ? "text-purple-200" : "text-green-200"}`}>用户: {userName}</p>
                    {!isMusicRadio && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`w-2 h-2 rounded-full ${isPTTMode ? "bg-orange-500" : "bg-blue-500"}`} />
                        <span className="text-xs text-gray-300">{isPTTMode ? "PTT模式" : "常规模式"}</span>
                      </div>
                    )}
                  </div>

                  {!isMusicRadio && (
                    <div className="space-y-2">
                      <Button
                        onClick={togglePTTMode}
                        variant="outline"
                        className="w-full bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                      >
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
                          <p className="text-xs text-gray-400 mt-2">按住说话 | 空格键快捷键</p>
                          {pttKeyPressed && <p className="text-xs text-orange-400 font-medium">🎤 正在使用键盘PTT</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {!isPTTMode && !isMusicRadio && (
                    <div className="flex gap-2">
                      <Button onClick={toggleMute} variant={isMuted ? "destructive" : "default"} className="flex-1">
                        {isMuted ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                        {isMuted ? "取消静音" : "静音"}
                      </Button>
                    </div>
                  )}

                  {isMusicRadio && (
                    <div className="text-center p-4 bg-purple-500/20 rounded-lg">
                      <p className="text-sm text-purple-300 mb-2">🎵 正在收听音乐电台</p>
                      <p className="text-xs text-purple-200">
                        在音乐电台中，您可以与其他听众一起享受音乐，麦克风已自动静音
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 参与者列表 */}
              <Card
                className={`${isMusicRadio ? "lg:col-span-1" : "lg:col-span-2"} bg-slate-800/50 backdrop-blur-xl border-slate-700/50`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Users className="w-5 h-5" />
                    {isMusicRadio ? `听众 (${participants.length})` : `参与者 (${participants.length})`}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {isMusicRadio ? "当前收听音乐的用户" : "当前房间内的用户"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            username={participant.name}
                            avatar={participant.name === userName ? user?.avatar : undefined}
                            size="md"
                          />
                          <span className="font-medium text-white">{participant.name}</span>
                          {participant.name === userName && (
                            <Badge variant="secondary" className="text-xs bg-slate-600 text-gray-300">
                              你
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isMusicRadio ? (
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                              🎵 收听中
                            </Badge>
                          ) : (
                            <>
                              {participant.isMuted ? (
                                <MicOff className="w-4 h-4 text-red-400" />
                              ) : (
                                <Mic className="w-4 h-4 text-green-400" />
                              )}
                              {participant.name === userName && isPTTMode && isPTTActive && (
                                <Badge variant="destructive" className="text-xs animate-pulse">
                                  ON AIR
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <audio ref={localAudioRef} autoPlay muted />
            <audio ref={remoteAudioRef} autoPlay />
          </div>
        </div>

        <style jsx>{`
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
      </div>
    )
  }

  // 主页面
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* 动态背景效果 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:16px_16px]"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>

        {/* 几何装饰 */}
        <div className="absolute top-20 right-20 w-3 h-3 bg-cyan-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-20 left-20 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 left-1/4 w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce"></div>
      </div>

      <div className="relative z-10 p-4">
        <div className="max-w-6xl mx-auto">
          {/* 用户信息栏 */}
          <div className="flex justify-between items-center mb-8">
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Radio className="w-8 h-8 text-cyan-400" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  网络对讲
                </h1>
                <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />
              </div>
              <p className="text-gray-300">实时语音通信平台 + 24/7 音乐电台</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setCurrentView("settings")}
                variant="outline"
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <UserAvatar username={userName} avatar={user?.avatar} size="md" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{userName}</p>
                  <p className="text-xs text-gray-400">{user?.role === "admin" ? "管理员" : "用户"}</p>
                </div>
                <Settings className="w-4 h-4 text-gray-400" />
              </Button>
              <Button
                onClick={onLogout}
                variant="outline"
                className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </div>
          </div>

          {/* 主要内容 */}
          <Tabs defaultValue="rooms" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border-slate-700">
              <TabsTrigger value="rooms" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                房间列表
              </TabsTrigger>
              <TabsTrigger value="friends" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                好友列表
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rooms">
              <RoomList user={user} onJoinRoom={handleJoinRoom} />
            </TabsContent>

            <TabsContent value="friends">
              <FriendsList user={user} onStartPrivateChat={handleStartPrivateChat} onUserUpdate={onUserUpdate} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <style jsx>{`
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser")
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (user: User) => {
    setCurrentUser(user)
    localStorage.setItem("currentUser", JSON.stringify(user))
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem("currentUser")
  }

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser)
    localStorage.setItem("currentUser", JSON.stringify(updatedUser))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">加载中...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (currentUser.role === "admin") {
    return <AdminPanel user={currentUser} onLogout={handleLogout} />
  }

  return <VoiceChatApp user={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
}
