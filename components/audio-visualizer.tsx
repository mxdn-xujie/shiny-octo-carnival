import { useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface AudioVisualizerProps {
  audioStream: MediaStream | null
  mode?: "wave" | "frequency"
  color?: string
  height?: number
}

export default function AudioVisualizer({
  audioStream,
  mode = "wave",
  color = "#6366f1",
  height = 100
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    if (!audioStream || !canvasRef.current) return

    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(audioStream)
    const analyser = audioContext.createAnalyser()
    analyserRef.current = analyser

    source.connect(analyser)
    analyser.fftSize = mode === "wave" ? 2048 : 256
    const bufferLength = analyser.frequencyBinCount
    dataArrayRef.current = new Uint8Array(bufferLength)

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!
    
    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current || !ctx) return
      
      const width = canvas.width
      ctx.clearRect(0, 0, width, height)
      
      if (mode === "wave") {
        analyserRef.current.getByteTimeDomainData(dataArrayRef.current)
        ctx.lineWidth = 2
        ctx.strokeStyle = color
        ctx.beginPath()
        
        const sliceWidth = width / bufferLength
        let x = 0
        
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArrayRef.current[i] / 128.0
          const y = (v * height) / 2
          
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
          
          x += sliceWidth
        }
        
        ctx.lineTo(width, height / 2)
        ctx.stroke()
      } else {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const barWidth = (width / bufferLength) * 2.5
        let x = 0
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArrayRef.current[i] / 255) * height
          
          ctx.fillStyle = color
          ctx.fillRect(x, height - barHeight, barWidth, barHeight)
          
          x += barWidth + 1
        }
      }
      
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      audioContext.close()
    }
  }, [audioStream, mode, color, height])

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-2">
        <canvas 
          ref={canvasRef}
          width={500}
          height={height}
          className="w-full"
        />
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
          {mode === "wave" ? "波形图" : "频谱图"}
        </div>
      </CardContent>
    </Card>
  )
}