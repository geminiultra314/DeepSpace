import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types for NASA Image data
export interface ImageDetails {
  id: string;
  date: string;
  title: string;
  explanation: string;
  url: string;
  media_type: string;
  copyright?: string;
  hdurl?: string;
  storage_path?: string;
  thumbnail_storage_path?: string;
  created_at: string;
  updated_at: string;
}

export interface NasaImageResponse {
  data: ImageDetails;
  cached: boolean;
}

/**
 * Fetches NASA's Astronomy Picture of the Day for a specific date
 * @param date - Date in YYYY-MM-DD format
 * @returns Promise with image details and cached status
 */
export async function getNasaImageOfDay(date: string): Promise<NasaImageResponse> {
  const { data, error } = await supabase.functions.invoke('getNasaImageOfDay', {
    body: { date }
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Gets the public URL for a stored NASA image
 * @param storagePath - The storage path from the database record
 * @returns Public URL for the image
 */
export function getNasaImagePublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from('nasa-images').getPublicUrl(storagePath);
  return data.publicUrl;
}