"use client"

import { Badge } from "@/components/ui/badge"
import { useMemo } from "react"
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react"

interface QualityIndicatorProps {
  stats: {
    packetLoss: number
    bitrate: number
    latency: number
    jitter: number
  }
}

export default function QualityIndicator({ stats }: QualityIndicatorProps) {
  const quality = useMemo(() => {
    // 根据延迟、丢包率和抖动计算网络质量分数
    const latencyScore = stats.latency < 100 ? 3 : stats.latency < 200 ? 2 : 1
    const packetLossScore = stats.packetLoss < 1 ? 3 : stats.packetLoss < 5 ? 2 : 1
    const jitterScore = stats.jitter < 30 ? 3 : stats.jitter < 50 ? 2 : 1

    // 综合评分
    const totalScore = (latencyScore + packetLossScore + jitterScore) / 3

    return {
      score: totalScore,
      color:
        totalScore > 2.5
          ? "text-green-500"
          : totalScore > 1.5
          ? "text-yellow-500"
          : "text-red-500",
      icon:
        totalScore > 2.5
          ? CheckCircle
          : totalScore > 1.5
          ? AlertTriangle
          : AlertCircle,
      text:
        totalScore > 2.5 ? "良好" : totalScore > 1.5 ? "一般" : "较差",
    }
  }, [stats.latency, stats.packetLoss, stats.jitter])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <quality.icon className={`w-5 h-5 ${quality.color}`} />
          <span className={`font-medium ${quality.color}`}>
            网络质量: {quality.text}
          </span>
        </div>
        <span className="text-sm text-gray-500">
          得分: {quality.score.toFixed(1)}/3.0
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <span className="text-sm text-gray-500">延迟</span>
          <p
            className={`font-medium ${
              stats.latency < 100
                ? "text-green-500"
                : stats.latency < 200
                ? "text-yellow-500"
                : "text-red-500"
            }`}
          >
            {stats.latency}ms
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-sm text-gray-500">丢包率</span>
          <p
            className={`font-medium ${
              stats.packetLoss < 1
                ? "text-green-500"
                : stats.packetLoss < 5
                ? "text-yellow-500"
                : "text-red-500"
            }`}
          >
            {stats.packetLoss.toFixed(1)}%
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-sm text-gray-500">抖动</span>
          <p
            className={`font-medium ${
              stats.jitter < 30
                ? "text-green-500"
                : stats.jitter < 50
                ? "text-yellow-500"
                : "text-red-500"
            }`}
          >
            {stats.jitter.toFixed(0)}ms
          </p>
        </div>
      </div>
    </div>
  )
}