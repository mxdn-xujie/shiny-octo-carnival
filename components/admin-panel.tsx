"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/types/user"
import {
  Users,
  UserPlus,
  LogOut,
  Shield,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Activity,
  Zap,
  Crown,
} from "lucide-react"
import UserAvatar from "@/components/user-avatar"

interface AdminPanelProps {
  user: User
  onLogout: () => void
}

export default function AdminPanel({ user, onLogout }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
  })
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = () => {
    const savedUsers: User[] = JSON.parse(localStorage.getItem("users") || "[]")
    setUsers(savedUsers)
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()

    const userExists = users.some((u) => u.username === newUserForm.username || u.email === newUserForm.email)

    if (userExists) {
      toast({
        title: "创建失败",
        description: "用户名或邮箱已存在",
        variant: "destructive",
      })
      return
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      username: newUserForm.username,
      email: newUserForm.email,
      password: newUserForm.password,
      role: newUserForm.role,
      status: "active",
      createdAt: new Date().toISOString(),
      friends: [],
    }

    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    localStorage.setItem("users", JSON.stringify(updatedUsers))

    toast({
      title: "用户创建成功",
      description: `用户 ${newUser.username} 已创建`,
    })

    setNewUserForm({ username: "", email: "", password: "", role: "user" })
    setIsCreateDialogOpen(false)
  }

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    const updatedUsers = users.map((u) => (u.id === editingUser.id ? editingUser : u))
    setUsers(updatedUsers)
    localStorage.setItem("users", JSON.stringify(updatedUsers))

    toast({
      title: "用户更新成功",
      description: `用户 ${editingUser.username} 信息已更新`,
    })

    setEditingUser(null)
    setIsEditDialogOpen(false)
  }

  const handleDeleteUser = (userId: string) => {
    if (userId === user.id) {
      toast({
        title: "操作失败",
        description: "不能删除当前登录的管理员账号",
        variant: "destructive",
      })
      return
    }

    const updatedUsers = users.filter((u) => u.id !== userId)
    setUsers(updatedUsers)
    localStorage.setItem("users", JSON.stringify(updatedUsers))

    toast({
      title: "用户删除成功",
      description: "用户已从系统中删除",
    })
  }

  const handleToggleUserStatus = (userId: string) => {
    if (userId === user.id) {
      toast({
        title: "操作失败",
        description: "不能禁用当前登录的管理员账号",
        variant: "destructive",
      })
      return
    }

    const updatedUsers = users.map((u) =>
      u.id === userId ? ({ ...u, status: u.status === "active" ? "inactive" : "active" } as User) : u,
    )
    setUsers(updatedUsers)
    localStorage.setItem("users", JSON.stringify(updatedUsers))

    const targetUser = updatedUsers.find((u) => u.id === userId)
    toast({
      title: "状态更新成功",
      description: `用户已${targetUser?.status === "active" ? "启用" : "禁用"}`,
    })
  }

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">活跃</Badge>
    ) : (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">禁用</Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
        <Crown className="w-3 h-3 mr-1" />
        管理员
      </Badge>
    ) : (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">用户</Badge>
    )
  }

  const activeUsers = users.filter((u) => u.status === "active")
  const totalUsers = users.length
  const adminUsers = users.filter((u) => u.role === "admin")

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* 动态背景效果 */}
      <div className="absolute inset-0">
        {/* 网格背景 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:20px_20px]"></div>

        {/* 发光效果 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>

        {/* 几何装饰 */}
        <div className="absolute top-20 right-20 w-4 h-4 bg-cyan-400 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-20 left-20 w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
      </div>

      <div className="relative z-10 p-4">
        <div className="max-w-6xl mx-auto">
          {/* 头部 */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-purple-400" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  管理员面板
                </h1>
                <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />
              </div>
              <p className="text-gray-300">
                欢迎回来，<span className="text-purple-400 font-semibold">{user.username}</span>
              </p>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
          </div>

          {/* 统计卡片 */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">总用户数</p>
                    <p className="text-2xl font-bold text-white">{totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-green-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">活跃用户</p>
                    <p className="text-2xl font-bold text-white">{activeUsers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Crown className="h-8 w-8 text-purple-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">管理员</p>
                    <p className="text-2xl font-bold text-white">{adminUsers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Settings className="h-8 w-8 text-orange-400" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">系统状态</p>
                    <p className="text-2xl font-bold text-green-400">正常</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 主要内容 */}
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="bg-slate-800/50 border-slate-700">
              <TabsTrigger value="users" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                用户管理
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                系统设置
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-white">用户管理</CardTitle>
                      <CardDescription className="text-gray-400">管理系统中的所有用户账号</CardDescription>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                          <UserPlus className="w-4 h-4 mr-2" />
                          新增用户
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-800 border-slate-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">创建新用户</DialogTitle>
                          <DialogDescription className="text-gray-400">填写用户信息创建新账号</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-username" className="text-gray-300">
                              用户名
                            </Label>
                            <Input
                              id="new-username"
                              value={newUserForm.username}
                              onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                              className="bg-slate-700 border-slate-600 text-white"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-email" className="text-gray-300">
                              邮箱
                            </Label>
                            <Input
                              id="new-email"
                              type="email"
                              value={newUserForm.email}
                              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                              className="bg-slate-700 border-slate-600 text-white"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-password" className="text-gray-300">
                              密码
                            </Label>
                            <Input
                              id="new-password"
                              type="password"
                              value={newUserForm.password}
                              onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                              className="bg-slate-700 border-slate-600 text-white"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-role" className="text-gray-300">
                              角色
                            </Label>
                            <Select
                              value={newUserForm.role}
                              onValueChange={(value: "admin" | "user") =>
                                setNewUserForm({ ...newUserForm, role: value })
                              }
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-700 border-slate-600">
                                <SelectItem value="user">普通用户</SelectItem>
                                <SelectItem value="admin">管理员</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                            创建用户
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/50"
                      >
                        <div className="flex items-center space-x-4">
                          <UserAvatar username={u.username} avatar={u.avatar} size="lg" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-white">{u.username}</h3>
                              {getRoleBadge(u.role)}
                              {getStatusBadge(u.status)}
                            </div>
                            <p className="text-sm text-gray-400">{u.email}</p>
                            <p className="text-xs text-gray-500">
                              创建时间: {new Date(u.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(u.id)}
                            disabled={u.id === user.id}
                            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                          >
                            {u.status === "active" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUser(u)}
                                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-800 border-slate-700">
                              <DialogHeader>
                                <DialogTitle className="text-white">编辑用户</DialogTitle>
                                <DialogDescription className="text-gray-400">修改用户信息</DialogDescription>
                              </DialogHeader>
                              {editingUser && (
                                <form onSubmit={handleEditUser} className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-username" className="text-gray-300">
                                      用户名
                                    </Label>
                                    <Input
                                      id="edit-username"
                                      value={editingUser.username}
                                      onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                                      className="bg-slate-700 border-slate-600 text-white"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-email" className="text-gray-300">
                                      邮箱
                                    </Label>
                                    <Input
                                      id="edit-email"
                                      type="email"
                                      value={editingUser.email}
                                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                      className="bg-slate-700 border-slate-600 text-white"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-role" className="text-gray-300">
                                      角色
                                    </Label>
                                    <Select
                                      value={editingUser.role}
                                      onValueChange={(value: "admin" | "user") =>
                                        setEditingUser({ ...editingUser, role: value })
                                      }
                                    >
                                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-700 border-slate-600">
                                        <SelectItem value="user">普通用户</SelectItem>
                                        <SelectItem value="admin">管理员</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                                    更新用户
                                  </Button>
                                </form>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={u.id === user.id}
                            className="bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">系统设置</CardTitle>
                  <CardDescription className="text-gray-400">配置系统参数和选项</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                      <h3 className="font-medium mb-2 text-white">数据管理</h3>
                      <p className="text-sm text-gray-400 mb-4">管理系统数据和备份</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const data = {
                              users: localStorage.getItem("users"),
                              timestamp: new Date().toISOString(),
                            }
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement("a")
                            a.href = url
                            a.download = `backup-${new Date().toISOString().split("T")[0]}.json`
                            a.click()
                            URL.revokeObjectURL(url)
                            toast({ title: "备份成功", description: "数据已导出" })
                          }}
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                          导出数据
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (confirm("确定要清空所有用户数据吗？此操作不可恢复！")) {
                              localStorage.removeItem("users")
                              setUsers([])
                              toast({ title: "数据已清空", description: "所有用户数据已删除" })
                            }
                          }}
                          className="bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30"
                        >
                          清空数据
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  )
}
