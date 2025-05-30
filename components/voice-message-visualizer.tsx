"use client"

import { useEffect, useRef } from "react"

interface VoiceMessageVisualizerProps {
  audioUrl: string
  isPlaying: boolean
  onVisualizerReady: (duration: number) => void
}

export default function VoiceMessageVisualizer({
  audioUrl,
  isPlaying,
  onVisualizerReady
}: VoiceMessageVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const initializeVisualizer = async () => {
      if (!canvasRef.current) return

      const response = await fetch(audioUrl)
      const arrayBuffer = await response.arrayBuffer()
      
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      onVisualizerReady(audioBuffer.duration)

      // 设置频谱分析参数
      analyserRef.current.fftSize = 256
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      // 绘制波形
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")!
      const width = canvas.width
      const height = canvas.height

      const draw = () => {
        if (!analyserRef.current) return
        
        analyserRef.current.getByteFrequencyData(dataArray)
        ctx.fillStyle = "rgb(20, 20, 20)"
        ctx.fillRect(0, 0, width, height)

        const barWidth = (width / bufferLength) * 2.5
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height
          
          const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height)
          gradient.addColorStop(0, "#60a5fa") // 蓝色
          gradient.addColorStop(1, "#3b82f6")
          
          ctx.fillStyle = gradient
          ctx.fillRect(x, height - barHeight, barWidth, barHeight)
          
          x += barWidth + 1
        }

        animationRef.current = requestAnimationFrame(draw)
      }

      if (isPlaying) {
        sourceRef.current = audioContextRef.current.createBufferSource()
        sourceRef.current.buffer = audioBuffer
        sourceRef.current.connect(analyserRef.current)
        analyserRef.current.connect(audioContextRef.current.destination)
        sourceRef.current.start()
        draw()
      }
    }

    initializeVisualizer()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      if (sourceRef.current) {
        sourceRef.current.stop()
        sourceRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [audioUrl, isPlaying, onVisualizerReady])

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={50}
      className="w-full rounded-lg bg-gray-900"
    />
  )
}