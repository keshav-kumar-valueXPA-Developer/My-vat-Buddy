-- Drop and recreate transactions table with proper constraints
DROP TABLE IF EXISTS transactions;

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
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
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
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
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);