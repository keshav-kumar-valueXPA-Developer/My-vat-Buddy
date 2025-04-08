/*
  # Safe Database Setup
  
  1. Tables
    - Creates all required tables if they don't exist
    - Preserves existing data
    - Adds proper constraints and defaults
  
  2. Security
    - Enables RLS on all tables
    - Creates policies for authenticated users
    
  3. Performance
    - Adds indexes for commonly queried fields
*/

-- Create tables safely without dropping existing ones
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT valid_type CHECK (type IN ('Sale', 'Purchase', 'Expense', 'Credit Note', 'Debit Note'))
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  type text NOT NULL,
  description text,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT valid_type CHECK (type IN ('link', 'document'))
);

CREATE TABLE IF NOT EXISTS upload_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  type text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT valid_type CHECK (type IN ('Sales', 'Purchases', 'Expenses', 'Credit Notes', 'Debit Notes'))
);

CREATE TABLE IF NOT EXISTS report_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  date_range text NOT NULL,
  downloaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Enable RLS
DO $$ 
BEGIN
  ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;
  ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
EXCEPTION 
  WHEN others THEN NULL;
END $$;

-- Create policies safely
DO $$ 
BEGIN
  -- Transactions policies
  DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
  CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
  CREATE POLICY "Users can insert their own transactions"
    ON transactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
  CREATE POLICY "Users can update their own transactions"
    ON transactions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
  CREATE POLICY "Users can delete their own transactions"
    ON transactions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

  -- Documents policies
  DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
  CREATE POLICY "Users can view their own documents"
    ON documents FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
  CREATE POLICY "Users can insert their own documents"
    ON documents FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
  CREATE POLICY "Users can update their own documents"
    ON documents FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
  CREATE POLICY "Users can delete their own documents"
    ON documents FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

  -- Upload history policies
  DROP POLICY IF EXISTS "Users can view their own upload history" ON upload_history;
  CREATE POLICY "Users can view their own upload history"
    ON upload_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert their own upload history" ON upload_history;
  CREATE POLICY "Users can insert their own upload history"
    ON upload_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  -- Report history policies
  DROP POLICY IF EXISTS "Users can view their own report history" ON report_history;
  CREATE POLICY "Users can view their own report history"
    ON report_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert their own report history" ON report_history;
  CREATE POLICY "Users can insert their own report history"
    ON report_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
END $$;

-- Create indexes safely
DO $$ 
BEGIN
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_upload_history_user_id ON upload_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_report_history_user_id ON report_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_report_history_downloaded_at ON report_history(downloaded_at);
END $$;