-- Enhancement script for wire_transfers table
-- Adds new statuses and tracking fields for comprehensive admin management

-- Step 1: Drop existing status constraint
ALTER TABLE public.wire_transfers 
DROP CONSTRAINT IF EXISTS wire_transfers_status_check;

-- Step 2: Add new status constraint with additional statuses
ALTER TABLE public.wire_transfers
ADD CONSTRAINT wire_transfers_status_check 
CHECK (status = ANY (ARRAY[
  'pending'::text, 
  'processing'::text, 
  'completed'::text, 
  'failed'::text, 
  'cancelled'::text,
  'rejected'::text,
  'on_hold'::text,
  'reversed'::text
]));

-- Step 3: Add new tracking columns for rejection
ALTER TABLE public.wire_transfers
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- Step 4: Add new tracking columns for reversal
ALTER TABLE public.wire_transfers
ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP WITH TIME ZONE;

-- Step 5: Add new tracking columns for hold
ALTER TABLE public.wire_transfers
ADD COLUMN IF NOT EXISTS hold_reason TEXT,
ADD COLUMN IF NOT EXISTS held_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS held_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES auth.users(id);

-- Step 6: Add new tracking columns for cancellation
ALTER TABLE public.wire_transfers
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Step 7: Add admin notes field
ALTER TABLE public.wire_transfers
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Step 8: Add updated_by field to track last admin who modified the transfer
ALTER TABLE public.wire_transfers
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Step 9: Add approved_by and approved_at fields
ALTER TABLE public.wire_transfers
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Step 10: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wire_transfers_status ON public.wire_transfers(status);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_user_id ON public.wire_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_created_at ON public.wire_transfers(created_at DESC);

-- Step 11: Create trigger function to clean up mutually exclusive status fields
CREATE OR REPLACE FUNCTION clean_wire_transfer_status_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes, clear fields that are not relevant to the new status
  
  -- Clear rejection fields if status is not rejected
  IF NEW.status != 'rejected' AND (OLD.status IS NULL OR OLD.status = 'rejected') THEN
    NEW.rejection_reason := NULL;
    NEW.rejected_by := NULL;
    NEW.rejected_at := NULL;
  END IF;
  
  -- Clear hold fields if status is not on_hold
  IF NEW.status != 'on_hold' AND (OLD.status IS NULL OR OLD.status = 'on_hold') THEN
    NEW.hold_reason := NULL;
    NEW.held_by := NULL;
    NEW.held_at := NULL;
  END IF;
  
  -- Clear cancellation fields if status is not cancelled
  IF NEW.status != 'cancelled' AND (OLD.status IS NULL OR OLD.status = 'cancelled') THEN
    NEW.cancellation_reason := NULL;
    NEW.cancelled_by := NULL;
    NEW.cancelled_at := NULL;
  END IF;
  
  -- Clear reversal fields if status is not reversed
  IF NEW.status != 'reversed' AND (OLD.status IS NULL OR OLD.status = 'reversed') THEN
    NEW.reversal_reason := NULL;
    NEW.reversed_by := NULL;
    NEW.reversed_at := NULL;
  END IF;
  
  -- Set released fields to NULL when transitioning from on_hold to another status
  IF OLD.status = 'on_hold' AND NEW.status != 'on_hold' THEN
    -- Keep released_at and released_by for audit trail
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create trigger to automatically clean status fields
DROP TRIGGER IF EXISTS wire_transfer_status_cleanup ON public.wire_transfers;
CREATE TRIGGER wire_transfer_status_cleanup
  BEFORE UPDATE OF status ON public.wire_transfers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION clean_wire_transfer_status_fields();

-- Verification query to check the table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'wire_transfers'
-- ORDER BY ordinal_position;

-- Note: This migration adds automatic cleanup of mutually exclusive status fields
-- to maintain data integrity. When a wire transfer status changes, fields related
-- to the old status are automatically cleared.
