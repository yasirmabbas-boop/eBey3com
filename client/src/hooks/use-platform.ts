import { useState, useEffect } from 'react';
import { isDespia, isIOS, isAndroid, getPlatform } from '@/lib/despia';

interface PlatformInfo {
  isDespia: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  platform: 'ios' | 'android' | 'web';
}

export function usePlatform(): PlatformInfo {
  const [platform, setPlatform] = useState<PlatformInfo>({
    isDespia: false,
    isIOS: false,
    isAndroid: false,
    isWeb: true,
    platform: 'web',
  });

  useEffect(() => {
    const despiaDetected = isDespia();
    const iosDetected = isIOS();
    const androidDetected = isAndroid();
    
    setPlatform({
      isDespia: despiaDetected,
      isIOS: iosDetected,
      isAndroid: androidDetected,
      isWeb: !despiaDetected,
      platform: getPlatform(),
    });
  }, []);

  return platform;
}
