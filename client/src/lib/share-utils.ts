export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function shareToFacebook(url: string): void {
  const encodedUrl = encodeURIComponent(url);
  
  if (isMobile()) {
    const fbAppUrl = `fb://facewebmodal/f?href=${encodedUrl}`;
    const webUrl = `https://m.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = fbAppUrl;
    document.body.appendChild(iframe);
    
    setTimeout(() => {
      document.body.removeChild(iframe);
      window.location.href = webUrl;
    }, 500);
  } else {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank", "width=600,height=400");
  }
}

export function shareToWhatsApp(url: string, text: string): void {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  
  if (isMobile()) {
    window.location.href = `whatsapp://send?text=${encodedText}%20${encodedUrl}`;
  } else {
    window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, "_blank");
  }
}

export function shareToTelegram(url: string, text: string): void {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  
  if (isMobile()) {
    window.location.href = `tg://msg_url?url=${encodedUrl}&text=${encodedText}`;
    setTimeout(() => {
      window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank");
    }, 500);
  } else {
    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank");
  }
}

export function shareToTwitter(url: string, text: string): void {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, "_blank", "width=600,height=400");
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
