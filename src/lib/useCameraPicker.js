import { useState } from 'react';
import { isIOSApp } from './platformDetect';
import { toast } from 'sonner';

/**
 * Reusable hook for camera/image picker with iOS Capacitor support.
 * Falls back to native file input on web.
 */
export function useCameraPicker({ onImageSelected }) {
  const [isUploading, setIsUploading] = useState(false);

  const openCameraPicker = async ({ inputId }) => {
    // Web fallback - use native file input
    if (!isIOSApp()) {
      const input = document.getElementById(inputId);
      if (input) input.click();
      return;
    }

    // iOS native - use Capacitor Camera
    setIsUploading(true);
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      // Simple native dialog to choose source
      const useCamera = await new Promise((resolve) => {
        const result = window.confirm('Choose an option:\n\nOK = Take Photo\nCancel = Choose from Library');
        resolve(result);
      });

      const source = useCamera ? CameraSource.Camera : CameraSource.Photos;

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: source,
        quality: 90,
        allowEditing: false,
        promptLabelHeader: 'Photo',
        promptLabelPhoto: 'Choose',
        promptLabelPicture: 'Library',
        promptLabelCancel: 'Cancel',
      });

      if (photo?.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        await onImageSelected?.(file);
      }
    } catch (err) {
      // User cancelled or permission denied
      if (err?.message?.includes('cancelled') || err?.code === 1) {
        // Silent cancel - no error shown
        return;
      }
      console.error('[CameraPicker] Error:', err);
      toast.error('Camera unavailable. Using photo library instead.');
      
      // Fallback to file input
      const input = document.getElementById(inputId);
      if (input) input.click();
    } finally {
      setIsUploading(false);
    }
  };

  return { openCameraPicker, isUploading };
}