import despia from 'despia-native';

export function isDespia(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('despia');
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

export { despia };
