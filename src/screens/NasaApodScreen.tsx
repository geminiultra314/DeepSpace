import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { ZoomableImageViewer } from '../components/ZoomableImageViewer';
import { VideoViewer } from '../components/VideoViewer';
import { getNasaImageOfDay, ImageDetails, NasaNoDataError } from '../services/supabase';
import { getImage, preloadImage } from '../services/imageCache';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_DAYS_BACK = 50;
const MAX_RETRY_DAYS = 20;

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formatted = `${year}-${month}-${day}`;
  console.log(`[NasaApod] Formatted date: ${formatted}`);
  return formatted;
}

// Helper function to add/subtract days from a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export const NasaApodScreen: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [imageData, setImageData] = useState<ImageDetails | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const overlayOpacity = useSharedValue(0);

  // Load image for a specific date with retry logic
  const loadImageForDate = useCallback(async (date: Date, retryCount = 0) => {
    setLoading(true);
    setError(null);
    setLocalImageUri(null);

    try {
      const dateStr = formatDate(date);
      console.log(`[NasaApod] Loading image for ${dateStr} (retry: ${retryCount})`);

      // Fetch data from Supabase
      const response = await getNasaImageOfDay(dateStr);
      const data = response.data;
      
      setImageData(data);

      // For images, download and cache
      if (data.media_type === 'image') {
        const localUri = await getImage(
          data.hdurl || data.url,
          data.storage_path,
          dateStr
        );
        setLocalImageUri(localUri);
      } else {
        // For videos, use the URL directly
        setLocalImageUri(data.url);
      }

      // Preload adjacent images in the background
      preloadAdjacentImages(date);
    } catch (err) {
      console.error('[NasaApod] Error loading image:', err);
      
      // Check if it's a NASA_NO_DATA error
      if (err instanceof NasaNoDataError) {
        console.log(`[NasaApod] NASA has no data for ${err.date}`);
        
        // If we haven't exceeded max retries, try previous day
        if (retryCount < MAX_RETRY_DAYS) {
          const previousDay = addDays(date, -1);
          const oldestDate = addDays(new Date(), -MAX_DAYS_BACK);
          
          if (previousDay >= oldestDate) {
            console.log(`[NasaApod] Retrying with previous day (${retryCount + 1}/${MAX_RETRY_DAYS})`);
            setCurrentDate(previousDay);
            await loadImageForDate(previousDay, retryCount + 1);
            return;
          }
        }
        
        // Max retries exceeded or reached oldest date
        const errorMessage = retryCount >= MAX_RETRY_DAYS 
          ? `No NASA images available for the last ${MAX_RETRY_DAYS} days`
          : 'No NASA images available in the allowed date range';
        console.error(`[NasaApod] ${errorMessage}`);
        setError(errorMessage);
      } else {
        // For other errors, just display them
        const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Preload next and previous images
  const preloadAdjacentImages = useCallback(async (date: Date) => {
    const yesterday = addDays(date, -1);
    const tomorrow = addDays(date, 1);
    const today = new Date();

    // Preload yesterday's image
    const oldestDate = addDays(today, -MAX_DAYS_BACK);
    if (yesterday >= oldestDate) {
      preloadImageForDate(yesterday);
    }

    // Preload tomorrow's image (if not in the future)
    if (tomorrow <= today) {
      preloadImageForDate(tomorrow);
    }
  }, []);

  const preloadImageForDate = async (date: Date) => {
    try {
      const dateStr = formatDate(date);
      console.log(`[NasaApod] Preloading image for ${dateStr}`);
      
      const response = await getNasaImageOfDay(dateStr);
      const data = response.data;
      
      if (data.media_type === 'image') {
        await preloadImage(
          data.hdurl || data.url,
          data.storage_path,
          dateStr
        );
      }
    } catch (err) {
      if (err instanceof NasaNoDataError) {
        console.warn(`[NasaApod] No data available for preload date ${err.date}`);
      } else {
        console.warn(`[NasaApod] Failed to preload image for ${formatDate(date)}:`, err);
      }
    }
  };

  // Load initial image
  useEffect(() => {
    loadImageForDate(currentDate);
  }, []);

  // Navigate to next day
  const goToNextDay = useCallback(() => {
    const nextDate = addDays(currentDate, 1);
    const today = new Date();
    
    if (nextDate <= today) {
      setCurrentDate(nextDate);
      loadImageForDate(nextDate);
    }
  }, [currentDate, loadImageForDate]);

  // Navigate to previous day
  const goToPreviousDay = useCallback(() => {
    const previousDate = addDays(currentDate, -1);
    const oldestDate = addDays(new Date(), -MAX_DAYS_BACK);
    
    if (previousDate >= oldestDate) {
      setCurrentDate(previousDate);
      loadImageForDate(previousDate);
    }
  }, [currentDate, loadImageForDate]);

  // Toggle overlay
  const toggleOverlay = useCallback(() => {
    setShowOverlay((prev) => {
      const newValue = !prev;
      overlayOpacity.value = withTiming(newValue ? 1 : 0, { duration: 300 });
      return newValue;
    });
  }, []);

  // Swipe gesture handling
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const threshold = SCREEN_WIDTH / 3;
      
      if (event.translationX > threshold) {
        // Swipe right - go to previous day
        runOnJS(goToPreviousDay)();
      } else if (event.translationX < -threshold) {
        // Swipe left - go to next day
        runOnJS(goToNextDay)();
      }
      
      translateX.value = withTiming(0);
    });

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Image loading failed</Text>
        <Text style={styles.errorDetails}>{error}</Text>
      </View>
    );
  }

  if (!imageData || !localImageUri) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No image data available</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {imageData.media_type === 'image' ? (
          <ZoomableImageViewer
            imageUri={localImageUri}
            onTap={toggleOverlay}
          />
        ) : (
          <VideoViewer
            videoUrl={localImageUri}
            onTap={toggleOverlay}
          />
        )}

        {/* Overlay with image details */}
        {showOverlay && (
          <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
            <ScrollView
              style={styles.overlayContent}
              contentContainerStyle={styles.overlayContentContainer}
            >
              <Text style={styles.date}>{imageData.date}</Text>
              <Text style={styles.title}>{imageData.title}</Text>
              {imageData.copyright && (
                <Text style={styles.copyright}>© {imageData.copyright}</Text>
              )}
              <Text style={styles.explanation}>{imageData.explanation}</Text>
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorDetails: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 20,
    paddingTop: 60,
  },
  overlayContent: {
    flex: 1,
  },
  overlayContentContainer: {
    paddingBottom: 40,
  },
  date: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  copyright: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  explanation: {
    color: '#ddd',
    fontSize: 16,
    lineHeight: 24,
  },
});
