import { useRef, useEffect } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleTap?: () => void;
  threshold?: number;
  swipeTimeout?: number;
  doubleTapTimeout?: number;
}

export function useTouchGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onDoubleTap,
  threshold = 50,
  swipeTimeout = 300,
  doubleTapTimeout = 300,
}: TouchGestureOptions) {
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      // 检测双击
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      if (timeSinceLastTap < doubleTapTimeout && onDoubleTap) {
        e.preventDefault();
        onDoubleTap();
      }
      lastTapRef.current = now;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const duration = Date.now() - touchStartRef.current.time;

      if (duration > swipeTimeout) return;

      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontal && Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          e.preventDefault();
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          e.preventDefault();
          onSwipeLeft();
        }
      } else if (!isHorizontal && Math.abs(deltaY) > threshold) {
        if (deltaY > 0 && onSwipeDown) {
          e.preventDefault();
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          e.preventDefault();
          onSwipeUp();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDoubleTap, threshold, swipeTimeout, doubleTapTimeout]);
}

// 使用示例：
// const { useTouchGestures } = useTouchGestures({
//   onSwipeLeft: () => console.log('向左滑动'),
//   onSwipeRight: () => console.log('向右滑动'),
//   onSwipeUp: () => console.log('向上滑动'),
//   onSwipeDown: () => console.log('向下滑动'),
//   onDoubleTap: () => console.log('双击'),
// });