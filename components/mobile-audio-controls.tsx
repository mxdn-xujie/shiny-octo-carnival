import { Button } from "./ui/button";
import { Mic, MicOff, PhoneOff } from "lucide-react";

interface MobileAudioControlsProps {
  isPTTMode: boolean;
  isPTTActive: boolean;
  isMuted: boolean;
  isConnected: boolean;
  onPTTStart: () => void;
  onPTTEnd: () => void;
  onToggleMute: () => void;
  onLeaveRoom: () => void;
}

export function MobileAudioControls({
  isPTTMode,
  isPTTActive,
  isMuted,
  isConnected,
  onPTTStart,
  onPTTEnd,
  onToggleMute,
  onLeaveRoom,
}: MobileAudioControlsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm safe-bottom">
      <div className="mobile-container">
        <div className="flex items-center justify-between gap-4">
          {isPTTMode ? (
            <Button
              onTouchStart={onPTTStart}
              onTouchEnd={onPTTEnd}
              onMouseDown={onPTTStart}
              onMouseUp={onPTTEnd}
              className={`flex-1 h-16 rounded-full text-white font-bold text-lg transition-all duration-150 touch-feedback ${
                isPTTActive
                  ? "bg-red-500 hover:bg-red-600 scale-105 shadow-lg"
                  : "bg-gray-500 hover:bg-gray-600"
              }`}
              disabled={!isConnected}
            >
              {isPTTActive ? "发言中..." : "按住说话"}
            </Button>
          ) : (
            <Button
              onClick={onToggleMute}
              variant={isMuted ? "destructive" : "default"}
              className="flex-1 h-16 rounded-full touch-feedback"
              disabled={!isConnected}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-6 h-6 mr-2" />
                  已静音
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6 mr-2" />
                  点击静音
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={onLeaveRoom}
            variant="destructive"
            className="h-16 aspect-square rounded-full touch-feedback"
            disabled={!isConnected}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
        
        {isPTTMode && (
          <p className="text-center text-sm text-gray-500 mt-2">
            按住按钮发言，松开接收
          </p>
        )}
      </div>
    </div>
  );
}