import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const { data, error } = await supabaseClient
      .from('api_logs')
      .select('created_at, status_code')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const analytics = Array.from({ length: 8 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (7 - i));
        const day = d.toLocaleDateString('en-US', { weekday: 'short' });
        const name = i === 7 ? 'Today' : i === 6 ? 'Yesterday' : `${7-i} days ago`;
        return { name, date: d.toISOString().split('T')[0], calls: 0, errors: 0 };
    });

    const analyticsMap = new Map(analytics.map(a => [a.date, a]));

    for (const log of data) {
        const logDate = new Date(log.created_at).toISOString().split('T')[0];
        if (analyticsMap.has(logDate)) {
            const dayStat = analyticsMap.get(logDate);
            dayStat.calls++;
            if (log.status_code >= 400) {
                dayStat.errors++;
            }
        }
    }

    const finalAnalytics = Array.from(analyticsMap.values()).map(({date, ...rest}) => rest);

    return new Response(JSON.stringify(finalAnalytics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
