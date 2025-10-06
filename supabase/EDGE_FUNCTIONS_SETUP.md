# Supabase Edge Functions Setup Guide

## Overview
This project includes a Supabase Edge Function `getNasaImageOfDay` that fetches NASA's Astronomy Picture of the Day (APOD) and stores it in your Supabase database and storage.

## Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- A Supabase project (create one at https://supabase.com)
- NASA API Key (get one for free at https://api.nasa.gov/)

## Setup Instructions

### 1. Initialize Supabase in Your Project (if not already done)
```bash
supabase init
```

### 2. Link to Your Supabase Project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Set Up Environment Variables

#### For Local Development:
Create a `.env` file in the `supabase/functions` directory:

```bash
# supabase/functions/.env
NASA_API_KEY=your_nasa_api_key_here
```

You can also use the Supabase CLI to set secrets locally:
```bash
supabase secrets set NASA_API_KEY=your_nasa_api_key_here
```

#### For Production (Supabase Cloud):
Set environment variables using the Supabase CLI:

```bash
# Set the NASA API key
supabase secrets set NASA_API_KEY=your_nasa_api_key_here --project-ref YOUR_PROJECT_REF
```

Or via the Supabase Dashboard:
1. Go to your project dashboard at https://supabase.com/dashboard
2. Navigate to **Settings** > **Edge Functions**
3. Scroll to **Environment Variables** section
4. Click **Add variable**
5. Add: `NASA_API_KEY` with your NASA API key value
6. Click **Save**

**Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

### 4. Run Database Migration
Apply the migration to create the necessary database table and storage bucket:

```bash
supabase db push
```

Or if using migrations:
```bash
supabase migration up
```

### 5. Deploy the Edge Function

Deploy to Supabase:
```bash
supabase functions deploy getNasaImageOfDay
```

### 6. Test the Function

#### Local Testing:
Start Supabase locally:
```bash
supabase start
supabase functions serve getNasaImageOfDay
```

Test with curl:
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/getNasaImageOfDay' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"date":"2024-10-05"}'
```

#### Production Testing:
```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/getNasaImageOfDay' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"date":"2024-10-05"}'
```

## Getting Your NASA API Key

1. Visit https://api.nasa.gov/
2. Fill out the form with your information
3. You'll receive an API key instantly via email
4. Use this key in your environment variables

**Note:** The NASA API has a default rate limit of 1,000 requests per hour.

## Function Usage

### Request Format:
```json
{
  "date": "2024-10-05"
}
```

The date must be in `YYYY-MM-DD` format and cannot be a future date.

### Response Format:
```json
{
  "data": {
    "id": "uuid",
    "date": "2024-10-05",
    "title": "Image Title",
    "explanation": "Description of the image",
    "url": "https://...",
    "media_type": "image",
    "copyright": "Copyright info",
    "hdurl": "https://...",
    "storage_path": "nasa-images/filename.jpg",
    "thumbnail_storage_path": "nasa-images/hd-filename.jpg",
    "created_at": "2024-10-05T...",
    "updated_at": "2024-10-05T..."
  },
  "cached": false
}
```

The `cached` field indicates whether the data was retrieved from the database (true) or freshly fetched from NASA API (false).

## Calling the Function from Your React Native App

Update your `src/services/supabase.ts` to include a helper function:

```typescript
// Add this function to your supabase.ts file
export async function getNasaImageOfDay(date: string) {
  const { data, error } = await supabase.functions.invoke('getNasaImageOfDay', {
    body: { date }
  });

  if (error) {
    throw error;
  }

  return data;
}
```

Then use it in your components:
```typescript
import { getNasaImageOfDay } from '../services/supabase';

// In your component
const fetchImage = async () => {
  try {
    const result = await getNasaImageOfDay('2024-10-05');
    console.log('Image data:', result.data);
    console.log('Was cached:', result.cached);
  } catch (error) {
    console.error('Error fetching NASA image:', error);
  }
};
```

## Storage Bucket Access

Images are stored in the `nasa-images` bucket and are publicly accessible. You can get the public URL:

```typescript
const { data } = supabase
  .storage
  .from('nasa-images')
  .getPublicUrl('filename.jpg');

console.log(data.publicUrl);
```

## Troubleshooting

### Check Function Logs:
```bash
# View logs in real-time
supabase functions logs getNasaImageOfDay --follow

# View recent logs
supabase functions logs getNasaImageOfDay --limit 50
```

### Verify Environment Variables:
```bash
supabase secrets list
```

### Common Issues:
1. **NASA API Key not set**: Ensure the `NASA_API_KEY` is properly set in your environment
2. **Storage bucket not created**: Run the migration to create the storage bucket
3. **Permission errors**: Check that RLS policies are properly configured
4. **Date format errors**: Ensure date is in YYYY-MM-DD format

## Additional Resources
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [NASA APOD API Documentation](https://api.nasa.gov/)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
