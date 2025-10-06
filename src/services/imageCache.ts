// Using legacy API for compatibility
import {
  cacheDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  downloadAsync,
  deleteAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';
import { getNasaImagePublicUrl } from './supabase';

// Use cache directory for storing images
const CACHE_DIR = `${cacheDirectory}nasa-images/`;

// Ensure cache directory exists
async function ensureCacheDir() {
  const dirInfo = await getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

// Get the local file path for a cached image
function getCacheFilePath(date: string): string {
  return `${CACHE_DIR}${date}.jpg`;
}

/**
 * Download and cache an image from a URL
 * @param url - The URL to download from
 * @param date - The date identifier for the image
 * @returns Local file URI of the cached image
 */
async function downloadAndCache(url: string, date: string): Promise<string> {
  await ensureCacheDir();
  const localUri = getCacheFilePath(date);
  
  try {
    console.log(`[ImageCache] Downloading image for ${date} from ${url}`);
    
    const downloadResult = await downloadAsync(url, localUri);
    
    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
    
    console.log(`[ImageCache] Successfully cached image for ${date}`);
    return downloadResult.uri;
  } catch (error) {
    console.error(`[ImageCache] Error downloading image for ${date}:`, error);
    throw error;
  }
}

/**
 * Check if an image is already cached
 * @param date - The date to check
 * @returns Local file URI if cached, null otherwise
 */
async function getCachedImage(date: string): Promise<string | null> {
  const localUri = getCacheFilePath(date);
  const fileInfo = await getInfoAsync(localUri);
  
  if (fileInfo.exists) {
    console.log(`[ImageCache] Cache hit for ${date}`);
    return localUri;
  }
  
  console.log(`[ImageCache] Cache miss for ${date}`);
  return null;
}

/**
 * Get an image, either from cache or by downloading it
 * First tries NASA HD URL, then falls back to Supabase storage
 * @param nasaUrl - The NASA image URL (preferably HD)
 * @param storagePath - The Supabase storage path (fallback)
 * @param date - The date identifier
 * @returns Local file URI of the image
 */
export async function getImage(
  nasaUrl: string | undefined,
  storagePath: string | undefined,
  date: string
): Promise<string> {
  // Check if already cached
  const cached = await getCachedImage(date);
  if (cached) {
    return cached;
  }
  
  // Try downloading from NASA first
  if (nasaUrl) {
    try {
      return await downloadAndCache(nasaUrl, date);
    } catch (error) {
      console.warn(`[ImageCache] Failed to download from NASA, trying Supabase fallback`);
    }
  }
  
  // Fallback to Supabase storage
  if (storagePath) {
    try {
      const supabaseUrl = getNasaImagePublicUrl(storagePath);
      return await downloadAndCache(supabaseUrl, date);
    } catch (error) {
      console.error(`[ImageCache] Failed to download from Supabase:`, error);
      throw error;
    }
  }
  
  throw new Error('No valid image URL available');
}

/**
 * Preload an image in the background
 * @param nasaUrl - The NASA image URL (preferably HD)
 * @param storagePath - The Supabase storage path (fallback)
 * @param date - The date identifier
 */
export async function preloadImage(
  nasaUrl: string | undefined,
  storagePath: string | undefined,
  date: string
): Promise<void> {
  try {
    await getImage(nasaUrl, storagePath, date);
  } catch (error) {
    console.warn(`[ImageCache] Failed to preload image for ${date}:`, error);
  }
}

/**
 * Clear the entire image cache
 */
export async function clearCache(): Promise<void> {
  try {
    const dirInfo = await getInfoAsync(CACHE_DIR);
    if (dirInfo.exists) {
      await deleteAsync(CACHE_DIR, { idempotent: true });
      console.log('[ImageCache] Cache cleared');
    }
  } catch (error) {
    console.error('[ImageCache] Error clearing cache:', error);
  }
}

/**
 * Get cache size in bytes (approximate)
 */
export async function getCacheSize(): Promise<number> {
  try {
    const dirInfo = await getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      return 0;
    }
    
    const files = await readDirectoryAsync(CACHE_DIR);
    let totalSize = 0;
    
    for (const file of files) {
      const fileInfo = await getInfoAsync(`${CACHE_DIR}${file}`);
      if (fileInfo.exists && !fileInfo.isDirectory) {
        totalSize += fileInfo.size || 0;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('[ImageCache] Error calculating cache size:', error);
    return 0;
  }
}
