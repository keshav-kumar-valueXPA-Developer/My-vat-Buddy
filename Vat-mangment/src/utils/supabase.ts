import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with retries and error handling
export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: localStorage
    },
    global: {
      headers: { 'x-my-custom-header': 'my-app-name' }
    },
    db: {
      schema: 'public'
    }
  }
);

// Helper function to check if user exists
export async function checkUserExists(email: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('auth.users')
      .select('email')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error checking user:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkUserExists:', error);
    return false;
  }
}

//function to check supabse connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('transactions').select('*').limit(1);
    console.log("Connection Test:", data, error);
  } catch (err) {
    console.error("Supabase Connection Error:", err);
  }
}


// Helper function to check Supabase connection
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true; // Allow non-authenticated state

    const { error } = await supabase
      .from('transactions')
      .select('count')
      .limit(1)
      .single();

    if (error && !error.message.includes('No rows found')) {
      console.error('Supabase connection error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
}

// Helper function to ensure user is authenticated
export async function ensureAuthenticated(): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth error:', error);
      return false;
    }

    return !!user;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

//function to excute sql queries
export async function executeSQLQuery(sql: string) {
  try {
    console.log("Executing SQL:", sql);
    
    // Remove any trailing semicolons
    const cleanQuery = sql.trim().replace(/;$/, '');
    
    const { data, error } = await supabase.rpc("execute_raw_sql", { sql: cleanQuery });

    if (error) {
      console.error("Supabase Query Error:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Execution Error:", err);
    return null;
  }
}


// //function to fetch data from database
// export const fetchDataFromSupabase = async (sqlQuery: string) => {
//   try {
//     //const wrappedSQL = `SELECT json_agg(t) FROM (${sqlQuery}) t;`;

//     const { data, error } = await supabase.rpc("execute_raw_sql", { sql: sqlQuery });

//     if (error) {
//       console.error("Supabase Error:", error);
//       throw new Error("Failed to fetch data");
//     }
//     return data;
//   } catch (error) {
//     console.error("Query Execution Error:", error);
//     return [];
//   }
// };

export default supabase;