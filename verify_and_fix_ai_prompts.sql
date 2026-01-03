-- Verify and Fix AI Prompts Table
-- Run this in Supabase SQL Editor to ensure the table exists

-- Check if table exists (this will show an error if it doesn't)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_prompts'
    ) THEN
        RAISE NOTICE 'Table ai_prompts does not exist. Creating it...';
        
        -- Create the table
        CREATE TABLE ai_prompts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            persona_id UUID REFERENCES personas(id) ON DELETE CASCADE UNIQUE,
            analysis_prompt TEXT NOT NULL,
            reply_prompt TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create index
        CREATE INDEX idx_ai_prompts_persona ON ai_prompts(persona_id);

        -- Enable RLS
        ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

        -- Create RLS Policies
        CREATE POLICY "Users can view own ai prompts" ON ai_prompts
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM personas 
                    WHERE personas.id = ai_prompts.persona_id 
                    AND personas.user_id = auth.uid()
                )
            );

        CREATE POLICY "Users can insert own ai prompts" ON ai_prompts
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM personas 
                    WHERE personas.id = ai_prompts.persona_id 
                    AND personas.user_id = auth.uid()
                )
            );

        CREATE POLICY "Users can update own ai prompts" ON ai_prompts
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM personas 
                    WHERE personas.id = ai_prompts.persona_id 
                    AND personas.user_id = auth.uid()
                )
            );

        CREATE POLICY "Users can delete own ai prompts" ON ai_prompts
            FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM personas 
                    WHERE personas.id = ai_prompts.persona_id 
                    AND personas.user_id = auth.uid()
                )
            );

        RAISE NOTICE 'Table ai_prompts created successfully!';
    ELSE
        RAISE NOTICE 'Table ai_prompts already exists.';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_prompts'
ORDER BY ordinal_position;

