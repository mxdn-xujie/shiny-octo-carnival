"use client"

import { Badge } from "@/components/ui/badge"

interface QualityIndicatorProps {
  stats: {
    packetLoss: number
    bitrate: number
    latency: number
    jitter: number
  }
}

export default function QualityIndicator({ stats }: QualityIndicatorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">连接质量</span>
        <Badge
          variant={
            stats.packetLoss < 5 && stats.latency < 100
              ? "default"
              : stats.packetLoss > 15 || stats.latency > 300
              ? "destructive"
              : "secondary"
          }
        >
          {stats.packetLoss < 5 && stats.latency < 100
            ? "良好"
            : stats.packetLoss > 15 || stats.latency > 300
            ? "较差"
            : "一般"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>丢包率:</span>
          <span className={stats.packetLoss > 10 ? "text-red-500" : "text-green-500"}>
            {stats.packetLoss}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>比特率:</span>
          <span>{Math.round(stats.bitrate)} kbps</span>
        </div>
        <div className="flex items-center justify-between">
          <span>延迟:</span>
          <span className={stats.latency > 200 ? "text-red-500" : "text-green-500"}>
            {stats.latency}ms
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>抖动:</span>
          <span className={stats.jitter > 50 ? "text-red-500" : "text-green-500"}>
            {stats.jitter}ms
          </span>
        </div>
      </div>
    </div>
  )
}