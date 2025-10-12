# NASA API Error Handling & Retry Logic

## Overview
Comprehensive error handling for NASA API 404 responses with automatic retry logic that goes back up to 10 days to find available images.

## Error Flow

```
User requests date: 2025-10-06
    ↓
Edge Function calls NASA API
    ↓
NASA returns 404: "No data available for date: 2025-10-06"
    ↓
Edge Function detects 404 with "No data available"
    ↓
Returns special error response:
{
  "error": "No data available for this date",
  "errorCode": "NASA_NO_DATA",
  "date": "2025-10-06"
}
    ↓
React Native catches NasaNoDataError
    ↓
Automatically retries with 2025-10-05
    ↓
Continues up to 10 days back (2025-09-26)
    ↓
If still no data: Shows error message
```

## Implementation Details

### 1. Edge Function (Supabase)

**Location**: `/supabase/functions/getNasaImageOfDay/index.ts`

**Error Detection**:
```typescript
if (nasaResponse.status === 404 && errorText.includes('No data available')) {
  return new Response(
    JSON.stringify({ 
      error: nasaError.msg || 'No data available for this date',
      errorCode: 'NASA_NO_DATA',
      date: date 
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404 
    }
  )
}
```

**Response Format**:
- **Status**: 404
- **Body**: 
  ```json
  {
    "error": "No data available for date: 2025-10-06",
    "errorCode": "NASA_NO_DATA",
    "date": "2025-10-06"
  }
  ```

### 2. Supabase Service (React Native)

**Location**: `/src/services/supabase.ts`

**Custom Error Class**:
```typescript
export class NasaNoDataError extends Error {
  errorCode: string;
  date: string;
  
  constructor(message: string, date: string) {
    super(message);
    this.name = 'NasaNoDataError';
    this.errorCode = 'NASA_NO_DATA';
    this.date = date;
  }
}
```

**Error Detection**:
- Checks `error.context.errorCode === 'NASA_NO_DATA'`
- Checks if error message includes "No data available"
- Checks response body for `errorCode === 'NASA_NO_DATA'`

**Throws**: `NasaNoDataError` with date information

### 3. NASA APOD Screen (React Native)

**Location**: `/src/screens/NasaApodScreen.tsx`

**Constants**:
```typescript
const MAX_RETRY_DAYS = 10; // Maximum days to retry
const MAX_DAYS_BACK = 50;  // Maximum days in history
```

**Retry Logic**:
```typescript
const loadImageForDate = async (date: Date, retryCount = 0) => {
  try {
    // Try to load image
  } catch (err) {
    if (err instanceof NasaNoDataError) {
      // Check retry limit
      if (retryCount < MAX_RETRY_DAYS) {
        const previousDay = addDays(date, -1);
        // Retry with previous day
        await loadImageForDate(previousDay, retryCount + 1);
        return;
      }
      // Max retries exceeded
      setError(`No NASA images available for the last ${MAX_RETRY_DAYS} days`);
    }
  }
}
```

## Retry Strategy

### When Retry Triggers:
- NASA API returns 404 with "No data available"
- Edge Function returns `NASA_NO_DATA` error code
- Client receives `NasaNoDataError`

### Retry Process:
1. **Initial Request**: Try requested date
2. **First Retry**: Go back 1 day (retry count: 1)
3. **Second Retry**: Go back 2 days (retry count: 2)
4. **...continues...**
5. **Tenth Retry**: Go back 10 days (retry count: 10)
6. **Stop**: Show error message

### Stop Conditions:
1. **Success**: Found available image
2. **Max Retries**: Tried 20 days back
3. **Date Limit**: Reached MAX_DAYS_BACK (50 days)

## Error Messages

### User-Facing Messages:

| Scenario | Message |
|----------|---------|
| Max retries exceeded | "No NASA images available for the last 10 days" |
| Reached date limit | "No NASA images available in the allowed date range" |
| Other errors | Original error message from API |

### Console Logs:

```
[NasaApod] Loading image for 2025-10-06 (retry: 0)
[NASA] Fetching image for date: 2025-10-06
[NASA] API error for date 2025-10-06: 404 - {"code":404,"msg":"No data available..."}
[NASA] No data available for date: 2025-10-06
[NasaApod] NASA has no data for 2025-10-06
[NasaApod] Retrying with previous day (1/10)
[NasaApod] Loading image for 2025-10-05 (retry: 1)
```

## Benefits

### 1. **Graceful Degradation**
- App never shows blank screen
- Always attempts to find valid image
- User gets content even if current date unavailable

### 2. **Smart Retry**
- Limited to 10 attempts (prevents infinite loops)
- Respects date boundaries (50 days back)
- Updates UI state to show actual loaded date

### 3. **Clear Error Messages**
- Specific error codes for different scenarios
- User-friendly messages
- Detailed console logs for debugging

### 4. **Performance**
- Stops after 20 retries (prevents excessive API calls)
- Each retry is logged
- Failed preloads don't affect main flow

## Testing Scenarios

### Test Case 1: Current Date Unavailable
```
Request: 2025-10-06 (today, not published yet)
Expected: Automatically loads 2025-10-05 or earlier
Result: User sees most recent available image
```

### Test Case 2: Multiple Days Unavailable
```
Request: 2025-10-06
2025-10-06: Not available (404)
2025-10-05: Not available (404)
2025-10-04: Available ✓
Expected: Loads 2025-10-04
Result: Retried 2 times, success
```

### Test Case 3: 10+ Days Unavailable
```
Request: 2025-10-06
All dates from 10-06 to 09-26: Not available
Expected: Error message "No NASA images available for the last 10 days"
Result: Stops after 20 retries
```

### Test Case 4: Network Error
```
Request: 2025-10-05
Error: Network timeout
Expected: Shows network error (no retry)
Result: Only NASA_NO_DATA triggers retry
```

## Configuration

### Adjustable Parameters:

```typescript
// In NasaApodScreen.tsx
const MAX_RETRY_DAYS = 10;  // Change to retry more/fewer days
const MAX_DAYS_BACK = 50;   // Change historical limit
```

### Edge Function:

```typescript
// In index.ts
// Add more error codes if needed
if (nasaResponse.status === 404 && errorText.includes('No data available')) {
  return { errorCode: 'NASA_NO_DATA', ... }
}
```

## API Contract

### Edge Function Response (404):
```typescript
{
  error: string;        // Human-readable message
  errorCode: string;    // 'NASA_NO_DATA'
  date: string;         // Date that was requested (YYYY-MM-DD)
}
```

### Client Error:
```typescript
class NasaNoDataError extends Error {
  errorCode: 'NASA_NO_DATA';
  date: string;         // Date that was requested
}
```

## Future Enhancements

### Possible Improvements:
1. **Smart Date Selection**: Skip known problematic dates
2. **Batch Retry**: Check multiple dates simultaneously
3. **User Notification**: Toast showing retry progress
4. **Cache Retry Results**: Remember which dates have no data
5. **Exponential Backoff**: Delay between retries for rate limiting

## Deployment

After making changes, deploy the Edge Function:
```bash
npx supabase functions deploy getNasaImageOfDay
```

No React Native rebuild needed for Edge Function changes.
