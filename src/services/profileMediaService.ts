import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import { storage } from '../firebase';

export interface ImageOptimizationResult {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

export interface UploadProgressInfo {
  progress: number; // 0 to 100
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'error';
}

export class ProfileMediaService {
  private static readonly MAX_RAW_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB max input
  private static readonly TARGET_DIMENSION = 320; // 320x320 optimal avatar size
  private static readonly JPEG_QUALITY = 0.85;

  /**
   * Validate image file format and size
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'لم يتم تحديد أي ملف.' };
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];
    const isImage = file.type.startsWith('image/') || validTypes.includes(file.type.toLowerCase());
    if (!isImage) {
      return { valid: false, error: 'صيغة الملف غير مدعومة. يرجى اختيار صورة صالحة (JPG, PNG, WebP).' };
    }

    if (file.size > this.MAX_RAW_FILE_SIZE_BYTES) {
      return { valid: false, error: 'حجم الصورة يتجاوز الحد الأقصى المسموح (10 ميجابايت).' };
    }

    return { valid: true };
  }

  /**
   * Compress and resize an image file client-side to a crisp 320x320 avatar
   */
  static async compressAndResizeImage(file: File): Promise<ImageOptimizationResult> {
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'الملف المختار غير صالح.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('تعذر فك تشفير بيانات الصورة.'));
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const targetDim = this.TARGET_DIMENSION;
            canvas.width = targetDim;
            canvas.height = targetDim;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('تعذر إنشاء مساحة معالجة الصورة.'));
              return;
            }

            // Fill background with dark tone in case of transparency
            ctx.fillStyle = '#14120B';
            ctx.fillRect(0, 0, targetDim, targetDim);

            // Compute center crop
            const sourceWidth = img.naturalWidth || img.width;
            const sourceHeight = img.naturalHeight || img.height;
            const minDim = Math.min(sourceWidth, sourceHeight);
            const sourceX = (sourceWidth - minDim) / 2;
            const sourceY = (sourceHeight - minDim) / 2;

            // Draw center-cropped square
            ctx.drawImage(
              img,
              sourceX,
              sourceY,
              minDim,
              minDim,
              0,
              0,
              targetDim,
              targetDim
            );

            // Export to JPEG blob for high compression and universal compatibility
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('تعذر ضغط الصورة.'));
                  return;
                }

                const previewUrl = canvas.toDataURL('image/jpeg', this.JPEG_QUALITY);
                resolve({
                  blob,
                  previewUrl,
                  width: targetDim,
                  height: targetDim,
                  sizeBytes: blob.size,
                  mimeType: 'image/jpeg',
                });
              },
              'image/jpeg',
              this.JPEG_QUALITY
            );
          } catch (processErr) {
            reject(processErr);
          }
        };

        img.src = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Upload an avatar blob to Firebase Cloud Storage under users/{userId}/profile_avatar.jpg
   */
  static uploadProfilePhoto(
    userId: string,
    blob: Blob,
    mimeType = 'image/jpeg',
    onProgress?: (info: UploadProgressInfo) => void
  ): { promise: Promise<string>; cancel: () => void } {
    if (!userId || userId.trim() === '' || userId === 'guest_user') {
      throw new Error('يجب تسجيل الدخول لرفع الصورة إلى السحابة.');
    }

    // Deterministic timestamp path prevents stale CDN caching while keeping storage clean
    const timestamp = Date.now();
    const filePath = `users/${userId}/avatar_${timestamp}.jpg`;
    const storageRef = ref(storage, filePath);

    const uploadTask: UploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: mimeType,
      cacheControl: 'public,max-age=604800,immutable',
      customMetadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const promise = new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;

          if (onProgress) {
            onProgress({
              progress,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              state: 'running',
            });
          }
        },
        (error) => {
          console.error('Firebase Storage upload error:', error);
          if (onProgress) {
            onProgress({
              progress: 0,
              bytesTransferred: 0,
              totalBytes: 0,
              state: 'error',
            });
          }
          reject(new Error(this.mapStorageError(error)));
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) {
              onProgress({
                progress: 100,
                bytesTransferred: uploadTask.snapshot.totalBytes,
                totalBytes: uploadTask.snapshot.totalBytes,
                state: 'success',
              });
            }
            resolve(downloadUrl);
          } catch (urlErr) {
            console.error('Failed to get download URL:', urlErr);
            reject(new Error('تم رفع الصورة ولكن تعذر إنشاء رابط العرض.'));
          }
        }
      );
    });

    return {
      promise,
      cancel: () => uploadTask.cancel(),
    };
  }

  /**
   * Safely deletes a previously uploaded profile photo from Cloud Storage
   */
  static async deleteProfilePhotoByUrl(photoURL: string): Promise<void> {
    if (!photoURL || !photoURL.includes('firebasestorage.googleapis.com')) {
      return; // Skip non-Firebase Storage images or presets
    }

    try {
      const storageRef = ref(storage, photoURL);
      await deleteObject(storageRef);
    } catch (err: any) {
      if (err?.code !== 'storage/object-not-found') {
        console.warn('Notice: Non-critical avatar cleanup notice:', err);
      }
    }
  }

  /**
   * Human-friendly Arabic translation of Firebase Storage errors
   */
  private static mapStorageError(error: any): string {
    const code = error?.code || '';
    if (code === 'storage/unauthorized') {
      return 'ليس لديك صلاحية لرفع الصورة في هذا المسار. يرجى التأكد من تسجيل الدخول.';
    }
    if (code === 'storage/canceled') {
      return 'تم إلغاء عملية رفع الصورة.';
    }
    if (code === 'storage/quota-exceeded') {
      return 'تم تجاوز سعة التخزين السحابي المتاحة.';
    }
    if (code === 'storage/retry-limit-exceeded' || error?.message?.includes('network')) {
      return 'انقطع الاتصال بالإنترنت أثناء رفع الصورة. يرجى التحقق من الشبكة وإعادة المحاولة.';
    }
    return error?.message || 'حدث خطأ غير متوقع أثناء رفع الصورة السحابية.';
  }
}
