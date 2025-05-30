import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Volume2, Mic, Waveform, Settings2 } from "lucide-react"

interface AudioSettingsProps {
  onSettingsChange: (settings: AudioSettings) => void
  initialSettings?: AudioSettings
}

export interface AudioSettings {
  volume: number
  noiseReduction: boolean
  echoCancellation: boolean
  autoGainControl: boolean
  sampleRate: number
  bitDepth: number
}

export default function AudioSettings({ onSettingsChange, initialSettings }: AudioSettingsProps) {
  const [settings, setSettings] = useState<AudioSettings>({
    volume: initialSettings?.volume || 1,
    noiseReduction: initialSettings?.noiseReduction ?? true,
    echoCancellation: initialSettings?.echoCancellation ?? true,
    autoGainControl: initialSettings?.autoGainControl ?? true,
    sampleRate: initialSettings?.sampleRate || 48000,
    bitDepth: initialSettings?.bitDepth || 16
  })

  useEffect(() => {
    onSettingsChange(settings)
  }, [settings, onSettingsChange])

  const handleVolumeChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, volume: value[0] }))
  }

  const handleSampleRateChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, sampleRate: value[0] }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="w-5 h-5" />
          音频设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 音量控制 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              输出音量
            </Label>
            <span className="text-sm text-gray-500">{Math.round(settings.volume * 100)}%</span>
          </div>
          <Slider
            value={[settings.volume]}
            onValueChange={handleVolumeChange}
            max={1}
            step={0.01}
            className="[&_[role=slider]]:bg-purple-600"
          />
        </div>

        {/* 降噪设置 */}
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Waveform className="w-4 h-4" />
            噪声抑制
          </Label>
          <Switch
            checked={settings.noiseReduction}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, noiseReduction: checked }))}
          />
        </div>

        {/* 回声消除 */}
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            回声消除
          </Label>
          <Switch
            checked={settings.echoCancellation}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, echoCancellation: checked }))}
          />
        </div>

        {/* 自动增益 */}
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            自动增益
          </Label>
          <Switch
            checked={settings.autoGainControl}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoGainControl: checked }))}
          />
        </div>

        {/* 采样率设置 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>采样率</Label>
            <span className="text-sm text-gray-500">{settings.sampleRate} Hz</span>
          </div>
          <Slider
            value={[settings.sampleRate]}
            onValueChange={handleSampleRateChange}
            min={8000}
            max={48000}
            step={8000}
            className="[&_[role=slider]]:bg-purple-600"
          />
        </div>

        {/* 音频质量指示器 */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            当前配置音频质量评估:
            <span className="ml-2 font-medium text-green-600 dark:text-green-400">
              {settings.sampleRate >= 44100 ? "高清晰度" : settings.sampleRate >= 22050 ? "标准质量" : "基础质量"}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {settings.noiseReduction && settings.echoCancellation ? 
              "✓ 已启用智能降噪" : 
              "⚠️ 建议开启降噪以获得更好的通话质量"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}