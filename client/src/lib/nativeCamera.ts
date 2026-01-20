import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { isNative } from './capacitor';

export interface CameraOptions {
  source?: 'camera' | 'gallery' | 'prompt';
  quality?: number;
  allowEditing?: boolean;
}

/**
 * Capture a photo using the device camera or gallery
 * Returns a File object compatible with existing upload system
 */
export const capturePhoto = async (options: CameraOptions = {}): Promise<File | null> => {
  if (!isNative) {
    console.warn('capturePhoto called on web platform');
    return null;
  }

  try {
    const {
      source = 'prompt',
      quality = 90,
      allowEditing = true,
    } = options;

    // Map source to CameraSource
    const sourceMap: Record<string, CameraSource> = {
      camera: CameraSource.Camera,
      gallery: CameraSource.Photos,
      prompt: CameraSource.Prompt,
    };

    const photo: Photo = await Camera.getPhoto({
      quality,
      allowEditing,
      resultType: CameraResultType.Uri,
      source: sourceMap[source],
      // Arabic labels for the prompt
      promptLabelHeader: 'اختر مصدر الصورة',
      promptLabelPhoto: 'المعرض',
      promptLabelPicture: 'الكاميرا',
      promptLabelCancel: 'إلغاء',
    });

    // Convert to File object
    if (!photo.webPath) {
      throw new Error('No photo path returned');
    }

    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    
    // Create a proper filename with extension
    const extension = photo.format || 'jpg';
    const filename = `photo_${Date.now()}.${extension}`;
    
    const file = new File([blob], filename, { 
      type: `image/${extension === 'jpg' ? 'jpeg' : extension}` 
    });

    return file;
  } catch (error) {
    // User cancelled or error occurred
    console.error('Camera error:', error);
    return null;
  }
};

/**
 * Pick multiple photos from gallery (if supported)
 * Returns array of File objects
 */
export const pickMultiplePhotos = async (): Promise<File[]> => {
  if (!isNative) {
    console.warn('pickMultiplePhotos called on web platform');
    return [];
  }

  try {
    // Note: Multiple selection requires additional native code or plugin
    // For now, we'll just use single selection
    const file = await capturePhoto({ source: 'gallery' });
    return file ? [file] : [];
  } catch (error) {
    console.error('Gallery picker error:', error);
    return [];
  }
};

/**
 * Check if camera is available on this device
 */
export const isCameraAvailable = async (): Promise<boolean> => {
  if (!isNative) return false;

  try {
    const permissions = await Camera.checkPermissions();
    return permissions.camera !== 'denied';
  } catch {
    return false;
  }
};

/**
 * Request camera permissions
 */
export const requestCameraPermissions = async (): Promise<boolean> => {
  if (!isNative) return false;

  try {
    const permissions = await Camera.requestPermissions();
    return permissions.camera === 'granted';
  } catch {
    return false;
  }
};
