-- Migration: Remove legacy phone and email columns
-- This migration removes the old phone and email columns since we now use phones and emails arrays
-- Run this only after confirming all applications are using the new array fields

-- First, let's check if there are any records that still only have data in the old columns
-- and haven't been migrated to the new arrays (safety check)

-- Check for phones that haven't been migrated
DO $$
DECLARE
    unmigrated_phones_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmigrated_phones_count
    FROM people
    WHERE phone IS NOT NULL AND phone != '' 
    AND (phones IS NULL OR phones = '[]'::jsonb);
    
    IF unmigrated_phones_count > 0 THEN
        RAISE EXCEPTION 'Found % records with phone data that has not been migrated to phones array. Please run the migration first.', unmigrated_phones_count;
    END IF;
END
$$;

-- Check for emails that haven't been migrated
DO $$
DECLARE
    unmigrated_emails_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmigrated_emails_count
    FROM people
    WHERE email IS NOT NULL AND email != '' 
    AND (emails IS NULL OR emails = '[]'::jsonb);
    
    IF unmigrated_emails_count > 0 THEN
        RAISE EXCEPTION 'Found % records with email data that has not been migrated to emails array. Please run the migration first.', unmigrated_emails_count;
    END IF;
END
$$;

-- If we reach here, it's safe to drop the old columns
ALTER TABLE people DROP COLUMN IF EXISTS phone;
ALTER TABLE people DROP COLUMN IF EXISTS email;

-- Add comment to document the change
COMMENT ON TABLE people IS 'Contact information table. Uses phones and emails JSONB arrays instead of legacy phone and email columns.';