/*
  # Initial schema setup for VAT Calculator

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key)
      - `date` (timestamptz)
      - `document_number` (text)
      - `description` (text)
      - `ledger_name` (text)
      - `amount` (numeric)
      - `vat_amount` (numeric)
      - `type` (text)
      - `category` (text)
      - `debit` (numeric)
      - `credit` (numeric)
      - `cumulative_balance` (numeric)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamptz)

    - `documents`
      - `id` (uuid, primary key)
      - `title` (text)
      - `url` (text)
      - `type` (text)
      - `description` (text)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamptz)

    - `upload_history`
      - `id` (uuid, primary key)
      - `filename` (text)
      - `type` (text)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz NOT NULL,
  document_number text,
  description text NOT NULL,
  ledger_name text,
  amount numeric NOT NULL,
  vat_amount numeric NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  debit numeric,
  credit numeric,
  cumulative_balance numeric,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  type text NOT NULL,
  description text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create upload_history table
CREATE TABLE IF NOT EXISTS upload_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  type text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for documents
CREATE POLICY "Users can view their own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for upload_history
CREATE POLICY "Users can view their own upload history"
  ON upload_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upload history"
  ON upload_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);