/*
  # Fix transactions table and data visibility

  1. Changes:
    - Recreate transactions table with proper structure
    - Add NOT NULL constraint to user_id
    - Add CASCADE on delete for user references
    - Update RLS policies
    - Add proper indexes

  2. Security:
    - Enable RLS
    - Add policies for authenticated users
    - Ensure proper user_id checks
*/

-- Backup existing data if any exists
CREATE TABLE IF NOT EXISTS transactions_backup AS 
SELECT * FROM transactions;

-- Drop and recreate transactions table with proper structure
DROP TABLE IF EXISTS transactions;

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
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
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create secure policies
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- Restore backed up data if exists and associate with users
INSERT INTO transactions (
  id, user_id, date, document_number, description, 
  ledger_name, amount, vat_amount, type, category,
  debit, credit, cumulative_balance, 
  previous_stage_price, previous_stage_vat, created_at
)
SELECT 
  b.id,
  COALESCE(b.user_id, (SELECT id FROM auth.users WHERE email = b.description LIMIT 1)),
  b.date,
  b.document_number,
  b.description,
  b.ledger_name,
  b.amount,
  b.vat_amount,
  b.type,
  b.category,
  b.debit,
  b.credit,
  b.cumulative_balance,
  b.previous_stage_price,
  b.previous_stage_vat,
  b.created_at
FROM transactions_backup b
WHERE EXISTS (
  SELECT 1 FROM auth.users 
  WHERE id = b.user_id 
  OR email = b.description
)
ON CONFLICT (id) DO NOTHING;

-- Drop backup table
DROP TABLE IF EXISTS transactions_backup;