/*
  # Fix Database Schema

  1. Changes
    - Remove all auth dependencies
    - Simplify table structures
    - Add public access policies
    - Add proper indexes
    - Add default values

  2. Security
    - Enable RLS on all tables
    - Add public access policies
    - Add data validation constraints
*/

-- Drop existing tables
DROP TABLE IF EXISTS report_history;
DROP TABLE IF EXISTS upload_history;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS transactions;

-- Create tables without auth dependencies
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz NOT NULL DEFAULT now(),
  document_number text,
  description text NOT NULL,
  ledger_name text DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  type text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  debit numeric DEFAULT 0,
  credit numeric DEFAULT 0,
  cumulative_balance numeric DEFAULT 0,
  previous_stage_price numeric DEFAULT 0,
  previous_stage_vat numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_type CHECK (type IN ('Sale', 'Purchase', 'Expense', 'Credit Note', 'Debit Note')),
  CONSTRAINT positive_amount CHECK (amount >= 0),
  CONSTRAINT valid_vat CHECK (vat_amount >= 0)
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'document',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_type CHECK (type IN ('link', 'document')),
  CONSTRAINT valid_url CHECK (url ~ '^https?://')
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
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_email CHECK (user_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;

-- Create public access policies
CREATE POLICY "Allow public access to transactions"
  ON transactions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to documents"
  ON documents FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to upload history"
  ON upload_history FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to report history"
  ON report_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_documents_created ON documents(created_at);
CREATE INDEX idx_upload_history_created ON upload_history(created_at);
CREATE INDEX idx_report_history_downloaded ON report_history(downloaded_at);

-- Add some sample data for testing
INSERT INTO transactions (date, description, amount, vat_amount, type, category)
VALUES
  (now(), 'Test Sale 1', 1000, 50, 'Sale', 'Sales'),
  (now(), 'Test Purchase 1', 500, 25, 'Purchase', 'Purchases'),
  (now(), 'Test Expense 1', 200, 10, 'Expense', 'Expenses');

INSERT INTO documents (title, url, type, description)
VALUES
  ('Sample Document', 'https://example.com/doc1', 'document', 'Test document'),
  ('Sample Link', 'https://example.com/link1', 'link', 'Test link');