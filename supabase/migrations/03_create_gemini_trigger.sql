-- Create a function to trigger the gemini-scorer edge function
create or replace function public.request_gemini_scoring()
returns trigger
language plpgsql
security definer -- The function will run with the permissions of the user that created it (the postgres user)
set search_path = public
as $$
declare
  -- Get the Project URL and Service Role Key from the vault
  project_url text := vault.secret('supabase_url');
  service_role_key text := vault.secret('supabase_service_role_key');
begin
  -- Invoke the 'gemini-scorer' edge function, passing the new row data
  perform net.http_post(
    url := project_url || '/functions/v1/gemini-scorer',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('record', new)
  );
  return new;
end;
$$;

-- Create a trigger that executes the function after each new sensor reading
create trigger on_new_sensor_reading
  after insert on public.sensor_readings
  for each row
  execute procedure public.request_gemini_scoring();
