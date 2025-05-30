"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/types/user"
import { UserPlus, LogIn, Shield, Radio, Zap } from "lucide-react"

interface LoginPageProps {
  onLogin: (user: User) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loginForm, setLoginForm] = useState({ username: "", password: "" })
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null)
  const { toast } = useToast()

  // 登录尝试限制
  const MAX_LOGIN_ATTEMPTS = 5
  const LOCKOUT_DURATION = 15 * 60 * 1000 // 15分钟

  useEffect(() => {
    // 初始化默认管理员账号
    initializeDefaultAdmin()
    checkLockoutStatus()
  }, [])

  const checkLockoutStatus = () => {
    const savedLockout = localStorage.getItem('loginLockout')
    if (savedLockout) {
      const { endTime, attempts } = JSON.parse(savedLockout)
      if (new Date(endTime) > new Date()) {
        setLockoutEndTime(new Date(endTime))
        setLoginAttempts(attempts)
      } else {
        localStorage.removeItem('loginLockout')
      }
    }
  }

  const updateLoginAttempts = () => {
    const newAttempts = loginAttempts + 1
    setLoginAttempts(newAttempts)
    
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const endTime = new Date(Date.now() + LOCKOUT_DURATION)
      setLockoutEndTime(endTime)
      localStorage.setItem('loginLockout', JSON.stringify({
        endTime: endTime.toISOString(),
        attempts: newAttempts
      }))
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 检查是否被锁定
    if (lockoutEndTime && new Date() < lockoutEndTime) {
      const remainingTime = Math.ceil((lockoutEndTime.getTime() - Date.now()) / 60000)
      toast({
        title: "账号已锁定",
        description: `登录尝试次数过多，请${remainingTime}分钟后再试`,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
      const user = users.find(
        (u) => u.username === loginForm.username && u.status === "active"
      )

      if (!user) {
        updateLoginAttempts()
        toast({
          title: "登录失败",
          description: "用户名不存在或账号已被禁用",
          variant: "destructive",
        })
        return
      }

      // 检查密码强度和验证
      const { score } = checkPasswordStrength(loginForm.password)
      if (score < 3) {
        toast({
          title: "安全提醒",
          description: "建议更改为更强的密码",
          variant: "warning",
        })
      }

      // 验证密码
      if (user.password === loginForm.password) {
        // 生成新的 session token
        const sessionToken = generateSecureSessionId()
        const deviceFingerprint = generateDeviceFingerprint()
        
        // 更新用户信息
        const updatedUser = {
          ...user,
          lastLogin: new Date().toISOString(),
          authToken: sessionToken,
          tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时过期
          deviceHistory: [
            ...(user.deviceHistory || []),
            {
              id: deviceFingerprint,
              name: navigator.userAgent,
              firstLogin: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              trusted: false
            }
          ]
        }

        // 清除锁定状态
        setLoginAttempts(0)
        setLockoutEndTime(null)
        localStorage.removeItem('loginLockout')

        const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u))
        localStorage.setItem("users", JSON.stringify(updatedUsers))

        onLogin(updatedUser)
        toast({
          title: "登录成功",
          description: `欢迎回来，${user.username}！`,
        })
      } else {
        updateLoginAttempts()
        toast({
          title: "登录失败",
          description: "密码错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("登录错误:", error)
      toast({
        title: "登录错误",
        description: "登录过程中发生错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 密码强度检查
      const { score, feedback } = checkPasswordStrength(registerForm.password)
      if (score < 3) {
        toast({
          title: "密码强度不足",
          description: feedback.join(" "),
          variant: "destructive",
        })
        return
      }

      if (registerForm.password !== registerForm.confirmPassword) {
        toast({
          title: "注册失败",
          description: "两次输入的密码不一致",
          variant: "destructive",
        })
        return
      }

      const users: User[] = JSON.parse(localStorage.getItem("users") || "[]")
      const userExists = users.some(
        (u) => u.username === registerForm.username || u.email === registerForm.email
      )

      if (userExists) {
        toast({
          title: "注册失败",
          description: "用户名或邮箱已存在",
          variant: "destructive",
        })
        return
      }

      // 创建新用户
      const sessionToken = generateSecureSessionId()
      const deviceFingerprint = generateDeviceFingerprint()

      const newUser: User = {
        id: `user-${Date.now()}`,
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
        role: "user",
        status: "active",
        createdAt: new Date().toISOString(),
        lastPasswordChange: new Date().toISOString(),
        friends: [],
        authToken: sessionToken,
        tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        deviceHistory: [{
          id: deviceFingerprint,
          name: navigator.userAgent,
          firstLogin: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          trusted: false
        }],
        securityQuestions: []
      }

      users.push(newUser)
      localStorage.setItem("users", JSON.stringify(users))

      toast({
        title: "注册成功",
        description: "账号创建成功，请登录",
      })

      setRegisterForm({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("注册错误:", error)
      toast({
        title: "注册错误",
        description: "注册过程中发生错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 动态背景效果 */}
      <div className="absolute inset-0">
        {/* 渐变网格 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]"></div>

        {/* 发光圆圈 */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

        {/* 几何图形 */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* 标题区域 */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <Radio className="w-12 h-12 text-cyan-400" />
                <div className="absolute inset-0 w-12 h-12 bg-cyan-400 rounded-full blur-lg opacity-30 animate-pulse"></div>
              </div>
              <Zap className="w-8 h-8 text-yellow-400 animate-bounce" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              网络对讲
            </h1>
            <p className="text-gray-300 text-lg">进入未来通信世界</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">实时在线</span>
            </div>
          </div>

          {/* 登录卡片 */}
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-white text-xl">账号登录</CardTitle>
              <CardDescription className="text-gray-300">登录您的账号开始使用对讲功能</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  >
                    登录
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  >
                    注册
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-gray-300">
                        用户名
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="输入用户名"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300">
                        密码
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="输入密码"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2.5 shadow-lg"
                      disabled={isLoading}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      {isLoading ? "登录中..." : "登录"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-username" className="text-gray-300">
                        用户名
                      </Label>
                      <Input
                        id="reg-username"
                        type="text"
                        placeholder="输入用户名"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">
                        邮箱
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="输入邮箱地址"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-gray-300">
                        密码
                      </Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="输入密码"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-gray-300">
                        确认密码
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="再次输入密码"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-2.5 shadow-lg"
                      disabled={isLoading}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {isLoading ? "注册中..." : "注册"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* 管理员账号信息 */}
              <div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-400">默认管理员账号</span>
                </div>
                <p className="text-sm text-gray-300">
                  用户名: <code className="bg-slate-600/50 px-2 py-1 rounded text-cyan-300">admin</code>
                </p>
                <p className="text-sm text-gray-300">
                  密码: <code className="bg-slate-600/50 px-2 py-1 rounded text-cyan-300">admin123</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
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
