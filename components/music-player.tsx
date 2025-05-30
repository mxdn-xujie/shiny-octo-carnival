"use client"

import * as React from "react"
import { useState, useEffect, useRef, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Radio,
  Heart,
  Shuffle,
  Repeat,
  Share2,
  List,
  Search,
  RefreshCw,
  AlertCircle,
} from "lucide-react"

interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  url: string
  cover: string
  genre: string
  year: number
  popularity: number
  isLiked: boolean
  source: string
  license: string
}

interface MusicPlayerProps {
  isVisible: boolean
}

export default function MusicPlayer({ isVisible }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(70)
  const [playMode, setPlayMode] = useState<"normal" | "repeat" | "shuffle">("normal")
  const [isUserSeeking, setIsUserSeeking] = useState(false)
  const [currentGenre, setCurrentGenre] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tracks, setTracks] = useState<Track[]>([])
  const [audioError, setAudioError] = useState<string | null>(null)
  const [isBuffering, setIsBuffering] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const { toast } = useToast()

  // 音频可视化相关状态
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameId = useRef<number>()

  // 创建本地可播放的音频数据（使用Web Audio API生成简单音调）
  const generateAudioData = (frequency: number, duration: number) => {
    const sampleRate = 44100
    const samples = sampleRate * duration
    const buffer = new ArrayBuffer(44 + samples * 2)
    const view = new DataView(buffer)

    // WAV文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, 36 + samples * 2, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, "data")
    view.setUint32(40, samples * 2, true)

    // 生成音频数据
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3
      view.setInt16(44 + i * 2, sample * 32767, true)
    }

    const blob = new Blob([buffer], { type: "audio/wav" })
    return URL.createObjectURL(blob)
  }

  // 模拟从音乐API获取热门歌曲
  const fetchTrendingMusic = async () => {
    setIsLoading(true)
    setAudioError(null)

    try {
      // 模拟API调用延迟
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 创建可播放的演示音频
      const demoTracks: Track[] = [
        {
          id: "1",
          title: "Chill Lofi Beat",
          artist: "LoFi Producer",
          album: "Study Beats Vol.1",
          duration: 30,
          url: generateAudioData(440, 30), // A4音符，30秒
          cover: "/placeholder.svg?height=300&width=300",
          genre: "lofi",
          year: 2024,
          popularity: 95,
          isLiked: false,
          source: "演示音频",
          license: "CC BY",
        },
        {
          id: "2",
          title: "Summer Vibes",
          artist: "Tropical House Collective",
          album: "Beach Sessions",
          duration: 25,
          url: generateAudioData(523, 25), // C5音符，25秒
          cover: "/placeholder.svg?height=300&width=300",
          genre: "electronic",
          year: 2024,
          popularity: 92,
          isLiked: true,
          source: "演示音频",
          license: "CC BY-SA",
        },
        {
          id: "3",
          title: "Midnight Drive",
          artist: "Synthwave Station",
          album: "Neon Nights",
          duration: 35,
          url: generateAudioData(330, 35), // E4音符，35秒
          cover: "/placeholder.svg?height=300&width=300",
          genre: "synthwave",
          year: 2024,
          popularity: 89,
          isLiked: false,
          source: "演示音频",
          license: "CC0",
        },
        {
          id: "4",
          title: "Acoustic Dreams",
          artist: "Indie Folk Artist",
          album: "Coffee Shop Sessions",
          duration: 40,
          url: generateAudioData(294, 40), // D4音符，40秒
          cover: "/placeholder.svg?height=300&width=300",
          genre: "folk",
          year: 2024,
          popularity: 88,
          isLiked: true,
          source: "演示音频",
          license: "CC BY",
        },
        {
          id: "5",
          title: "Urban Beats",
          artist: "Hip Hop Collective",
          album: "Street Sounds",
          duration: 28,
          url: generateAudioData(392, 28), // G4音符，28秒
          cover: "/placeholder.svg?height=300&width=300",
          genre: "hiphop",
          year: 2024,
          popularity: 90,
          isLiked: false,
          source: "演示音频",
          license: "CC BY-NC",
        },
        {
          id: "6",
          title: "Jazz Cafe",
          artist: "Modern Jazz Trio",
          album: "Late Night Sessions",
          duration: 32,
          url: generateAudioData(466, 32), // A#4音符，32秒
          cover: "/placeholder.svg?height=300&width=300",
          genre: "jazz",
          year: 2024,
          popularity: 85,
          isLiked: true,
          source: "演示音频",
          license: "CC BY-SA",
        },
        {
          id: "7",
          title: "Rock Anthem",
          artist: "Electric Storm",
          album: "Thunder Road",
          duration: 45,
          url: generateAudioData(349, 45), // F4音符，45秒
          cover: "/placeholder.svg?height=300&width=300",
          genre: "rock",
          year: 2024,
          popularity: 87,
          isLiked: false,
          source: "演示音频",
          license: "CC0",
        },
        {
          id: "8",
          title: "Ambient Space",
          artist: "Cosmic Soundscapes",
          album: "Stellar Journey",
          duration: 50,
          url: generateAudioData(220, 50), // A3音符，50秒
          cover: "/placeholder.svg?height=300&width=300",
          genre: "ambient",
          year: 2024,
          popularity: 83,
          isLiked: true,
          source: "演示音频",
          license: "CC BY",
        },
        {
          id: "9",
          title: "Dance Floor",
          artist: "EDM Masters",
          album: "Club Hits 2024",
          duration: 30,
          url: generateAudioData(587, 30), // D5音符，30秒
          cover: "/placeholder.svg?height=300&width=300",
          genre: "edm",
          year: 2024,
          popularity: 94,
          isLiked: false,
          source: "演示音频",
          license: "CC BY-NC",
        },
        {
          id: "10",
          title: "Classical Remix",
          artist: "Modern Orchestra",
          album: "Classical Fusion",
          duration: 38,
          url: generateAudioData(262, 38), // C4音符，38秒
          cover: "/placeholder.svg?height=300&width=300",
          genre: "classical",
          year: 2024,
          popularity: 81,
          isLiked: true,
          source: "演示音频",
          license: "CC BY-SA",
        },
      ]

      // 生成更多演示歌曲
      const additionalTracks = Array.from({ length: 40 }, (_, i) => {
        const frequencies = [220, 247, 262, 294, 330, 349, 392, 440, 494, 523]
        const frequency = frequencies[i % frequencies.length]
        const duration = 20 + (i % 30) // 20-50秒

        return {
          id: `track-${i + 11}`,
          title: `热门歌曲 ${i + 11}`,
          artist: `艺术家 ${Math.floor(Math.random() * 20) + 1}`,
          album: `专辑 ${Math.floor(Math.random() * 10) + 1}`,
          duration: duration,
          url: generateAudioData(frequency, duration),
          cover: "/placeholder.svg?height=300&width=300",
          genre: ["pop", "rock", "electronic", "jazz", "folk", "hiphop"][Math.floor(Math.random() * 6)],
          year: 2024,
          popularity: Math.floor(Math.random() * 30) + 70,
          isLiked: Math.random() > 0.7,
          source: "演示音频",
          license: ["CC BY", "CC BY-SA", "CC0", "CC BY-NC"][Math.floor(Math.random() * 4)],
        }
      })

      const allTracks = [...demoTracks, ...additionalTracks]
      setTracks(allTracks)

      toast({
        title: "音乐库已更新",
        description: `成功加载 ${allTracks.length} 首演示歌曲`,
      })
    } catch (error) {
      console.error("加载音乐失败:", error)
      setAudioError("音乐库加载失败")

      toast({
        title: "加载失败",
        description: "音乐库加载失败，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 初始化时获取音乐
  useEffect(() => {
    if (isVisible && tracks.length === 0) {
      fetchTrendingMusic()
    }
  }, [isVisible])

  // 根据流派和搜索过滤音乐
  const filteredTracks = tracks.filter((track) => {
    const matchesGenre = currentGenre === "all" || track.genre === currentGenre
    const matchesSearch =
      searchQuery === "" ||
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesGenre && matchesSearch
  })

  const playlist = filteredTracks.length > 0 ? filteredTracks : tracks

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsBuffering(false)
    }

    const handleTimeUpdate = () => {
      if (!isUserSeeking) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      handleNext()
    }

    const handleCanPlay = () => {
      audio.volume = volume / 100
      if (isPlaying) {
        audio.play().catch(error => {
          console.error("自动播放失败:", error)
          setIsPlaying(false)
        })
      }
      setIsBuffering(false)
      setAudioError(null)
    }

    const handleError = (e: Event) => {
      console.error("音频播放错误:", e)
      setIsPlaying(false)
      setIsBuffering(false)
      setAudioError("播放失败，请尝试其他歌曲")
      
      toast({
        title: "播放失败",
        description: "当前歌曲无法播放，将自动切换到下一首",
        variant: "destructive",
      })

      // 自动切换到下一首
      setTimeout(handleNext, 1500)
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("canplay", handleCanPlay)
    audio.addEventListener("error", handleError)

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("canplay", handleCanPlay)
      audio.removeEventListener("error", handleError)
    }
  }, [isPlaying, volume, isUserSeeking, handleNext])

  const handlePlayPause = async () => {
    const audio = audioRef.current
    if (!audio || !track.url) {
      toast({
        title: "播放失败",
        description: "当前歌曲暂无可用音源",
        variant: "destructive",
      })
      return
    }

    try {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        setIsBuffering(true)
        setAudioError(null)

        try {
          await audio.play()
          setIsPlaying(true)
          setIsBuffering(false)

          toast({
            title: "正在播放",
            description: `${track.title} - ${track.artist}`,
          })
        } catch (playError) {
          console.error("播放失败:", playError)
          setIsPlaying(false)
          setIsBuffering(false)
          setAudioError("播放失败，请检查音频源")

          toast({
            title: "播放失败",
            description: "无法播放当前音频，请尝试其他歌曲",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("播放控制失败:", error)
      setIsPlaying(false)
      setIsBuffering(false)
      setAudioError("播放控制失败")
    }
  }

  const handleNext = () => {
    if (playlist.length === 0) return

    if (playMode === "repeat") {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        if (isPlaying) {
          audio.play().catch(console.error)
        }
      }
      return
    }

    let nextIndex
    if (playMode === "shuffle") {
      nextIndex = Math.floor(Math.random() * playlist.length)
    } else {
      nextIndex = (currentTrack + 1) % playlist.length
    }

    setCurrentTrack(nextIndex)
    setCurrentTime(0)
    setIsPlaying(false)
    setAudioError(null)
  }

  const handlePrevious = () => {
    if (playlist.length === 0) return

    const prevIndex = (currentTrack - 1 + playlist.length) % playlist.length
    setCurrentTrack(prevIndex)
    setCurrentTime(0)
    setIsPlaying(false)
    setAudioError(null)
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = value[0]
    audio.currentTime = newTime
    setCurrentTime(newTime)
    setIsUserSeeking(false)
  }

  const handleSeekStart = () => {
    setIsUserSeeking(true)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)

    const audio = audioRef.current
    if (audio) {
      audio.volume = newVolume / 100
    }
  }

  const togglePlayMode = () => {
    const modes: ("normal" | "repeat" | "shuffle")[] = ["normal", "repeat", "shuffle"]
    const currentIndex = modes.indexOf(playMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setPlayMode(nextMode)

    const modeNames = {
      normal: "顺序播放",
      repeat: "单曲循环",
      shuffle: "随机播放",
    }

    toast({
      title: "播放模式",
      description: `已切换到${modeNames[nextMode]}`,
    })
  }

  const toggleLike = () => {
    if (playlist.length === 0) return

    const track = playlist[currentTrack]
    track.isLiked = !track.isLiked
    toast({
      title: track.isLiked ? "已添加到喜欢" : "已从喜欢移除",
      description: `${track.title} - ${track.artist}`,
    })
  }

  const handleTrackSelect = (index: number) => {
    setCurrentTrack(index)
    setCurrentTime(0)
    setIsPlaying(false)
    setShowPlaylist(false)
    setAudioError(null)
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getGenreIcon = (genre: string) => {
    const icons = {
      pop: "🎵",
      electronic: "🎛️",
      rock: "🎸",
      hiphop: "🎤",
      indie: "🎨",
      jazz: "🎺",
      classical: "🎼",
      lofi: "🎧",
      synthwave: "🌆",
      folk: "🎻",
      ambient: "🌌",
      edm: "💫",
    }
    return icons[genre as keyof typeof icons] || "🎵"
  }

  // 初始化音频上下文和分析器
  const initAudioContext = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyserNode = ctx.createAnalyser()
      analyserNode.fftSize = 256
      setAudioContext(ctx)
      setAnalyser(analyserNode)
    }
  }

  // 连接音频节点并开始可视化
  const connectAudioNodes = () => {
    if (!audioContext || !analyser || !audioRef.current) return

    const source = audioContext.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    startVisualization()
  }

  // 绘制音频可视化
  const drawVisualization = () => {
    if (!analyser || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height

        const hue = (i / bufferLength) * 360
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`

        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
        x += barWidth + 1
      }
    }

    draw()
  }

  // 开始可视化
  const startVisualization = () => {
    if (!canvasRef.current || !analyser) return
    drawVisualization()
  }

  // 停止可视化
  const stopVisualization = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
    }
  }

  // 在组件卸载时清理
  useEffect(() => {
    return () => {
      stopVisualization()
      if (audioContext) {
        audioContext.close()
      }
    }
  }, [audioContext])

  // 预加载下一首歌曲
  const preloadNextTrack = () => {
    if (playlist.length <= 1) return

    let nextIndex: number
    if (playMode === "shuffle") {
      nextIndex = Math.floor(Math.random() * playlist.length)
      while (nextIndex === currentTrack && playlist.length > 1) {
        nextIndex = Math.floor(Math.random() * playlist.length)
      }
    } else {
      nextIndex = (currentTrack + 1) % playlist.length
    }

    const nextTrack = playlist[nextIndex]
    if (!nextTrack?.url) return

    const preloadLink = document.createElement("link")
    preloadLink.rel = "preload"
    preloadLink.as = "audio"
    preloadLink.href = nextTrack.url
    document.head.appendChild(preloadLink)

    // 5秒后移除预加载标记
    setTimeout(() => {
      document.head.removeChild(preloadLink)
    }, 5000)
  }

  // 在播放状态改变时初始化音频上下文
  useEffect(() => {
    if (isPlaying) {
      initAudioContext()
    }
  }, [isPlaying])

  // 在音频上下文创建后连接节点
  useEffect(() => {
    if (audioContext && analyser && audioRef.current) {
      connectAudioNodes()
    }
  }, [audioContext, analyser])

  // 在切换歌曲时预加载下一首
  useEffect(() => {
    if (isPlaying) {
      preloadNextTrack()
    }
  }, [currentTrack, isPlaying, playMode])

  if (!isVisible) return null

  // 确保有有效的播放列表和曲目
  const validPlaylist = playlist.length > 0 ? playlist : tracks
  const validTrackIndex = currentTrack < validPlaylist.length ? currentTrack : 0
  const track = validPlaylist[validTrackIndex] || {
    id: "loading",
    title: "正在加载...",
    artist: "音乐电台",
    album: "系统",
    duration: 0,
    url: "",
    cover: "/placeholder.svg?height=300&width=300",
    genre: "pop",
    year: 2024,
    popularity: 0,
    isLiked: false,
    source: "系统",
    license: "免费",
  }

  return (
    <div className="space-y-4">
      {/* 主播放器 */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Radio className="w-5 h-5" />🎵 演示音乐电台 - 本地生成
            <Badge className="bg-red-500 text-white animate-pulse">DEMO</Badge>
            <Badge className="bg-green-500 text-white">FREE</Badge>
            <Button variant="ghost" size="sm" onClick={fetchTrendingMusic} disabled={isLoading} className="ml-auto">
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 错误提示 */}
          {audioError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{audioError}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAudioError(null)
                  handleNext()
                }}
                className="ml-auto"
              >
                跳过
              </Button>
            </div>
          )}

          {/* 当前播放信息 */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={track.cover || "/placeholder.svg"}
                alt={track.title}
                className="w-16 h-16 rounded-lg object-cover shadow-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-lg"></div>
              {(isPlaying || isBuffering) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`w-4 h-4 bg-white rounded-full ${isBuffering ? "animate-spin" : "animate-pulse"}`}
                  ></div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">{track.title}</h3>
                <Button variant="ghost" size="sm" onClick={toggleLike} className="p-1 h-auto">
                  <Heart className={`w-4 h-4 ${track.isLiked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                {track.artist} • {track.album}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>
                  {getGenreIcon(track.genre)} {track.genre.toUpperCase()}
                </span>
                <span>•</span>
                <span>{track.year}</span>
                <span>•</span>
                <span>热度: {track.popularity}%</span>
                <span>•</span>
                <span>{track.source}</span>
                {isBuffering && (
                  <>
                    <span>•</span>
                    <span className="text-blue-500">缓冲中...</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {formatTime(currentTime)} / {formatTime(duration || track.duration)}
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">正在生成演示音乐...</p>
            </div>
          )}

          {/* 进度条 */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || track.duration || 100}
              step={1}
              onValueChange={handleSeek}
              onPointerDown={handleSeekStart}
              className="w-full"
              disabled={!track.url || audioError !== null}
            />
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="sm" onClick={handlePrevious} className="rounded-full">
              <SkipBack className="w-5 h-5" />
            </Button>

            <Button
              onClick={handlePlayPause}
              className="rounded-full w-12 h-12 p-0 bg-purple-600 hover:bg-purple-700"
              disabled={!track.url || isLoading}
            >
              {isBuffering ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </Button>

            <Button variant="ghost" size="sm" onClick={handleNext} className="rounded-full">
              <SkipForward className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="sm" onClick={togglePlayMode} className="rounded-full">
              {playMode === "repeat" ? (
                <Repeat className="w-4 h-4 text-purple-600" />
              ) : playMode === "shuffle" ? (
                <Shuffle className="w-4 h-4 text-purple-600" />
              ) : (
                <List className="w-4 h-4" />
              )}
            </Button>

            <Button variant="ghost" size="sm" className="rounded-full">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          {/* 音量控制 */}
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-gray-600" />
            <Slider value={[volume]} max={100} step={1} onValueChange={handleVolumeChange} className="flex-1" />
            <span className="text-sm text-gray-600 w-8">{volume}%</span>
          </div>
        </CardContent>
      </Card>

      {/* 音乐控制面板 */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-blue-300 flex items-center justify-between">
            🎧 演示音乐控制台 - {tracks.length} 首歌曲
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPlaylist(!showPlaylist)}
                className="text-blue-300 hover:text-blue-200"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchTrendingMusic}
                disabled={isLoading}
                className="text-blue-300 hover:text-blue-200"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 流派选择 */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">音乐流派</label>
            <Select value={currentGenre} onValueChange={setCurrentGenre}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">🎵 全部音乐</SelectItem>
                <SelectItem value="pop">🎤 流行音乐</SelectItem>
                <SelectItem value="electronic">🎛️ 电子音乐</SelectItem>
                <SelectItem value="rock">🎸 摇滚音乐</SelectItem>
                <SelectItem value="hiphop">🎤 说唱音乐</SelectItem>
                <SelectItem value="jazz">🎺 爵士音乐</SelectItem>
                <SelectItem value="folk">🎻 民谣音乐</SelectItem>
                <SelectItem value="lofi">🎧 Lo-Fi音乐</SelectItem>
                <SelectItem value="synthwave">🌆 合成波</SelectItem>
                <SelectItem value="ambient">🌌 环境音乐</SelectItem>
                <SelectItem value="edm">💫 电子舞曲</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 搜索 */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">搜索音乐</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索歌曲或艺术家..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border-slate-600 rounded-md text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* 播放列表 */}
          {showPlaylist && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-300">播放列表 ({playlist.length} 首)</h4>
              <div className="space-y-1">
                {playlist.slice(0, 20).map((track, index) => (
                  <div
                    key={track.id}
                    onClick={() => handleTrackSelect(index)}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                      index === currentTrack ? "bg-purple-600/30 border border-purple-500/50" : "hover:bg-slate-600/50"
                    }`}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{track.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {track.artist} • {track.source}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">{formatTime(track.duration)}</span>
                      {track.isLiked && <Heart className="w-3 h-3 fill-red-500 text-red-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 统计信息 */}
          <div className="text-xs text-center text-gray-400 pt-2 border-t border-slate-600 space-y-1">
            <div>🎶 演示音乐电台 • {tracks.length} 首本地生成歌曲 • 免费收听</div>
            <div className="flex items-center justify-center gap-4">
              <span>🎵 Web Audio API</span>
              <span>🔊 本地生成</span>
              <span>🆓 演示模式</span>
              <span className="text-green-400">● 可正常播放</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 音频可视化 */}
      <div className="relative h-16 bg-black/10 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          width={800}
          height={100}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {track.url ? (
        <audio ref={audioRef} src={track.url} preload="metadata" />
      ) : (
        <audio ref={audioRef} preload="none" />
      )}
    </div>
  )
}
