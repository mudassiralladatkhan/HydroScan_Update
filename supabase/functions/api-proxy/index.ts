import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper function to hash a key using SHA-256
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    // 1. Get the user's custom API key from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const apiKey = authHeader.split(' ')[1];

    // Create a Supabase client with the service_role key to bypass RLS for key validation
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Validate the user's API key
    const apiKeyHash = await sha256(apiKey);
    const { data: keyData, error: keyError } = await serviceClient
      .from('api_keys')
      .select('id, user_id, revoked_at')
      .eq('key_hash', apiKeyHash)
      .single();

    if (keyError || !keyData || keyData.revoked_at) {
      return new Response(JSON.stringify({ error: 'Invalid or revoked API key' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. The key is valid. Now, forward the request to the actual PostgREST API.
    // We use the service client again to ensure the request has the necessary permissions.
    const url = new URL(req.url);
    const path = url.pathname.replace('/api-proxy', ''); // remove the function name from path
    const proxyUrl = `${Deno.env.get('SUPABASE_URL')}/rest/v1${path}${url.search}`;

    const response = await fetch(proxyUrl, {
      method: req.method,
      headers: {
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '', // Use the anon key for the forwarded request
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: req.body,
    });

    // 4. Return the response from PostgREST back to the client
    return new Response(response.body, {
      status: response.status,
      headers: { ...response.headers, 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    })
  }
});
