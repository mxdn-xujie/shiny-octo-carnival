import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useMobileControls } from './use-mobile-controls'
import { Socket } from 'socket.io-client'

interface NetworkStats {
  latency: number
  packetLoss: number
  jitter: number
  bitrate: number
}

interface UseNetworkQualityProps {
  socket: Socket | null
  isConnected: boolean
  onQualityChange?: (quality: number) => void
}

export function useNetworkQuality({ 
  socket, 
  isConnected,
  onQualityChange 
}: UseNetworkQualityProps) {
  const [stats, setStats] = useState<NetworkStats>({
    latency: 0,
    packetLoss: 0,
    jitter: 0,
    bitrate: 0
  })
  const [lastWarningTime, setLastWarningTime] = useState(0)
  const { toast } = useToast()
  const { networkWarningVibration } = useMobileControls({})

  // 检查网络质量
  const checkNetworkQuality = useCallback(() => {
    const { latency, packetLoss, jitter } = stats
    const now = Date.now()

    // 计算综合得分 (0-100)
    const latencyScore = latency < 100 ? 100 : latency < 200 ? 70 : latency < 300 ? 40 : 0
    const packetLossScore = packetLoss < 1 ? 100 : packetLoss < 5 ? 70 : packetLoss < 10 ? 40 : 0
    const jitterScore = jitter < 30 ? 100 : jitter < 50 ? 70 : jitter < 100 ? 40 : 0

    const overallScore = (latencyScore + packetLossScore + jitterScore) / 3

    // 通知质量变化
    onQualityChange?.(overallScore)

    // 当质量较差且距离上次提醒超过30秒时发出警告
    if (overallScore < 50 && (now - lastWarningTime > 30000)) {
      toast({
        title: "网络质量警告",
        description: `网络状况不佳 (${Math.round(overallScore)}分/100分)，可能影响通话质量`,
        variant: "destructive"
      })
      networkWarningVibration()
      setLastWarningTime(now)
    }

    return overallScore
  }, [stats, lastWarningTime, toast, networkWarningVibration, onQualityChange])

  // 测量延迟
  const measureLatency = useCallback(() => {
    if (!socket || !isConnected) return

    const start = Date.now()
    socket.emit('ping', () => {
      const latency = Date.now() - start
      setStats(prev => ({
        ...prev,
        latency
      }))
    })
  }, [socket, isConnected])

  // 定期检查网络状态
  useEffect(() => {
    if (!isConnected) return

    const latencyInterval = setInterval(measureLatency, 2000)
    const qualityInterval = setInterval(checkNetworkQuality, 5000)

    return () => {
      clearInterval(latencyInterval)
      clearInterval(qualityInterval)
    }
  }, [isConnected, measureLatency, checkNetworkQuality])

  return {
    stats,
    setStats,
    checkNetworkQuality
  }
}