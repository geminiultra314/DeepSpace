// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NasaApodResponse {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: string;
  service_version: string;
  title: string;
  url: string;
  copyright?: string;
}

interface ImageDetails {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the NASA API key from environment variables
    const NASA_API_KEY = Deno.env.get('NASA_API_KEY')
    if (!NASA_API_KEY) {
      throw new Error('NASA_API_KEY environment variable is not set')
    }

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse query parameters to get the date
    const url = new URL(req.url)
    const date = url.searchParams.get('date')
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!date || !dateRegex.test(date)) {
      throw new Error('Invalid date format. Please provide date in YYYY-MM-DD format')
    }

    // Check if image already exists in database
    const { data: existingImage, error: fetchError } = await supabase
      .from('nasa_images')
      .select('*')
      .eq('date', date)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if image doesn't exist
      throw fetchError
    }

    // If image exists, return it
    if (existingImage) {
      return new Response(
        JSON.stringify({ data: existingImage, cached: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Fetch from NASA APOD API
    const nasaApiUrl = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&date=${date}`
    const nasaResponse = await fetch(nasaApiUrl)
    
    if (!nasaResponse.ok) {
      const errorText = await nasaResponse.text()
      throw new Error(`NASA API error: ${nasaResponse.status} - ${errorText}`)
    }

    const nasaData: NasaApodResponse = await nasaResponse.json()

    // Only download and store if it's an image (not video)
    let storagePath: string | undefined
    let hdStoragePath: string | undefined

    if (nasaData.media_type === 'image') {
      // Download and store the standard resolution image
      const imageResponse = await fetch(nasaData.url)
      const imageBlob = await imageResponse.blob()
      const imageArrayBuffer = await imageBlob.arrayBuffer()
      
      const fileName = `${date}-${nasaData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`
      const storageBucket = 'nasa-images'
      
      const { error: uploadError } = await supabase
        .storage
        .from(storageBucket)
        .upload(fileName, imageArrayBuffer, {
          contentType: imageBlob.type,
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
      } else {
        storagePath = `${storageBucket}/${fileName}`
      }

      // Download and store HD image if available
      if (nasaData.hdurl) {
        try {
          const hdImageResponse = await fetch(nasaData.hdurl)
          const hdImageBlob = await hdImageResponse.blob()
          const hdImageArrayBuffer = await hdImageBlob.arrayBuffer()
          
          const hdFileName = `hd-${date}-${nasaData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`
          
          const { error: hdUploadError } = await supabase
            .storage
            .from(storageBucket)
            .upload(hdFileName, hdImageArrayBuffer, {
              contentType: hdImageBlob.type,
              upsert: false
            })

          if (!hdUploadError) {
            hdStoragePath = `${storageBucket}/${hdFileName}`
          }
        } catch (hdError) {
          console.error('Error downloading HD image:', hdError)
          // Continue even if HD download fails
        }
      }
    }

    // Store image details in database
    const { data: insertedImage, error: insertError } = await supabase
      .from('nasa_images')
      .insert({
        date: nasaData.date,
        title: nasaData.title,
        explanation: nasaData.explanation,
        url: nasaData.url,
        media_type: nasaData.media_type,
        copyright: nasaData.copyright,
        hdurl: nasaData.hdurl,
        storage_path: storagePath,
        thumbnail_storage_path: hdStoragePath
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({ data: insertedImage, cached: false }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/getNasaImageOfDay?date=2024-10-05' \
    --header 'Authorization: Bearer YOUR_ANON_KEY'

*/
