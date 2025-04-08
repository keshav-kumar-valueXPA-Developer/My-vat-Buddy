-- Drop existing tables if they exist
DROP TABLE IF EXISTS report_history;
DROP TABLE IF EXISTS upload_history;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS transactions;

-- Create transactions table
CREATE TABLE transactions (
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
  created_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL CHECK (url ~ '^https?://'),
  type text NOT NULL CHECK (type IN ('link', 'document')),
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create upload_history table
CREATE TABLE upload_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  type text NOT NULL CHECK (type IN ('Sales', 'Purchases', 'Expenses', 'Credit Notes', 'Debit Notes')),
  created_at timestamptz DEFAULT now()
);

-- Create report_history table
CREATE TABLE report_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL CHECK (user_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
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
CREATE POLICY "Public access" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON upload_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON report_history FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_documents_created ON documents(created_at);
CREATE INDEX idx_upload_history_created ON upload_history(created_at);
CREATE INDEX idx_report_history_downloaded ON report_history(downloaded_at);

-- Add sample data
INSERT INTO transactions (date, description, amount, vat_amount, type, category)
VALUES
  (now(), 'Sample Sale', 1000, 50, 'Sale', 'Sales'),
  (now(), 'Sample Purchase', 500, 25, 'Purchase', 'Purchases'),
  (now(), 'Sample Expense', 200, 10, 'Expense', 'Expenses');

INSERT INTO documents (title, url, type, description)
VALUES
  ('VAT Guide', 'https://example.com/vat-guide', 'document', 'UAE VAT Guidelines'),
  ('Tax Calendar', 'https://example.com/tax-calendar', 'link', 'UAE Tax Calendar');