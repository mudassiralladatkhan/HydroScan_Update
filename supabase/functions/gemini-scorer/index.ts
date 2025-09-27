import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record } = await req.json()
    const { id, ph, turbidity, tds, temperature } = record

    const prompt = `Based on the following water quality sensor data, provide a single contamination score from 0 (perfectly clean) to 100 (highly contaminated). Consider all parameters. Data: pH: ${ph}, Turbidity: ${turbidity} NTU, TDS: ${tds} ppm, Temperature: ${temperature}°C. Respond with only a single integer number.`

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${await geminiResponse.text()}`)
    }

    const geminiData = await geminiResponse.json()
    const scoreText = geminiData.candidates[0].content.parts[0].text
    const contamination_score = parseInt(scoreText.trim(), 10)

    if (isNaN(contamination_score)) {
      throw new Error('Failed to parse score from Gemini response.')
    }

    // Update the database with the new score
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: updateError } = await supabaseAdmin
      .from('sensor_readings')
      .update({ contamination_score })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    return new Response(JSON.stringify({ success: true, score: contamination_score }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
