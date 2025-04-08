-- Drop existing policies if they exist
DO $$ 
BEGIN
    -- Drop existing policies for transactions
    DROP POLICY IF EXISTS "Public access" ON transactions;
    DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
    DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
    DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
    DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
EXCEPTION 
    WHEN undefined_table THEN 
        NULL;
END $$;

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create secure policies for transactions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can view their own transactions'
    ) THEN
        CREATE POLICY "Users can view their own transactions"
            ON transactions FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can insert their own transactions'
    ) THEN
        CREATE POLICY "Users can insert their own transactions"
            ON transactions FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can update their own transactions'
    ) THEN
        CREATE POLICY "Users can update their own transactions"
            ON transactions FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can delete their own transactions'
    ) THEN
        CREATE POLICY "Users can delete their own transactions"
            ON transactions FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN user_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Create index for user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);