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

    // iOS native - use Capacitor Camera with Prompt source
    // This lets iOS show its native "Camera / Photo Library" action sheet
    // and triggers the correct permission requests for both.
    setIsUploading(true);
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      // First explicitly request permissions so iOS registers them
      await Camera.requestPermissions({ permissions: ['camera', 'photos'] });

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,   // native iOS picker: Camera OR Photos
        quality: 85,
        allowEditing: false,
        promptLabelHeader: 'Select Photo',
        promptLabelPhoto: 'Choose from Library',
        promptLabelPicture: 'Take Photo',
        promptLabelCancel: 'Cancel',
      });

      if (photo?.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        await onImageSelected?.(file);
      }
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      // Silent on user cancel
      if (
        msg.includes('cancel') ||
        msg.includes('user denied') ||
        msg.includes('no image picked') ||
        err?.code === 1
      ) {
        return;
      }
      console.error('[CameraPicker] Error:', err);
      toast.error('Could not open camera. Please check permissions in Settings → Trackly.');
    } finally {
      setIsUploading(false);
    }
  };

  return { openCameraPicker, isUploading };
}