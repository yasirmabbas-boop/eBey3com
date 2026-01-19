import { isDespia, nativeShare, hapticLight } from './despia';

function openShareUrl(url: string, features?: string): void {
  const popup = window.open(url, "_blank", features);
  if (!popup) {
    window.location.href = url;
  }
}

export function shareToFacebook(url: string): void {
  hapticLight();
  const encodedUrl = encodeURIComponent(url);
  openShareUrl(
    `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    "width=600,height=400"
  );
}

export function shareToWhatsApp(url: string, text: string): void {
  hapticLight();
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  
  // Use native share in Despia for better UX
  if (isDespia()) {
    nativeShare({ message: text, url });
    return;
  }

  openShareUrl(`https://wa.me/?text=${encodedText}%20${encodedUrl}`);
}

export function shareToTelegram(url: string, text: string): void {
  hapticLight();
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  openShareUrl(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`);
}

export function shareToTwitter(url: string, text: string): void {
  hapticLight();
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  openShareUrl(
    `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    "width=600,height=400"
  );
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
