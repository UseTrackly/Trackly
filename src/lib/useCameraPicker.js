import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Returns true only when running inside a Capacitor native container.
 * Must NOT return true for plain mobile Safari / web preview on iOS.
 */
function isCapacitorNative() {
  return window?.Capacitor?.isNativePlatform?.() === true;
}

/**
 * Reusable hook for camera/image picker with iOS Capacitor support.
 * Falls back to native file input on web.
 */
export function useCameraPicker({ onImageSelected }) {
  const [isUploading, setIsUploading] = useState(false);

  const openCameraPicker = async ({ inputId }) => {
    // Web / mobile browser fallback - use native file input
    if (!isCapacitorNative()) {
      const input = document.getElementById(inputId);
      if (input) input.click();
      return;
    }

    // Capacitor native only - use Capacitor Camera plugin
    setIsUploading(true);
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      // Request both permissions upfront — iOS needs NSCameraUsageDescription in
      // Info.plist for this to work. Ignore the result; getPhoto will handle denial.
      try {
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      } catch (_) {
        // Permission request itself may fail if key missing; proceed anyway
      }

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl, // DataUrl is more reliable than Uri on iOS
        source: CameraSource.Prompt,
        quality: 80,
        allowEditing: false,
        promptLabelHeader: 'Select Photo',
        promptLabelPhoto: 'Choose from Library',
        promptLabelPicture: 'Take Photo',
        promptLabelCancel: 'Cancel',
      });

      if (photo?.dataUrl) {
        // Convert base64 dataUrl → File
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
        await onImageSelected?.(file);
      }
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      // Silent on user cancel
      if (
        msg.includes('cancel') ||
        msg.includes('user denied') ||
        msg.includes('no image picked') ||
        msg.includes('dismissed') ||
        err?.code === 1
      ) {
        return;
      }
      console.error('[CameraPicker] Error:', err?.message, err);
      toast.error('Could not open photo picker. Please allow camera/photo access in Settings → Trackly.');
    } finally {
      setIsUploading(false);
    }
  };

  return { openCameraPicker, isUploading };
}