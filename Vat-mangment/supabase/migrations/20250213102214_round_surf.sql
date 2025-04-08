
/*
  # Update transactions table schema

  1. Changes
    - Add missing columns to transactions table:
      - cumulative_balance
      - previous_stage_price
      - previous_stage_vat
    
  2. Notes
    - All new columns are nullable
    - Using numeric type for precise decimal calculations
*/

DO $$ 
BEGIN
  -- Add cumulative_balance column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'cumulative_balance'
  ) THEN
    ALTER TABLE transactions ADD COLUMN cumulative_balance numeric;
  END IF;

  -- Add previous_stage_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'previous_stage_price'
  ) THEN
    ALTER TABLE transactions ADD COLUMN previous_stage_price numeric;
  END IF;

  -- Add previous_stage_vat column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'previous_stage_vat'
  ) THEN
    ALTER TABLE transactions ADD COLUMN previous_stage_vat numeric;
  END IF;
END $$;