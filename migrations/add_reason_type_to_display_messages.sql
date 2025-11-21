-- ============================================================================
-- MIGRATION: Add reason_type column to restriction_display_messages table
-- This column links display messages to either restriction or restoration reasons
-- ============================================================================

ALTER TABLE public.restriction_display_messages
ADD COLUMN reason_type text DEFAULT 'restriction' CHECK (reason_type IN ('restriction', 'restoration'));

-- ============================================================================
-- Create index on reason_type for better query performance
-- ============================================================================

CREATE INDEX idx_restriction_display_messages_reason_type 
ON public.restriction_display_messages(reason_type);

-- ============================================================================
-- Verification query (uncomment to test)
-- ============================================================================

-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'restriction_display_messages'
-- ORDER BY ordinal_position;
