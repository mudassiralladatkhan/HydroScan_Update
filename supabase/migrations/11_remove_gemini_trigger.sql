-- Remove unsafe Gemini scoring trigger and function
-- Drops trigger and function created previously to avoid hardcoded external calls and secrets in DB layer

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_new_sensor_reading ON sensor_readings;

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.request_gemini_scoring();
