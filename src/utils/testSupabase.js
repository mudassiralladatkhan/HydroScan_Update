import { supabase } from '@/lib/supabaseClient';

export const testSupabaseConnection = async () => {
  try {
    // Test the connection
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Supabase connection test:', { isAuthenticated: !!session });
    
    // Test database access
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);

    if (orgError) {
      console.error('Database access test failed:', orgError);
      return false;
    }

    console.log('Database access test successful:', { hasOrganizations: !!orgs?.length });
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};
