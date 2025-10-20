-- ============================================================================
-- CHECK WARMUP DATA IN SUPABASE
-- ============================================================================
-- This script checks if there is any warmup data in the warmup_progress table
-- for the organization: e78e20c1-9c57-41bc-9744-ed6b8f0f1908
-- ============================================================================

-- 1. Check if warmup_progress table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'warmup_progress'
) AS warmup_table_exists;

-- 2. Check table structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'warmup_progress'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Count total warmup records
SELECT COUNT(*) as total_warmup_records
FROM warmup_progress;

-- 4. Count warmup records for specific organization
SELECT COUNT(*) as org_warmup_records
FROM warmup_progress
WHERE organization_id = 'e78e20c1-9c57-41bc-9744-ed6b8f0f1908';

-- 5. Show all warmup data for the organization
SELECT
    username,
    current_day,
    completed,
    start_date,
    completed_date,
    last_update,
    created_at
FROM warmup_progress
WHERE organization_id = 'e78e20c1-9c57-41bc-9744-ed6b8f0f1908'
ORDER BY created_at DESC;

-- 6. Show warmup statistics
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN completed = true THEN 1 END) as completed_count,
    COUNT(CASE WHEN completed = false THEN 1 END) as in_progress_count,
    AVG(current_day) as avg_day
FROM warmup_progress
WHERE organization_id = 'e78e20c1-9c57-41bc-9744-ed6b8f0f1908';

-- 7. Check Instagram accounts for the organization
SELECT
    username,
    creator_id,
    va_id,
    created_at
FROM instagram_accounts
WHERE organization_id = 'e78e20c1-9c57-41bc-9744-ed6b8f0f1908'
ORDER BY created_at DESC;

-- 8. Cross-reference: Instagram accounts vs Warmup data
SELECT
    ig.username as instagram_username,
    ig.creator_id,
    ig.va_id,
    CASE
        WHEN wp.username IS NOT NULL THEN 'Has warmup data'
        ELSE 'No warmup data'
    END as warmup_status,
    wp.current_day,
    wp.completed,
    wp.start_date
FROM instagram_accounts ig
LEFT JOIN warmup_progress wp
    ON ig.username = wp.username
    AND ig.organization_id = wp.organization_id
WHERE ig.organization_id = 'e78e20c1-9c57-41bc-9744-ed6b8f0f1908'
ORDER BY ig.created_at DESC;

-- 9. Check for warmup data without @ prefix (common issue)
SELECT
    username,
    current_day,
    completed,
    start_date
FROM warmup_progress
WHERE organization_id = 'e78e20c1-9c57-41bc-9744-ed6b8f0f1908'
AND username NOT LIKE '@%';

-- 10. Check RLS policies on warmup_progress table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'warmup_progress';

-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================
DO $$
DECLARE
    warmup_count INTEGER;
    instagram_count INTEGER;
    org_exists BOOLEAN;
BEGIN
    -- Check organization
    SELECT EXISTS(
        SELECT 1 FROM organizations
        WHERE id = 'e78e20c1-9c57-41bc-9744-ed6b8f0f1908'
    ) INTO org_exists;

    -- Count warmup records
    SELECT COUNT(*) INTO warmup_count
    FROM warmup_progress
    WHERE organization_id = 'e78e20c1-9c57-41bc-9744-ed6b8f0f1908';

    -- Count Instagram accounts
    SELECT COUNT(*) INTO instagram_count
    FROM instagram_accounts
    WHERE organization_id = 'e78e20c1-9c57-41bc-9744-ed6b8f0f1908';

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'WARMUP DATA DIAGNOSTIC SUMMARY';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Organization exists: %', org_exists;
    RAISE NOTICE 'Instagram accounts in organization: %', instagram_count;
    RAISE NOTICE 'Warmup records in organization: %', warmup_count;
    RAISE NOTICE '============================================================';

    IF warmup_count = 0 AND instagram_count > 0 THEN
        RAISE WARNING 'There are Instagram accounts but NO warmup data in Supabase!';
        RAISE WARNING 'Warmup data may only exist in localStorage.';
    ELSIF warmup_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Warmup data exists in Supabase.';
    ELSIF instagram_count = 0 THEN
        RAISE WARNING 'No Instagram accounts found for this organization.';
    END IF;
END $$;
