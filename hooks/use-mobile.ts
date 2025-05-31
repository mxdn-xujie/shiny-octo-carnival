import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isTablet: boolean;
  isSafari: boolean;
  isWechat: boolean;
}

export function useMobile(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isTablet: false,
    isSafari: false,
    isWechat: false,
  });

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    const info = {
      isMobile: /mobile|android|iphone|ipad|phone/i.test(userAgent),
      isIOS: /iphone|ipad|ipod/i.test(userAgent),
      isAndroid: /android/i.test(userAgent),
      isTablet: /ipad|android(?!.*mobile)/i.test(userAgent),
      isSafari: /safari/i.test(userAgent) && !/chrome/i.test(userAgent),
      isWechat: /micromessenger/i.test(userAgent),
    };

    setDeviceInfo(info);

    // 如果是移动设备，添加视口高度修复
    if (info.isMobile) {
      const fixViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };

      fixViewportHeight();
      window.addEventListener('resize', fixViewportHeight);
      window.addEventListener('orientationchange', fixViewportHeight);

      return () => {
        window.removeEventListener('resize', fixViewportHeight);
        window.removeEventListener('orientationchange', fixViewportHeight);
      };
    }
  }, []);

  return deviceInfo;
}