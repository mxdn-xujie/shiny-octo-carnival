import { useEffect, useCallback } from 'react';
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

  const shortVibration = useCallback(() => {
    if (enableVibration && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [enableVibration]);

  const mediumVibration = useCallback(() => {
    if (enableVibration && 'vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
  }, [enableVibration]);

  const longVibration = useCallback(() => {
    if (enableVibration && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }, [enableVibration]);

  const networkWarningVibration = useCallback(() => {
    if (enableVibration && 'vibrate' in navigator) {
      navigator.vibrate([100, 100, 100, 100, 100]);
    }
  }, [enableVibration]);

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

  // 自定义振动模式
  const customVibration = (pattern: number[]) => vibrate(pattern);

  // 添加音量按键监听
  useEffect(() => {
    const handleVolumeKeys = (event: KeyboardEvent) => {
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

    window.addEventListener('keydown', handleVolumeKeys);
    return () => window.removeEventListener('keydown', handleVolumeKeys);
  }, [onVolumeUp, onVolumeDown, isAndroid, isIOS, shortVibration]);

  return {
    vibrate: customVibration,
    shortVibration,
    mediumVibration,
    longVibration,
    networkWarningVibration,
  };
}