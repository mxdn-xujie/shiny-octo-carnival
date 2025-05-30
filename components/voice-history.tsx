"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, SkipBack, SkipForward, Download, Clock } from "lucide-react"
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns"
import { zhCN } from "date-fns/locale"
import VoiceMessageVisualizer from "./voice-message-visualizer"
import { Slider } from "@/components/ui/slider"
import { Volume2, Volume1, VolumeX, Music4 } from "lucide-react"

interface VoiceMessage {
  id: string
  senderId: string
  senderName: string
  duration: number
  timestamp: Date
  url: string
}

interface VoiceHistoryProps {
  messages: VoiceMessage[]
  onPlayStart: () => void
  onPlayEnd: () => void
  isRoomActive: boolean
}

interface GroupedMessages {
  date: Date
  messages: VoiceMessage[]
}

export default function VoiceHistory({ messages, onPlayStart, onPlayEnd, isRoomActive }: VoiceHistoryProps) {
  const [currentMessage, setCurrentMessage] = useState<VoiceMessage | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wasPaused, setWasPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [messageDurations, setMessageDurations] = useState<Record<string, number>>({})
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isRoomActive && isPlaying) {
      // 如果有人在对讲，暂停播放历史记录
      audioRef.current?.pause()
      setWasPaused(true)
      setIsPlaying(false)
    } else if (!isRoomActive && wasPaused && currentMessage) {
      // 对讲结束后，如果之前是因为对讲而暂停的，则恢复播放
      audioRef.current?.play()
      setWasPaused(false)
      setIsPlaying(true)
    }

    return () => {
      if (progressInterval.current) {
        window.clearInterval(progressInterval.current)
        progressInterval.current = null
      }
    }
  }, [isRoomActive, currentMessage])

  const handlePlay = async (message: VoiceMessage) => {
    if (isRoomActive) {
      onPlayStart()
    }
    
    if (currentMessage?.id === message.id) {
      if (isPlaying) {
        audioRef.current?.pause()
        setIsPlaying(false)
        setWasPaused(false)
        if (progressInterval.current !== null) {
          clearInterval(progressInterval.current)
          progressInterval.current = null
        }
        onPlayEnd()
      } else {
        await audioRef.current?.play()
        if (audioRef.current) {
          audioRef.current.volume = volume
          audioRef.current.playbackRate = playbackRate
        }
        setIsPlaying(true)
        startProgressTracking()
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        if (progressInterval.current !== null) {
          clearInterval(progressInterval.current)
          progressInterval.current = null
        }
      }
      setCurrentMessage(message)
      audioRef.current = new Audio(message.url)
      audioRef.current.volume = volume
      audioRef.current.playbackRate = playbackRate
      audioRef.current.onended = () => {
        setIsPlaying(false)
        setWasPaused(false)
        if (progressInterval.current !== null) {
          clearInterval(progressInterval.current)
          progressInterval.current = null
        }
        setCurrentTime(0)
        onPlayEnd()
        handleNext() // 自动播放下一条
      }
      await audioRef.current.play()
      setIsPlaying(true)
      startProgressTracking()
    }
  }

  const startProgressTracking = () => {
    if (progressInterval.current !== null) {
      clearInterval(progressInterval.current)
      progressInterval.current = null
    }
    progressInterval.current = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime)
        setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)
      }
    }, 100)
  }

  const handleVisualizerReady = (messageId: string, duration: number) => {
    setMessageDurations(prev => ({
      ...prev,
      [messageId]: duration
    }))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleExport = async (message: VoiceMessage) => {
    try {
      const response = await fetch(message.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `voice-message-${message.id}.webm`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('导出语音消息失败:', error)
    }
  }

  const handleNext = () => {
    const currentIndex = messages.findIndex(m => m.id === currentMessage?.id)
    if (currentIndex < messages.length - 1) {
      handlePlay(messages[currentIndex + 1])
    } else {
      // 播放完所有消息
      onPlayEnd()
    }
  }

  const handlePrevious = () => {
    const currentIndex = messages.findIndex(m => m.id === currentMessage?.id)
    if (currentIndex > 0) {
      handlePlay(messages[currentIndex - 1])
    }
  }

  const handleVolumeChange = (value: number) => {
    setVolume(value)
    if (audioRef.current) {
      audioRef.current.volume = value
    }
  }

  const handlePlaybackRateChange = (value: number) => {
    setPlaybackRate(value)
    if (audioRef.current) {
      audioRef.current.playbackRate = value
    }
  }

  const handleProgressChange = (value: number) => {
    if (audioRef.current) {
      const time = (value / 100) * audioRef.current.duration
      audioRef.current.currentTime = time
      setCurrentTime(time)
      setProgress(value)
    }
  }

  // 对消息进行分组
  const groupedMessages = messages.reduce<GroupedMessages[]>((groups, message) => {
    const messageDate = new Date(message.timestamp)
    messageDate.setHours(0, 0, 0, 0)

    const existingGroup = groups.find(
      group => group.date.getTime() === messageDate.getTime()
    )

    if (existingGroup) {
      existingGroup.messages.push(message)
    } else {
      groups.push({
        date: messageDate,
        messages: [message]
      })
    }

    return groups
  }, []).sort((a, b) => b.date.getTime() - a.date.getTime())

  const formatGroupDate = (date: Date) => {
    if (isToday(date)) {
      return "今天"
    }
    if (isYesterday(date)) {
      return "昨天"
    }
    return format(date, "yyyy年M月d日")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>历史对话记录</span>
          {messages.length > 0 && (
            <Badge variant="outline">{messages.length} 条记录</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>暂无历史记录</p>
                <p className="text-sm">对讲的语音消息将会显示在这里</p>
              </div>
            ) : (
              groupedMessages.map((group) => (
                <div key={group.date.toISOString()} className="space-y-3">
                  <div className="sticky top-0 bg-white/80 backdrop-blur-sm py-2">
                    <h3 className="text-sm font-medium text-gray-500">
                      {formatGroupDate(group.date)}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {group.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 rounded-lg flex flex-col gap-3 ${
                          currentMessage?.id === message.id
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{message.senderName}</span>
                            <Badge variant="outline" className="text-xs">
                              {formatDistanceToNow(message.timestamp, { locale: zhCN, addSuffix: true })}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExport(message)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={currentMessage?.id === message.id && isPlaying ? "default" : "outline"}
                              onClick={() => handlePlay(message)}
                            >
                              {currentMessage?.id === message.id && isPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <VoiceMessageVisualizer
                          audioUrl={message.url}
                          isPlaying={currentMessage?.id === message.id && isPlaying}
                          onVisualizerReady={(duration) => handleVisualizerReady(message.id, duration)}
                        />

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {currentMessage?.id === message.id
                                ? `${formatTime(currentTime)} / ${formatTime(messageDurations[message.id] || 0)}`
                                : formatTime(messageDurations[message.id] || 0)}
                            </span>
                          </div>
                          {currentMessage?.id === message.id && (
                            <div className="text-blue-600 font-medium animate-pulse">
                              {isPlaying ? "正在播放" : "已暂停"}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {currentMessage && (
          <>
            <div className="mt-4 space-y-4">
              {/* 进度条 */}
              <div className="space-y-2">
                <Slider
                  value={[progress]}
                  onValueChange={([value]) => handleProgressChange(value)}
                  min={0}
                  max={100}
                  step={0.1}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(messageDurations[currentMessage.id] || 0)}</span>
                </div>
              </div>

              {/* 控制面板 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevious}
                    disabled={messages.findIndex(m => m.id === currentMessage.id) === 0}
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePlay(currentMessage)}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNext}
                    disabled={
                      messages.findIndex(m => m.id === currentMessage.id) ===
                      messages.length - 1
                    }
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                {/* 音量控制 */}
                <div className="flex items-center gap-2 w-32">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleVolumeChange(volume === 0 ? 1 : 0)}
                    className="hover:bg-transparent"
                  >
                    {volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Slider
                    value={[volume * 100]}
                    onValueChange={([value]) => handleVolumeChange(value / 100)}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                </div>

                {/* 播放速度控制 */}
                <div className="flex items-center gap-2">
                  <Music4 className="w-4 h-4" />
                  <select
                    value={playbackRate}
                    onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                    className="bg-transparent border rounded px-2 py-1 text-sm"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2.0x</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}