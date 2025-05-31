import { useEffect } from 'react';
import { useMobile } from './use-mobile';

interface MobileControlsOptions {
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  enableVibration?: boolean;
}

export function useMobileControls({
  onVolumeUp,
  onVolumeDown,
  enableVibration = true,
}: MobileControlsOptions) {
  const { isIOS, isAndroid } = useMobile();

  // 触觉反馈函数
  const vibrate = (pattern: number | number[]) => {
    if (!enableVibration) return;
    
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.warn('触觉反馈失败:', error);
      }
    }
  };

  // 短振动 - 按钮点击
  const shortVibration = () => vibrate(10);

  // 中等振动 - 状态改变
  const mediumVibration = () => vibrate(50);

  // 长振动 - 错误或警告
  const longVibration = () => vibrate([100, 50, 100]);

  // 自定义振动模式
  const customVibration = (pattern: number[]) => vibrate(pattern);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 针对Android和iOS的音量键处理
      if (isAndroid || isIOS) {
        if (event.key === 'AudioVolumeUp' && onVolumeUp) {
          event.preventDefault();
          onVolumeUp();
          shortVibration();
        } else if (event.key === 'AudioVolumeDown' && onVolumeDown) {
          event.preventDefault();
          onVolumeDown();
          shortVibration();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onVolumeUp, onVolumeDown, isAndroid, isIOS]);

  return {
    vibrate: customVibration,
    shortVibration,
    mediumVibration,
    longVibration,
  };
}