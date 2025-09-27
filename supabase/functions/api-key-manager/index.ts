import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API_KEY_PREFIX = 'hsk_live_'; // HydroScan Key

// Helper function to generate a secure random string
const generateSecureKey = () => {
  const buffer = new Uint8Array(24);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Helper function to hash the key
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // This is an example of a Functional Route handler
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { key_name } = await req.json();
    if (!key_name) {
      return new Response(JSON.stringify({ error: 'key_name is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const newKey = `${API_KEY_PREFIX}${generateSecureKey()}`;
    const keyHash = await sha256(newKey);

    const { data: apiKeyData, error: insertError } = await supabaseClient
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_name,
        key_prefix: API_KEY_PREFIX,
        key_hash: keyHash,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ ...apiKeyData, full_key: newKey }), // Return the full key ONCE
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 201,
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    })
  }
})
