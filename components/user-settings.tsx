"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import UserAvatar from "@/components/user-avatar"
import type { User } from "@/types/user"
import { ArrowLeft, UserIcon, Lock, Save, Camera, Upload, X, Shield, Zap, Settings } from "lucide-react"

interface UserSettingsProps {
  user: User
  onBack: () => void
  onUserUpdate: (updatedUser: User) => void
}

export default function UserSettings({ user, onBack, onUserUpdate }: UserSettingsProps) {
  const [profileForm, setProfileForm] = useState({
    username: user.username,
    email: user.email,
    currentPassword: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [avatarForm, setAvatarForm] = useState({
    currentPassword: "",
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar || null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "文件类型错误",
        description: "请选择图片文件",
        variant: "destructive",
      })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "头像文件大小不能超过2MB",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setAvatarPreview(result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleAvatarUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (avatarForm.currentPassword !== user.password) {
        toast({
          title: "密码错误",
          description: "请输入正确的当前密码",
          variant: "destructive",
        })
        return
      }

      if (avatarPreview === user.avatar) {
        toast({
          title: "无需更新",
          description: "头像没有变化",
          variant: "destructive",
        })
        return
      }

      const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
      const updatedUser = {
        ...user,
        avatar: avatarPreview || undefined,
      }

      const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u))
      localStorage.setItem("users", JSON.stringify(updatedUsers))
      localStorage.setItem("currentUser", JSON.stringify(updatedUser))

      onUserUpdate(updatedUser)
      setAvatarForm({ currentPassword: "" })

      toast({
        title: "头像更新成功",
        description: "您的头像已成功更新",
      })
    } catch (error) {
      toast({
        title: "更新失败",
        description: "头像更新过程中发生错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (profileForm.currentPassword !== user.password) {
        toast({
          title: "密码错误",
          description: "请输入正确的当前密码",
          variant: "destructive",
        })
        return
      }

      if (!profileForm.username.trim() || !profileForm.email.trim()) {
        toast({
          title: "更新失败",
          description: "用户名和邮箱不能为空",
          variant: "destructive",
        })
        return
      }

      if (profileForm.username.trim() === user.username && profileForm.email.trim() === user.email) {
        toast({
          title: "无需更新",
          description: "个人信息没有变化",
          variant: "destructive",
        })
        return
      }

      const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
      const existingUser = users.find((u) => u.username === profileForm.username.trim() && u.id !== user.id)
      const existingEmail = users.find((u) => u.email === profileForm.email.trim() && u.id !== user.id)

      if (existingUser) {
        toast({
          title: "更新失败",
          description: "该用户名已被使用",
          variant: "destructive",
        })
        return
      }

      if (existingEmail) {
        toast({
          title: "更新失败",
          description: "该邮箱已被使用",
          variant: "destructive",
        })
        return
      }

      const updatedUser = {
        ...user,
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
      }

      const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u))
      localStorage.setItem("users", JSON.stringify(updatedUsers))
      localStorage.setItem("currentUser", JSON.stringify(updatedUser))

      onUserUpdate(updatedUser)
      setProfileForm({
        username: updatedUser.username,
        email: updatedUser.email,
        currentPassword: "",
      })

      toast({
        title: "个人信息更新成功",
        description: "您的个人信息已成功更新",
      })
    } catch (error) {
      toast({
        title: "更新失败",
        description: "更新过程中发生错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (passwordForm.currentPassword !== user.password) {
        toast({
          title: "密码错误",
          description: "当前密码不正确",
          variant: "destructive",
        })
        return
      }

      if (passwordForm.newPassword.length < 6) {
        toast({
          title: "密码太短",
          description: "新密码至少需要6个字符",
          variant: "destructive",
        })
        return
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast({
          title: "密码不匹配",
          description: "两次输入的新密码不一致",
          variant: "destructive",
        })
        return
      }

      if (passwordForm.newPassword === passwordForm.currentPassword) {
        toast({
          title: "密码相同",
          description: "新密码不能与当前密码相同",
          variant: "destructive",
        })
        return
      }

      const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
      const updatedUser = {
        ...user,
        password: passwordForm.newPassword,
      }

      const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u))
      localStorage.setItem("users", JSON.stringify(updatedUsers))
      localStorage.setItem("currentUser", JSON.stringify(updatedUser))

      onUserUpdate(updatedUser)
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast({
        title: "密码更新成功",
        description: "您的密码已成功更新",
      })
    } catch (error) {
      toast({
        title: "更新失败",
        description: "密码更新过程中发生错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* 动态背景效果 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:16px_16px]"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 p-4">
        <div className="max-w-4xl mx-auto">
          {/* 头部 */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              onClick={onBack}
              variant="outline"
              size="sm"
              className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-6 h-6 text-blue-400" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  个人设置
                </h1>
                <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
              </div>
              <p className="text-gray-300">管理您的个人信息和账号设置</p>
            </div>
          </div>

          {/* 用户信息卡片 */}
          <Card className="mb-6 bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <UserAvatar username={user.username} avatar={avatarPreview || user.avatar} size="xl" />
                <div>
                  <h2 className="text-xl font-semibold text-white">{user.username}</h2>
                  <p className="text-gray-300">{user.email}</p>
                  <p className="text-sm text-gray-400">
                    {user.role === "admin" ? "管理员" : "用户"} • 注册时间:{" "}
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 安全提示 */}
          <Card className="mb-6 bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="font-medium text-orange-300">安全提示</h3>
                  <p className="text-sm text-orange-200">为了保护您的账号安全，修改个人信息前需要验证当前密码</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 设置选项卡 */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-slate-700">
              <TabsTrigger value="profile" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                个人信息
              </TabsTrigger>
              <TabsTrigger value="avatar" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                头像设置
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                安全设置
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <UserIcon className="w-5 h-5" />
                    个人信息
                  </CardTitle>
                  <CardDescription className="text-gray-400">更新您的个人资料信息（需要密码验证）</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-gray-300">
                        用户名
                      </Label>
                      <Input
                        id="username"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        placeholder="输入用户名"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">
                        邮箱地址
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        placeholder="输入邮箱地址"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-current-password" className="flex items-center gap-2 text-gray-300">
                        <Lock className="w-4 h-4" />
                        当前密码 *
                      </Label>
                      <Input
                        id="profile-current-password"
                        type="password"
                        value={profileForm.currentPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                        placeholder="输入当前密码以确认更改"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                        required
                      />
                      <p className="text-xs text-gray-500">为了安全起见，修改个人信息需要验证当前密码</p>
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? "保存中..." : "保存更改"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="avatar">
              <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Camera className="w-5 h-5" />
                    头像设置
                  </CardTitle>
                  <CardDescription className="text-gray-400">上传或更改您的个人头像（需要密码验证）</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAvatarUpdate} className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center gap-3">
                        <UserAvatar username={user.username} avatar={avatarPreview || user.avatar} size="xl" />
                        <p className="text-sm text-gray-400">当前头像</p>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            上传头像
                          </Button>
                          {(avatarPreview || user.avatar) && (
                            <Button
                              type="button"
                              onClick={handleRemoveAvatar}
                              variant="outline"
                              size="icon"
                              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <div className="text-sm text-gray-400">
                          <p>• 支持 JPG、PNG、GIF 格式</p>
                          <p>• 文件大小不超过 2MB</p>
                          <p>• 建议尺寸 200x200 像素</p>
                        </div>
                      </div>
                    </div>

                    {avatarPreview !== user.avatar && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="avatar-current-password" className="flex items-center gap-2 text-gray-300">
                            <Lock className="w-4 h-4" />
                            当前密码 *
                          </Label>
                          <Input
                            id="avatar-current-password"
                            type="password"
                            value={avatarForm.currentPassword}
                            onChange={(e) => setAvatarForm({ ...avatarForm, currentPassword: e.target.value })}
                            placeholder="输入当前密码以确认更改"
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                            required
                          />
                          <p className="text-xs text-gray-500">为了安全起见，更改头像需要验证当前密码</p>
                        </div>

                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {isLoading ? "保存中..." : "保存头像"}
                        </Button>
                      </>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Lock className="w-5 h-5" />
                    安全设置
                  </CardTitle>
                  <CardDescription className="text-gray-400">更改您的登录密码</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password" className="text-gray-300">
                        当前密码
                      </Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        placeholder="输入当前密码"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-gray-300">
                        新密码
                      </Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="输入新密码（至少6个字符）"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-gray-300">
                        确认新密码
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="再次输入新密码"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      {isLoading ? "更新中..." : "更新密码"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
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
