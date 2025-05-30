"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { User, Room } from "@/types/user"
import { Plus, Users, Lock, Unlock, Calendar, Radio, Music, Star, Headphones } from "lucide-react"
import UserAvatar from "@/components/user-avatar"

interface RoomListProps {
  user: User
  onJoinRoom: (room: Room, password?: string) => void
}

export default function RoomList({ user, onJoinRoom }: RoomListProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [roomPassword, setRoomPassword] = useState("")
  const [newRoom, setNewRoom] = useState({
    name: "",
    description: "",
    hasPassword: false,
    password: "",
    maxParticipants: 10,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [encryptionKeys, setEncryptionKeys] = useState<{ [roomId: string]: CryptoKey }>({})

  const { toast } = useToast()

  // 更新的音乐电台频道 - 现在有更丰富的音乐内容
  const musicRadioRoom: Room = {
    id: "music-radio-default",
    name: "🎵 免费音乐电台",
    description: "24/7 免费流行音乐播放 - 15首精选热门歌曲 | 当前播放: Blinding Lights - The Weeknd",
    createdBy: "system",
    createdByName: "音乐系统",
    participants: [
      "demo-user-1",
      "demo-user-2",
      "demo-user-3",
      "demo-user-4",
      "demo-user-5",
      "demo-user-6",
      "demo-user-7",
    ],
    isActive: true,
    hasPassword: false,
    maxParticipants: 100,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  }

  useEffect(() => {
    loadRooms()
    // 定期清理过期的房间
    const cleanupInterval = setInterval(cleanupInactiveRooms, 60 * 60 * 1000) // 每小时清理
    return () => clearInterval(cleanupInterval)
  }, [])

  const loadRooms = () => {
    const savedRooms: Room[] = JSON.parse(localStorage.getItem("rooms") || "[]")
    const sortedRooms = savedRooms.sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
    )
    setRooms(sortedRooms)
  }

  const cleanupInactiveRooms = () => {
    const savedRooms: Room[] = JSON.parse(localStorage.getItem("rooms") || "[]")
    const now = new Date().getTime()
    const INACTIVE_THRESHOLD = 24 * 60 * 60 * 1000 // 24小时无活动的房间

    const activeRooms = savedRooms.filter((room) => {
      const lastActivity = new Date(room.lastActivity).getTime()
      return now - lastActivity < INACTIVE_THRESHOLD
    })

    if (activeRooms.length !== savedRooms.length) {
      localStorage.setItem("rooms", JSON.stringify(activeRooms))
      setRooms(activeRooms)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!newRoom.name.trim()) {
        toast({
          title: "创建失败",
          description: "请输入房间名称",
          variant: "destructive",
        })
        return
      }

      // 生成房间加密密钥
      const encryptionKey = await generateRoomKey()
      const roomId = `room-${Date.now()}`

      const room: Room = {
        id: roomId,
        name: newRoom.name.trim(),
        description: newRoom.description.trim(),
        createdBy: user.id,
        createdByName: user.username,
        participants: [],
        isActive: true,
        hasPassword: newRoom.hasPassword,
        password: newRoom.hasPassword ? newRoom.password : undefined,
        maxParticipants: newRoom.maxParticipants,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        encryptionKey: await crypto.subtle.exportKey("jwk", encryptionKey),
        tokenRequired: true,
        allowedUsers: [user.id],
      }

      const updatedRooms = [...rooms, room]
      setRooms(updatedRooms)
      localStorage.setItem("rooms", JSON.stringify(updatedRooms))

      // 保存加密密钥
      setEncryptionKeys((prev) => ({
        ...prev,
        [roomId]: encryptionKey,
      }))

      toast({
        title: "房间创建成功",
        description: `房间 "${room.name}" 已创建`,
      })

      setNewRoom({
        name: "",
        description: "",
        hasPassword: false,
        password: "",
        maxParticipants: 10,
      })
      setIsCreateDialogOpen(false)

      // 使用加密密钥加入房间
      onJoinRoom(room, room.password, encryptionKey)
    } catch (error) {
      console.error("创建房间失败:", error)
      toast({
        title: "创建失败",
        description: "创建房间时发生错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async (room: Room) => {
    if (!room.allowedUsers?.includes(user.id) && room.tokenRequired) {
      // 验证用户token
      if (!user.authToken || !(await verifyToken(user.authToken))) {
        toast({
          title: "访问受限",
          description: "您需要重新登录以获取有效的访问令牌",
          variant: "destructive",
        })
        return
      }
    }

    if (room.hasPassword) {
      setSelectedRoom(room)
      setRoomPassword("")
      setIsPasswordDialogOpen(true)
    } else {
      try {
        setIsLoading(true)
        // 导入房间加密密钥
        const encryptionKey = await crypto.subtle.importKey(
          "jwk",
          room.encryptionKey!,
          { name: "AES-GCM", length: 256 },
          true,
          ["encrypt", "decrypt"],
        )

        setEncryptionKeys((prev) => ({
          ...prev,
          [room.id]: encryptionKey,
        }))

        onJoinRoom(room, undefined, encryptionKey)
      } catch (error) {
        console.error("加入房间失败:", error)
        toast({
          title: "加入失败",
          description: "无法加入房间，请稍后重试",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoom) return
    setIsLoading(true)

    try {
      if (selectedRoom.password === roomPassword) {
        // 导入房间加密密钥
        const encryptionKey = await crypto.subtle.importKey(
          "jwk",
          selectedRoom.encryptionKey!,
          { name: "AES-GCM", length: 256 },
          true,
          ["encrypt", "decrypt"],
        )

        setEncryptionKeys((prev) => ({
          ...prev,
          [selectedRoom.id]: encryptionKey,
        }))

        onJoinRoom(selectedRoom, roomPassword, encryptionKey)
        setIsPasswordDialogOpen(false)
        setSelectedRoom(null)
        setRoomPassword("")
      } else {
        toast({
          title: "密码错误",
          description: "请输入正确的房间密码",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("验证密码失败:", error)
      toast({
        title: "验证失败",
        description: "密码验证过程中发生错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "刚刚"
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString()
  }

  const allRooms = [musicRadioRoom, ...rooms]

  return (
    <div className="space-y-6">
      {/* 创建房间按钮 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">房间列表</h2>
          <p className="text-gray-300">选择房间开始语音通话，或收听免费音乐电台</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="w-4 h-4 mr-2" />
              创建房间
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">创建新房间</DialogTitle>
              <DialogDescription className="text-gray-400">设置房间信息并创建语音聊天室</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-name" className="text-gray-300">
                  房间名称 *
                </Label>
                <Input
                  id="room-name"
                  placeholder="输入房间名称"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-description" className="text-gray-300">
                  房间描述
                </Label>
                <Textarea
                  id="room-description"
                  placeholder="输入房间描述（可选）"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-participants" className="text-gray-300">
                  最大参与者数量
                </Label>
                <Input
                  id="max-participants"
                  type="number"
                  min="2"
                  max="50"
                  value={newRoom.maxParticipants}
                  onChange={(e) => setNewRoom({ ...newRoom, maxParticipants: Number.parseInt(e.target.value) || 10 })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="has-password"
                  checked={newRoom.hasPassword}
                  onCheckedChange={(checked) => setNewRoom({ ...newRoom, hasPassword: checked })}
                />
                <Label htmlFor="has-password" className="text-gray-300">
                  设置房间密码
                </Label>
              </div>
              {newRoom.hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="room-password" className="text-gray-300">
                    房间密码
                  </Label>
                  <Input
                    id="room-password"
                    type="password"
                    placeholder="输入房间密码"
                    value={newRoom.password}
                    onChange={(e) => setNewRoom({ ...newRoom, password: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    required={newRoom.hasPassword}
                  />
                </div>
              )}
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
                {isLoading ? "创建中..." : "创建房间"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 房间列表 */}
      <div className="grid gap-4">
        {allRooms.length === 1 ? (
          <div className="space-y-4">
            {/* 音乐电台卡片 */}
            <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Radio className="w-5 h-5 text-purple-400" />
                      <h3 className="text-lg font-semibold text-white">{musicRadioRoom.name}</h3>
                      <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
                      <Badge className="bg-green-500 text-white">FREE</Badge>
                      <Star className="w-4 h-4 text-yellow-400" />
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{musicRadioRoom.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Music className="w-4 h-4" />
                        <span>免费音乐库</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Headphones className="w-4 h-4" />
                        <span>{musicRadioRoom.participants.length} 人在听</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-green-400 animate-pulse">🎵 15首热门歌曲</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">📻 320kbps高音质</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">免费收听</Badge>
                    <Button
                      onClick={() => handleJoinRoom(musicRadioRoom)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Radio className="w-4 h-4 mr-2" />
                      收听音乐
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 创建房间提示 */}
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-white mb-2">暂无语音房间</h3>
                <p className="text-gray-400 mb-4">创建第一个房间开始语音聊天，或收听上方的免费音乐电台</p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  创建房间
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          allRooms.map((room) => (
            <Card
              key={room.id}
              className={`hover:shadow-md transition-shadow cursor-pointer ${
                room.id === "music-radio-default"
                  ? "border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
                  : "bg-slate-800/50 border-slate-700/50"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {room.id === "music-radio-default" && <Radio className="w-5 h-5 text-purple-400" />}
                      <h3 className="text-lg font-semibold text-white">{room.name}</h3>
                      {room.id === "music-radio-default" && (
                        <>
                          <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
                          <Badge className="bg-green-500 text-white">FREE</Badge>
                          <Star className="w-4 h-4 text-yellow-400" />
                        </>
                      )}
                      {room.hasPassword && room.id !== "music-radio-default" && (
                        <Lock className="w-4 h-4 text-gray-400" />
                      )}
                      {!room.hasPassword && room.id !== "music-radio-default" && (
                        <Unlock className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    {room.description && <p className="text-gray-300 text-sm mb-2">{room.description}</p>}
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        {room.id === "music-radio-default" ? (
                          <Music className="w-4 h-4" />
                        ) : (
                          <UserAvatar username={room.createdByName} size="sm" />
                        )}
                        <span>
                          {room.id === "music-radio-default" ? "免费音乐库" : `创建者: ${room.createdByName}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>
                          {room.id === "music-radio-default"
                            ? `${room.participants.length} 人在听`
                            : `${room.participants.length}/${room.maxParticipants}`}
                        </span>
                      </div>
                      {room.id !== "music-radio-default" && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(room.lastActivity)}</span>
                        </div>
                      )}
                      {room.id === "music-radio-default" && (
                        <div className="flex items-center gap-1">
                          <span className="text-green-400 animate-pulse">🎵 15首热门歌曲</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {room.id === "music-radio-default" ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">免费收听</Badge>
                    ) : room.participants.length >= room.maxParticipants ? (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">已满</Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">可加入</Badge>
                    )}
                    <Button
                      onClick={() => handleJoinRoom(room)}
                      disabled={room.id !== "music-radio-default" && room.participants.length >= room.maxParticipants}
                      className={
                        room.id === "music-radio-default"
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      }
                    >
                      {room.id === "music-radio-default" ? (
                        <>
                          <Radio className="w-4 h-4 mr-2" />
                          收听音乐
                        </>
                      ) : (
                        "加入房间"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 密码输入对话框 */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">输入房间密码</DialogTitle>
            <DialogDescription className="text-gray-400">
              房间 "{selectedRoom?.name}" 需要密码才能加入
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="输入房间密码"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
                className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                取消
              </Button>
              <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                加入房间
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
