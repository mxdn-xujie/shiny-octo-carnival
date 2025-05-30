"use client"
import { UserIcon } from "lucide-react"

interface UserAvatarProps {
  username: string
  avatar?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export default function UserAvatar({ username, avatar, size = "md", className = "" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-sm",
    xl: "w-16 h-16 text-2xl",
  }

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
    xl: "w-8 h-8",
  }

  if (avatar) {
    return (
      <img
        src={avatar || "/placeholder.svg"}
        alt={`${username}的头像`}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-sm ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} bg-blue-500 rounded-full flex items-center justify-center text-white font-bold ${className}`}
    >
      {username ? username.charAt(0).toUpperCase() : <UserIcon className={iconSizes[size]} />}
    </div>
  )
}
