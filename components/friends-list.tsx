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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import type { User, FriendRequest } from "@/types/user"
import { UserPlus, Users, Check, X, MessageCircle, Trash2 } from "lucide-react"
import UserAvatar from "@/components/user-avatar"

interface FriendsListProps {
  user: User
  onStartPrivateChat: (friendId: string, friendName: string) => void
  onUserUpdate: (updatedUser: User) => void
}

export default function FriendsList({ user, onStartPrivateChat, onUserUpdate }: FriendsListProps) {
  const [friends, setFriends] = useState<User[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [isAddFriendDialogOpen, setIsAddFriendDialogOpen] = useState(false)
  const [searchUsername, setSearchUsername] = useState("")

  const { toast } = useToast()

  useEffect(() => {
    loadFriends()
    loadFriendRequests()
  }, [user.id])

  const loadFriends = () => {
    const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
    const currentUser = users.find((u) => u.id === user.id)
    if (currentUser?.friends) {
      const friendUsers = users.filter((u) => currentUser.friends.includes(u.id))
      setFriends(friendUsers)
    }
  }

  const loadFriendRequests = () => {
    const requests: FriendRequest[] = JSON.parse(localStorage.getItem("friendRequests") || "[]")
    const userRequests = requests.filter((req) => req.toUserId === user.id && req.status === "pending")
    setFriendRequests(userRequests)
  }

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchUsername.trim()) {
      toast({
        title: "请输入用户名",
        description: "请输入要添加的好友用户名",
        variant: "destructive",
      })
      return
    }

    const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
    const targetUser = users.find((u) => u.username === searchUsername.trim() && u.status === "active")

    if (!targetUser) {
      toast({
        title: "用户不存在",
        description: "找不到该用户名或用户已被禁用",
        variant: "destructive",
      })
      return
    }

    if (targetUser.id === user.id) {
      toast({
        title: "无法添加自己",
        description: "不能添加自己为好友",
        variant: "destructive",
      })
      return
    }

    // 检查是否已经是好友
    if (user.friends?.includes(targetUser.id)) {
      toast({
        title: "已经是好友",
        description: "该用户已经在您的好友列表中",
        variant: "destructive",
      })
      return
    }

    // 检查是否已经发送过请求
    const existingRequests: FriendRequest[] = JSON.parse(localStorage.getItem("friendRequests") || "[]")
    const existingRequest = existingRequests.find(
      (req) => req.fromUserId === user.id && req.toUserId === targetUser.id && req.status === "pending",
    )

    if (existingRequest) {
      toast({
        title: "请求已发送",
        description: "您已经向该用户发送过好友请求",
        variant: "destructive",
      })
      return
    }

    // 创建好友请求
    const friendRequest: FriendRequest = {
      id: `req-${Date.now()}`,
      fromUserId: user.id,
      fromUserName: user.username,
      toUserId: targetUser.id,
      toUserName: targetUser.username,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    const updatedRequests = [...existingRequests, friendRequest]
    localStorage.setItem("friendRequests", JSON.stringify(updatedRequests))

    toast({
      title: "好友请求已发送",
      description: `已向 ${targetUser.username} 发送好友请求`,
    })

    setSearchUsername("")
    setIsAddFriendDialogOpen(false)
  }

  const handleAcceptFriend = (request: FriendRequest) => {
    const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")

    // 更新两个用户的好友列表
    const updatedUsers = users.map((u) => {
      if (u.id === user.id) {
        const updatedUser = { ...u, friends: [...(u.friends || []), request.fromUserId] }
        if (u.id === user.id) {
          onUserUpdate(updatedUser)
        }
        return updatedUser
      }
      if (u.id === request.fromUserId) {
        return { ...u, friends: [...(u.friends || []), user.id] }
      }
      return u
    })

    localStorage.setItem("users", JSON.stringify(updatedUsers))

    // 更新当前用户信息
    const currentUser = updatedUsers.find((u) => u.id === user.id)
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser))
    }

    // 更新好友请求状态
    const requests: FriendRequest[] = JSON.parse(localStorage.getItem("friendRequests") || "[]")
    const updatedRequests = requests.map((req) =>
      req.id === request.id ? { ...req, status: "accepted" as const } : req,
    )
    localStorage.setItem("friendRequests", JSON.stringify(updatedRequests))

    toast({
      title: "好友添加成功",
      description: `${request.fromUserName} 已成为您的好友`,
    })

    loadFriends()
    loadFriendRequests()
  }

  const handleRejectFriend = (request: FriendRequest) => {
    const requests: FriendRequest[] = JSON.parse(localStorage.getItem("friendRequests") || "[]")
    const updatedRequests = requests.map((req) =>
      req.id === request.id ? { ...req, status: "rejected" as const } : req,
    )
    localStorage.setItem("friendRequests", JSON.stringify(updatedRequests))

    toast({
      title: "已拒绝好友请求",
      description: `已拒绝 ${request.fromUserName} 的好友请求`,
    })

    loadFriendRequests()
  }

  const handleDeleteFriend = (friendId: string, friendName: string) => {
    const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")

    // 从两个用户的好友列表中移除对方
    const updatedUsers = users.map((u) => {
      if (u.id === user.id) {
        const updatedUser = { ...u, friends: (u.friends || []).filter((id) => id !== friendId) }
        onUserUpdate(updatedUser)
        return updatedUser
      }
      if (u.id === friendId) {
        return { ...u, friends: (u.friends || []).filter((id) => id !== user.id) }
      }
      return u
    })

    localStorage.setItem("users", JSON.stringify(updatedUsers))

    // 更新当前用户信息
    const currentUser = updatedUsers.find((u) => u.id === user.id)
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser))
    }

    toast({
      title: "好友已删除",
      description: `已将 ${friendName} 从好友列表中移除`,
    })

    loadFriends()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">好友列表</h2>
          <p className="text-gray-600">管理您的好友和私聊</p>
        </div>
        <Dialog open={isAddFriendDialogOpen} onOpenChange={setIsAddFriendDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              添加好友
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加好友</DialogTitle>
              <DialogDescription>输入用户名添加新好友</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddFriend} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  placeholder="输入要添加的用户名"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                发送好友请求
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="friends" className="w-full">
        <TabsList>
          <TabsTrigger value="friends">好友 ({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">好友请求 ({friendRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <div className="space-y-4">
            {friends.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无好友</h3>
                  <p className="text-gray-500 mb-4">添加好友开始私聊</p>
                  <Button onClick={() => setIsAddFriendDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    添加好友
                  </Button>
                </CardContent>
              </Card>
            ) : (
              friends.map((friend) => (
                <Card key={friend.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar username={friend.username} avatar={friend.avatar} size="lg" />
                        <div>
                          <h3 className="font-medium text-gray-900">{friend.username}</h3>
                          <p className="text-sm text-gray-500">{friend.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={friend.status === "active" ? "default" : "secondary"}>
                          {friend.status === "active" ? "在线" : "离线"}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => onStartPrivateChat(friend.id, friend.username)}
                          disabled={friend.status !== "active"}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          私聊
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>删除好友</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除好友 "{friend.username}" 吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteFriend(friend.id, friend.username)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-4">
            {friendRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无好友请求</h3>
                  <p className="text-gray-500">当有人向您发送好友请求时会显示在这里</p>
                </CardContent>
              </Card>
            ) : (
              friendRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar username={request.fromUserName} size="lg" />
                        <div>
                          <h3 className="font-medium text-gray-900">{request.fromUserName}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(request.createdAt).toLocaleDateString()} 发送好友请求
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleAcceptFriend(request)}>
                          <Check className="w-4 h-4 mr-2" />
                          接受
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRejectFriend(request)}>
                          <X className="w-4 h-4 mr-2" />
                          拒绝
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
