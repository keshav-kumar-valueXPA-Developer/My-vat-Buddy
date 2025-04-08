/*
  # Database Schema Setup

  1. Tables
    - Creates core tables with user-specific data separation
    - Adds proper constraints and defaults
    - Implements cascading deletes for user data cleanup

  2. Security
    - Enables RLS on all tables
    - Creates policies for user data isolation
    - Implements proper access controls

  3. Performance
    - Adds indexes for common query patterns
    - Optimizes for user-specific queries
*/

-- Create tables if they don't exist
DO $$ 
BEGIN
  -- Create transactions table
  CREATE TABLE IF NOT EXISTS transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date timestamptz NOT NULL,
    document_number text,
    description text NOT NULL,
    ledger_name text,
    amount numeric NOT NULL DEFAULT 0,
    vat_amount numeric NOT NULL DEFAULT 0,
    type text NOT NULL,
    category text NOT NULL,
    debit numeric DEFAULT 0,
    credit numeric DEFAULT 0,
    cumulative_balance numeric DEFAULT 0,
    previous_stage_price numeric DEFAULT 0,
    previous_stage_vat numeric DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT valid_type CHECK (type IN ('Sale', 'Purchase', 'Expense', 'Credit Note', 'Debit Note'))
  );

  -- Create documents table
  CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    url text NOT NULL,
    type text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT valid_type CHECK (type IN ('link', 'document'))
  );

  -- Create upload_history table
  CREATE TABLE IF NOT EXISTS upload_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename text NOT NULL,
    type text NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT valid_type CHECK (type IN ('Sales', 'Purchases', 'Expenses', 'Credit Notes', 'Debit Notes'))
  );

  -- Create report_history table
  CREATE TABLE IF NOT EXISTS report_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email text NOT NULL,
    date_range text NOT NULL,
    downloaded_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
  );
END $$;

-- Enable RLS on all tables
DO $$ 
BEGIN
  ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;
  ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
EXCEPTION 
  WHEN others THEN null;
END $$;

-- Safely create policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
  DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
  DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
  DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
  
  DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
  DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
  DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
  DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
  
  DROP POLICY IF EXISTS "Users can view their own upload history" ON upload_history;
  DROP POLICY IF EXISTS "Users can insert their own upload history" ON upload_history;
  
  DROP POLICY IF EXISTS "Users can view their own report history" ON report_history;
  DROP POLICY IF EXISTS "Users can insert their own report history" ON report_history;

  -- Create new policies
  -- Transactions
  CREATE POLICY "Users can view their own transactions" ON transactions 
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own transactions" ON transactions 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own transactions" ON transactions 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own transactions" ON transactions 
    FOR DELETE TO authenticated 
    USING (auth.uid() = user_id);

  -- Documents
  CREATE POLICY "Users can view their own documents" ON documents 
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own documents" ON documents 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own documents" ON documents 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own documents" ON documents 
    FOR DELETE TO authenticated 
    USING (auth.uid() = user_id);

  -- Upload history
  CREATE POLICY "Users can view their own upload history" ON upload_history 
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own upload history" ON upload_history 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

  -- Report history
  CREATE POLICY "Users can view their own report history" ON report_history 
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own report history" ON report_history 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);
END $$;

-- Create indexes for better performance
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_upload_history_user_id ON upload_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_report_history_user_id ON report_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_report_history_downloaded_at ON report_history(downloaded_at);
END $$;