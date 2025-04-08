/*
  # Remove authentication dependencies

  1. Changes
    - Remove auth.users foreign key constraints
    - Remove user_id columns
    - Update RLS policies to allow public access
    - Simplify table structures

  2. Security
    - Enable RLS on all tables
    - Add policies for public access
*/

-- Drop existing tables
DROP TABLE IF EXISTS report_history;
DROP TABLE IF EXISTS upload_history;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS transactions;

-- Create tables without auth dependencies
CREATE TABLE transactions (
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
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_type CHECK (type IN ('Sale', 'Purchase', 'Expense', 'Credit Note', 'Debit Note'))
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  type text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_type CHECK (type IN ('link', 'document'))
);

CREATE TABLE upload_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_type CHECK (type IN ('Sales', 'Purchases', 'Expenses', 'Credit Notes', 'Debit Notes'))
);

CREATE TABLE report_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  date_range text NOT NULL,
  downloaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;

-- Create public access policies
CREATE POLICY "Allow public access to transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow public access to documents" ON documents FOR ALL USING (true);
CREATE POLICY "Allow public access to upload history" ON upload_history FOR ALL USING (true);
CREATE POLICY "Allow public access to report history" ON report_history FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_upload_history_created_at ON upload_history(created_at);
CREATE INDEX idx_report_history_downloaded_at ON report_history(downloaded_at);