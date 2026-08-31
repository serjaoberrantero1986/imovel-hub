/**
 * ImóvelHub Supabase Storage Integration Layer
 * Handles uploading property media to Supabase Storage buckets, with content deduplication and offline fallback.
 */

export interface StorageConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  bucketName: string;
}

export interface StorageUploadResult {
  success: boolean;
  publicUrl: string;
  storagePath: string;
  size: number;
  hash: string;
  provider: 'supabase' | 'local_optimized';
  error?: string;
}

// Read from Environment or Local Storage
export function getStorageConfig(): StorageConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const envBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'property-images';

  const localUrl = localStorage.getItem('imovelhub_supabase_url') || envUrl;
  const localKey = localStorage.getItem('imovelhub_supabase_anon_key') || envKey;
  const localBucket = localStorage.getItem('imovelhub_supabase_bucket') || envBucket;

  return {
    supabaseUrl: localUrl.replace(/\/$/, ''),
    supabaseAnonKey: localKey,
    bucketName: localBucket
  };
}

export function isSupabaseConfigured(): boolean {
  const config = getStorageConfig();
  return Boolean(
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    config.supabaseUrl.startsWith('http') &&
    config.supabaseAnonKey.length > 20
  );
}

/**
 * Uploads a processed image Blob to Supabase Storage bucket
 */
export async function uploadImageToStorage(
  propertyId: string,
  imageBlob: Blob,
  fileHash: string,
  fileName: string = 'image.webp'
): Promise<StorageUploadResult> {
  const config = getStorageConfig();
  const isConfigured = isSupabaseConfigured();

  const sanitizedPropertyId = propertyId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `properties/${sanitizedPropertyId}/${fileHash}.webp`;

  if (isConfigured) {
    try {
      const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${config.bucketName}/${storagePath}`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': config.supabaseAnonKey,
          'Authorization': `Bearer ${config.supabaseAnonKey}`,
          'Content-Type': imageBlob.type || 'image/webp',
          'x-upsert': 'true'
        },
        body: imageBlob
      });

      if (response.ok) {
        const publicUrl = `${config.supabaseUrl}/storage/v1/object/public/${config.bucketName}/${storagePath}`;
        return {
          success: true,
          publicUrl,
          storagePath,
          size: imageBlob.size,
          hash: fileHash,
          provider: 'supabase'
        };
      } else {
        const errText = await response.text();
        console.warn('Supabase Storage Upload returned error, using optimized local storage fallback:', errText);
      }
    } catch (error) {
      console.warn('Network error reaching Supabase Storage, using fallback:', error);
    }
  }

  // Fallback: Convert Blob to standard persistent data URL
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(imageBlob);
  });

  return {
    success: true,
    publicUrl: dataUrl,
    storagePath,
    size: imageBlob.size,
    hash: fileHash,
    provider: 'local_optimized'
  };
}

/**
 * Deletes an image from Supabase Storage bucket
 */
export async function deleteImageFromStorage(storagePath: string): Promise<boolean> {
  const config = getStorageConfig();
  if (!isSupabaseConfigured() || !storagePath) return true;

  try {
    const deleteUrl = `${config.supabaseUrl}/storage/v1/object/${config.bucketName}/${storagePath}`;
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'apikey': config.supabaseAnonKey,
        'Authorization': `Bearer ${config.supabaseAnonKey}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}
