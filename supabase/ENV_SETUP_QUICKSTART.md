# Quick Start: Setting Up Environment Variables in Supabase

## Step 1: Get Your NASA API Key
1. Visit: https://api.nasa.gov/
2. Fill out the signup form
3. You'll receive your API key via email instantly

## Step 2: Set Environment Variables in Supabase

### Option A: Using Supabase CLI (Recommended)

#### For Production:
```bash
supabase secrets set NASA_API_KEY=your_actual_api_key_here --project-ref YOUR_PROJECT_REF
```

#### For Local Development:
```bash
# Navigate to your project root
cd /home/suba/DeepSpace

# Set the secret for local development
echo "NASA_API_KEY=your_actual_api_key_here" > supabase/.env.local
```

Or use the CLI:
```bash
supabase secrets set NASA_API_KEY=your_actual_api_key_here
```

### Option B: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click **Settings** in the left sidebar
3. Click **Edge Functions**
4. Scroll to **Environment Variables** or **Secrets** section
5. Click **Add variable** or **New secret**
6. Enter:
   - **Name**: `NASA_API_KEY`
   - **Value**: Your actual NASA API key
7. Click **Save**

## Step 3: Deploy Your Edge Function

```bash
# Make sure you're in the project root
cd /home/suba/DeepSpace

# Deploy the function
supabase functions deploy getNasaImageOfDay
```

## Step 4: Apply Database Migration

```bash
# Push the migration to create tables and storage
supabase db push
```

## Verify Setup

### Check if secrets are set:
```bash
supabase secrets list
```

### Test the function locally:
```bash
# Start Supabase locally
supabase start

# In another terminal, serve the function
supabase functions serve getNasaImageOfDay

# Test with curl (replace YOUR_ANON_KEY with your actual key)
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/getNasaImageOfDay' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"date":"2024-10-05"}'
```

## Important Notes

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions - you don't need to set them manually
- The NASA API has a rate limit of 1,000 requests per hour with a standard API key
- Environment variables set via CLI or Dashboard are available immediately to your deployed functions
- For local development, use `supabase/.env.local` file or set secrets using the CLI

## Troubleshooting

### "NASA_API_KEY environment variable is not set" error:
- Verify the secret is set: `supabase secrets list`
- Re-deploy the function: `supabase functions deploy getNasaImageOfDay`
- Check function logs: `supabase functions logs getNasaImageOfDay`

### Can't find Supabase CLI:
```bash
npm install -g supabase
```

### Need to update a secret:
Just run the `supabase secrets set` command again with the new value - it will overwrite the old one.
