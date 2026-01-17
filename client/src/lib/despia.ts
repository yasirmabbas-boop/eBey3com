import despia from 'despia-native';

// Platform Detection
export function isDespia(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('despia');
}

export function isIOS(): boolean {
  if (!isDespia()) return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('iphone') || ua.includes('ipad');
}

export function isAndroid(): boolean {
  if (!isDespia()) return false;
  return navigator.userAgent.toLowerCase().includes('android');
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'web';
}

export function hapticLight(): void {
  if (isDespia()) {
    despia('lighthaptic://');
  }
}

export function hapticSuccess(): void {
  if (isDespia()) {
    despia('successhaptic://');
  }
}

export function hapticError(): void {
  if (isDespia()) {
    despia('errorhaptic://');
  }
}

export async function getAppVersion(): Promise<{ versionNumber: string; bundleNumber: string } | null> {
  if (isDespia()) {
    return despia('getappversion://', ['versionNumber', 'bundleNumber']);
  }
  return null;
}

export async function getDeviceId(): Promise<string | null> {
  if (isDespia()) {
    const result = await despia('get-uuid://', ['uuid']);
    return result?.uuid || null;
  }
  return null;
}

export function showSpinner(): void {
  if (isDespia()) {
    despia('spinneron://');
  }
}

export function hideSpinner(): void {
  if (isDespia()) {
    despia('spinneroff://');
  }
}

export function hideBars(on: boolean): void {
  if (isDespia()) {
    despia(`hidebars://${on ? 'on' : 'off'}`);
  }
}

export function setStatusBarColor(r: number, g: number, b: number): void {
  if (isDespia()) {
    despia(`statusbarcolor://{${r}, ${g}, ${b}}`);
  }
}

export function shareApp(message: string, url: string): void {
  if (isDespia()) {
    despia(`shareapp://message?=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`);
  } else if (navigator.share) {
    navigator.share({ text: message, url });
  }
}

export async function requestBiometricAuth(): Promise<boolean> {
  if (isDespia()) {
    try {
      await despia('bioauth://');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Save image to camera roll
export async function saveToPhotos(imageUrl: string): Promise<boolean> {
  if (isDespia()) {
    try {
      await despia(`savethisimage://?url=${encodeURIComponent(imageUrl)}`);
      hapticSuccess();
      return true;
    } catch {
      hapticError();
      return false;
    }
  }
  return false;
}

// Take screenshot and save
export async function takeScreenshot(): Promise<boolean> {
  if (isDespia()) {
    try {
      await despia('takescreenshot://');
      hapticSuccess();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Open app settings
export function openAppSettings(): void {
  if (isDespia()) {
    despia('opensettings://');
  }
}

// Native share with file support
export async function nativeShare(options: { message?: string; url?: string; title?: string }): Promise<boolean> {
  if (isDespia()) {
    const { message = '', url = '' } = options;
    despia(`shareapp://message?=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`);
    return true;
  } else if (navigator.share) {
    try {
      await navigator.share({ text: options.message, url: options.url, title: options.title });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Screen brightness control
export function setScreenBrightness(mode: 'auto' | 'on' | 'off'): void {
  if (isDespia()) {
    despia(`scanscreen://${mode}`);
  }
}

// Local push notification
export function scheduleLocalPush(seconds: number, message: string, title: string, url: string = '/'): void {
  if (isDespia()) {
    despia(`sendlocalpushmsg://push.send?s=${seconds}=msg!${encodeURIComponent(message)}&!#${encodeURIComponent(title)}&!#${encodeURIComponent(url)}`);
  }
}

// Get OneSignal Player ID for push notifications
export async function getOneSignalPlayerId(): Promise<string | null> {
  if (isDespia()) {
    try {
      const result = await despia('getonesignalplayerid://', ['playerId']);
      return result?.playerId || null;
    } catch {
      return null;
    }
  }
  return null;
}

export { despia };
