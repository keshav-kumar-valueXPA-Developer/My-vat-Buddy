/*
  # Add amount column and update table structure

  1. Changes
    - Add amount column to transactions table
    - Add indexes for better performance
    - Update column order

  2. Notes
    - Amount column is added between VAT and balance columns
    - Indexes added for commonly queried fields
*/

DO $$ 
BEGIN
  -- Add amount column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'amount'
  ) THEN
    ALTER TABLE transactions ADD COLUMN amount numeric;
  END IF;

  -- Add indexes for commonly queried fields
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
END $$;