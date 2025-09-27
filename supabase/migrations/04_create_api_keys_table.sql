-- Create the api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 7 chars of the key, e.g. 'sk_live_'
  key_hash TEXT NOT NULL, -- SHA256 hash of the full key
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  permissions JSONB DEFAULT '["devices:read"]'::jsonb
);

-- Add comments to the columns
COMMENT ON TABLE public.api_keys IS 'Stores API keys for programmatic access.';
COMMENT ON COLUMN public.api_keys.user_id IS 'The user who owns this key.';
COMMENT ON COLUMN public.api_keys.key_name IS 'A user-friendly name for the key.';
COMMENT ON COLUMN public.api_keys.key_prefix IS 'A non-sensitive prefix of the key for identification.';
COMMENT ON COLUMN public.api_keys.key_hash IS 'A secure hash of the API key for verification.';
COMMENT ON COLUMN public.api_keys.revoked_at IS 'Timestamp when the key was revoked. If NULL, the key is active.';
COMMENT ON COLUMN public.api_keys.permissions IS 'JSON array of permissions granted to this key.';

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Allow users to view their own keys
CREATE POLICY "Allow users to view their own API keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own keys (will be handled by edge function)
CREATE POLICY "Allow users to insert their own API keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own keys (e.g., revoke)
CREATE POLICY "Allow users to update their own API keys" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);
