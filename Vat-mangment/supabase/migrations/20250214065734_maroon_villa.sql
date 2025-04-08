-- Create transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz NOT NULL DEFAULT now(),
  document_number text,
  description text NOT NULL,
  ledger_name text DEFAULT '',
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  vat_amount numeric NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  type text NOT NULL CHECK (type IN ('Sale', 'Purchase', 'Expense', 'Credit Note', 'Debit Note')),
  category text NOT NULL DEFAULT 'Other',
  debit numeric DEFAULT 0,
  credit numeric DEFAULT 0,
  cumulative_balance numeric DEFAULT 0,
  previous_stage_price numeric DEFAULT 0,
  previous_stage_vat numeric DEFAULT 0,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

-- Create new policies
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Add some sample data for testing
INSERT INTO transactions (
  date, 
  description, 
  amount, 
  vat_amount, 
  type, 
  category,
  user_id
)
SELECT
  now(),
  'Sample Transaction ' || n,
  1000 * n,
  50 * n,
  CASE (n % 3)
    WHEN 0 THEN 'Sale'
    WHEN 1 THEN 'Purchase'
    ELSE 'Expense'
  END,
  CASE (n % 3)
    WHEN 0 THEN 'Sales'
    WHEN 1 THEN 'Purchases'
    ELSE 'Expenses'
  END,
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
FROM generate_series(1, 5) n
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;