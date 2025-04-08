/*
  # Create report history table

  1. New Tables
    - `report_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `user_email` (text)
      - `date_range` (text)
      - `downloaded_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `report_history` table
    - Add policies for authenticated users to manage their own report history
*/

CREATE TABLE IF NOT EXISTS report_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_email text NOT NULL,
  date_range text NOT NULL,
  downloaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own report history"
  ON report_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own report history"
  ON report_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own report history"
  ON report_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);