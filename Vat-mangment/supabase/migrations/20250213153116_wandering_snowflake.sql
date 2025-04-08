-- Drop existing policies if they exist
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own report history" ON report_history;
    DROP POLICY IF EXISTS "Users can insert their own report history" ON report_history;
EXCEPTION 
    WHEN undefined_table THEN 
        NULL;
END $$;

-- Create table if it doesn't exist
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

-- Create policies safely
DO $$ 
BEGIN
    -- Create policies only if they don't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'report_history' 
        AND policyname = 'Users can view their own report history'
    ) THEN
        CREATE POLICY "Users can view their own report history"
          ON report_history
          FOR SELECT
          TO authenticated
          USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'report_history' 
        AND policyname = 'Users can insert their own report history'
    ) THEN
        CREATE POLICY "Users can insert their own report history"
          ON report_history
          FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Add indexes safely
CREATE INDEX IF NOT EXISTS idx_report_history_user_id ON report_history(user_id);
CREATE INDEX IF NOT EXISTS idx_report_history_downloaded_at ON report_history(downloaded_at);