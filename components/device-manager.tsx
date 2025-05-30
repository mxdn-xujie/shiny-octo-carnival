import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Mic, Volume2, Settings2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { AudioSettings } from "@/types/user"

interface DeviceManagerProps {
  onDeviceChange: (deviceId: string) => void
  onVolumeChange: (volume: number) => void
  onSettingsChange: (settings: AudioSettings) => void
  initialSettings?: AudioSettings
}

export default function DeviceManager({
  onDeviceChange,
  onVolumeChange,
  onSettingsChange,
  initialSettings,
}: DeviceManagerProps) {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>("")
  const [volume, setVolume] = useState(1)
  const [isTestingMic, setIsTestingMic] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [settings, setSettings] = useState<AudioSettings>(
    initialSettings || {
      volume: 1,
      noiseReduction: true,
      echoCancellation: true,
      autoGainControl: true,
      sampleRate: 48000,
      bitDepth: 16,
    }
  )

  const { toast } = useToast()

  // 加载音频设备
  useEffect(() => {
    loadAudioDevices()
    navigator.mediaDevices.addEventListener("devicechange", loadAudioDevices)
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", loadAudioDevices)
    }
  }, [])

  const loadAudioDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter((device) => device.kind === "audioinput")
      setAudioDevices(audioInputs)

      if (audioInputs.length > 0 && !selectedDevice) {
        const defaultDevice = audioInputs[0].deviceId
        setSelectedDevice(defaultDevice)
        onDeviceChange(defaultDevice)
      }
    } catch (error) {
      console.error("获取音频设备失败:", error)
      toast({
        title: "设备访问受限",
        description: "请允许浏览器访问麦克风",
        variant: "destructive",
      })
    }
  }

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseReduction,
          autoGainControl: settings.autoGainControl,
        },
      })

      setIsTestingMic(true)

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()

      analyser.fftSize = 2048
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      source.connect(analyser)

      const checkVolume = () => {
        if (!isTestingMic) return

        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / bufferLength
        const normalizedLevel = Math.min(average / 128, 1)
        setMicLevel(normalizedLevel)

        requestAnimationFrame(checkVolume)
      }

      checkVolume()

      setTimeout(() => {
        setIsTestingMic(false)
        stream.getTracks().forEach((track) => track.stop())
        audioContext.close()
      }, 5000)
    } catch (error) {
      console.error("麦克风测试失败:", error)
      toast({
        title: "测试失败",
        description: "无法访问选中的音频设备",
        variant: "destructive",
      })
    }
  }

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId)
    onDeviceChange(deviceId)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    onVolumeChange(newVolume)
  }

  const handleSettingChange = <K extends keyof AudioSettings>(
    key: K,
    value: AudioSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          音频设置
        </CardTitle>
        <CardDescription>配置音频设备和声音参数</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 设备选择 */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            麦克风选择
          </Label>
          <Select value={selectedDevice} onValueChange={handleDeviceChange}>
            <SelectTrigger>
              <SelectValue placeholder="选择音频输入设备" />
            </SelectTrigger>
            <SelectContent>
              {audioDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `麦克风 ${device.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testMicrophone}
              disabled={isTestingMic || !selectedDevice}
            >
              {isTestingMic ? "测试中..." : "测试麦克风"}
            </Button>
            {isTestingMic && (
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-100"
                    style={{ width: `${micLevel * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500">
                  {Math.round(micLevel * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 音量控制 */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            输入音量
          </Label>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={1}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>{Math.round(volume * 100)}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* 音频设置 */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">音频质量设置</h4>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label>降噪</Label>
              <Select
                value={settings.noiseReduction.toString()}
                onValueChange={(value) =>
                  handleSettingChange("noiseReduction", value === "true")
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">启用</SelectItem>
                  <SelectItem value="false">关闭</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>回声消除</Label>
              <Select
                value={settings.echoCancellation.toString()}
                onValueChange={(value) =>
                  handleSettingChange("echoCancellation", value === "true")
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">启用</SelectItem>
                  <SelectItem value="false">关闭</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>自动增益</Label>
              <Select
                value={settings.autoGainControl.toString()}
                onValueChange={(value) =>
                  handleSettingChange("autoGainControl", value === "true")
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">启用</SelectItem>
                  <SelectItem value="false">关闭</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>采样率</Label>
              <Select
                value={settings.sampleRate.toString()}
                onValueChange={(value) =>
                  handleSettingChange("sampleRate", parseInt(value))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="48000">48 kHz</SelectItem>
                  <SelectItem value="44100">44.1 kHz</SelectItem>
                  <SelectItem value="32000">32 kHz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>位深度</Label>
              <Select
                value={settings.bitDepth.toString()}
                onValueChange={(value) =>
                  handleSettingChange("bitDepth", parseInt(value))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16">16 位</SelectItem>
                  <SelectItem value="24">24 位</SelectItem>
                  <SelectItem value="32">32 位</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}