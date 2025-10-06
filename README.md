# DeepSpace - NASA APOD Viewer

A minimalistic React Native app built with Expo that displays NASA's Astronomy Picture of the Day (APOD).

## Features

### 🖼️ Image Viewing
- **Full-screen display** - Images fill the entire screen for an immersive experience
- **Zoomable & Pannable** - Pinch to zoom (up to 4x), pan when zoomed, double-tap to toggle zoom
- **Video support** - Automatically plays videos when APOD is a video (with native controls)

### 👆 Gesture Controls
- **Tap** - Show/hide overlay with image details (title, date, explanation, copyright)
- **Swipe left** - Navigate to next day's image
- **Swipe right** - Navigate to previous day's image
- **Pinch** - Zoom in/out on images
- **Pan** - Move around when zoomed in
- **Double-tap** - Quick zoom in/out toggle

### 📅 Navigation
- **Date Range** - Browse up to 50 days back from today
- **Preloading** - Next and previous day images are preloaded in the background for instant navigation
- **Smart Caching** - Images are cached locally to save bandwidth

### 💾 Caching Strategy
1. **First Priority**: Downloads HD images directly from NASA
2. **Fallback**: Uses Supabase storage if NASA download fails
3. **Local Cache**: Stores images on device for offline access and faster loading
4. **Automatic Preloading**: Loads adjacent images in the background

### 🎨 UI/UX
- **Minimalistic Design** - Black background with white text, no clutter
- **Transparent Overlay** - Image details appear with 85% opacity overlay on tap
- **Loading States** - Simple "Loading..." text while fetching images
- **Error Handling** - Clear error messages with console logging for debugging

## Tech Stack

- **React Native** with Expo
- **react-native-gesture-handler** - Gesture recognition (swipe, pinch, pan, tap)
- **react-native-reanimated** - Smooth animations for zoom/pan and overlay transitions
- **expo-file-system** - Local image caching
- **expo-av** - Video playback
- **Supabase** - Backend API and image storage
- **TypeScript** - Type safety

## Components

### `NasaApodScreen`
Main screen component that:
- Fetches NASA APOD data from Supabase
- Manages date navigation (next/previous)
- Handles swipe gestures for navigation
- Preloads adjacent images
- Displays overlay with image details

### `ZoomableImageViewer`
Zoomable image component with:
- Pinch-to-zoom gesture (1x to 4x)
- Pan gesture when zoomed
- Double-tap to toggle zoom
- Single tap to trigger overlay

### `VideoViewer`
Simple video player with:
- Native playback controls
- Tap to show overlay
- Full-screen display

## Services

### `imageCache.ts`
Image caching service that:
- Downloads images from NASA or Supabase
- Stores images in local cache directory
- Checks cache before downloading
- Provides cache management utilities

### `supabase.ts`
Supabase integration with:
- `getNasaImageOfDay(date)` - Fetches APOD data
- `getNasaImagePublicUrl(path)` - Gets public URL for cached images
- TypeScript types for image data

## Usage

```typescript
// The app automatically loads today's NASA APOD on startup
// User interactions:
// - Swipe left/right to navigate days
// - Tap to show/hide details
// - Pinch to zoom images
// - Double-tap for quick zoom
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Deploy Supabase Edge Function:
```bash
supabase functions deploy getNasaImageOfDay
```

4. Set NASA API key in Supabase:
```bash
supabase secrets set NASA_API_KEY=your_nasa_api_key
```

5. Run the app:
```bash
npm start
```

## Image Quality

The app prioritizes HD images:
- Uses `hdurl` from NASA if available
- Falls back to standard `url` if HD not available
- Caches the highest quality version for future use

## Performance Optimizations

- **Preloading**: Adjacent images load in background
- **Local Caching**: Images cached on device
- **Smart Fallback**: NASA → Supabase → Error
- **Gesture Optimization**: Uses native drivers via Reanimated
- **Efficient Rendering**: Only renders visible content

## Error Handling

- Network errors logged to console
- User-friendly error messages displayed
- Graceful fallback from NASA to Supabase
- Cache miss handling with automatic download

## Future Enhancements

Potential features to add:
- Favorite/bookmark images
- Share images
- Search by date picker
- Offline mode indicator
- Cache size display
- Settings screen
- Image download to gallery
- Haptic feedback
