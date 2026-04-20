/**
 * WARMUP DATA MIGRATION SCRIPT
 *
 * This script migrates existing localStorage warmup data to Supabase.
 * It reads warmup progress from localStorage and uploads it using the Supabase API.
 *
 * USAGE OPTIONS:
 *
 * Option 1 - Run in Browser Console:
 *   1. Open app.html or va-dashboard.html
 *   2. Open browser console (F12)
 *   3. Copy and paste this entire script
 *   4. Run: await migrateWarmupToSupabase()
 *
 * Option 2 - Add Migration Button to UI:
 *   See instructions in MIGRATION_INSTRUCTIONS.md
 *
 * Option 3 - Auto-run on Page Load (runs once):
 *   Add to app.html after Supabase initialization
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const MIGRATION_CONFIG = {
    // Set to true to see detailed logs
    verbose: true,

    // Set to true to do a dry run (no actual database writes)
    dryRun: false,

    // localStorage key for warmup data
    localStorageKey: 'warmupProgress',

    // localStorage key to track if migration has been completed
    migrationCompleteKey: 'warmupMigrationCompleted'
};

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Get the active organization ID
 */
async function getOrganizationId() {
    // Try to get from localStorage first
    const activeOrgId = localStorage.getItem('activeOrganizationId');
    if (activeOrgId) {
        console.log('📂 Using organization from localStorage:', activeOrgId);
        return activeOrgId;
    }

    // If not found, try to get from Supabase
    if (typeof supabase !== 'undefined' && supabase) {
        try {
            const { data: orgs, error } = await supabase
                .from('organizations')
                .select('id')
                .limit(1);

            if (error) {
                console.error('❌ Error fetching organization:', error);
                return null;
            }

            if (orgs && orgs.length > 0) {
                console.log('📂 Found organization from Supabase:', orgs[0].id);
                return orgs[0].id;
            }
        } catch (e) {
            console.error('❌ Exception fetching organization:', e);
        }
    }

    console.error('❌ No organization ID found. Please ensure you are logged in.');
    return null;
}

/**
 * Load warmup data from localStorage
 */
function loadLocalStorageWarmupData() {
    try {
        const warmupDataStr = localStorage.getItem(MIGRATION_CONFIG.localStorageKey);

        if (!warmupDataStr) {
            console.log('ℹ️ No warmup data found in localStorage');
            return null;
        }

        const warmupData = JSON.parse(warmupDataStr);
        const accountCount = Object.keys(warmupData).length;

        console.log(`✅ Found ${accountCount} warmup accounts in localStorage`);

        if (MIGRATION_CONFIG.verbose) {
            console.log('📊 Warmup data:', warmupData);
        }

        return warmupData;
    } catch (error) {
        console.error('❌ Error reading localStorage warmup data:', error);
        return null;
    }
}

/**
 * Check if an account already exists in Supabase
 */
async function checkAccountExistsInSupabase(username, organizationId) {
    try {
        const cleanUsername = username.replace('@', '');

        const { data, error } = await supabase
            .from('warmup_progress')
            .select('username, current_day, completed')
            .eq('username', cleanUsername)
            .eq('organization_id', organizationId)
            .limit(1);

        if (error) {
            console.error(`❌ Error checking account ${username}:`, error);
            return { exists: false, data: null };
        }

        return {
            exists: data && data.length > 0,
            data: data && data.length > 0 ? data[0] : null
        };
    } catch (error) {
        console.error(`❌ Exception checking account ${username}:`, error);
        return { exists: false, data: null };
    }
}

/**
 * Upsert warmup progress to Supabase
 */
async function upsertWarmupProgress(username, progress, organizationId) {
    const cleanUsername = username.replace('@', '');

    const warmupRecord = {
        username: cleanUsername,
        organization_id: organizationId,
        current_day: progress.currentDay || 1,
        completed: progress.completed || false,
        start_date: progress.startDate || new Date().toISOString(),
        last_update: progress.lastUpdate || new Date().toISOString(),
        completed_date: progress.completedDate || null
    };

    if (MIGRATION_CONFIG.verbose) {
        console.log(`📤 Upserting record for ${username}:`, warmupRecord);
    }

    if (MIGRATION_CONFIG.dryRun) {
        console.log(`🔍 DRY RUN: Would upsert ${username}`);
        return { success: true, action: 'dry-run' };
    }

    try {
        const { data, error } = await supabase
            .from('warmup_progress')
            .upsert(warmupRecord, {
                onConflict: 'username,organization_id'
            });

        if (error) {
            console.error(`❌ Error upserting ${username}:`, error);
            return { success: false, error };
        }

        console.log(`✅ Successfully upserted ${username}`);
        return { success: true, data };
    } catch (error) {
        console.error(`❌ Exception upserting ${username}:`, error);
        return { success: false, error };
    }
}

/**
 * Main migration function
 */
async function migrateWarmupToSupabase() {
    console.log('🚀 Starting warmup data migration to Supabase...');
    console.log('');

    // Check if migration already completed
    const migrationCompleted = localStorage.getItem(MIGRATION_CONFIG.migrationCompleteKey);
    if (migrationCompleted && !MIGRATION_CONFIG.dryRun) {
        console.log('ℹ️ Migration already completed on:', new Date(migrationCompleted).toLocaleString());
        console.log('ℹ️ To re-run migration, delete the localStorage key:', MIGRATION_CONFIG.migrationCompleteKey);

        const forceRerun = confirm('Migration already completed. Do you want to run it again?');
        if (!forceRerun) {
            return {
                status: 'skipped',
                reason: 'Migration already completed'
            };
        }
    }

    // Check Supabase availability
    if (typeof supabase === 'undefined' || !supabase) {
        console.error('❌ Supabase client not available. Please ensure you are on app.html or va-dashboard.html');
        return {
            status: 'error',
            reason: 'Supabase client not available'
        };
    }

    // Get organization ID
    const organizationId = await getOrganizationId();
    if (!organizationId) {
        console.error('❌ Cannot migrate without organization ID');
        return {
            status: 'error',
            reason: 'No organization ID found'
        };
    }

    // Load localStorage data
    const warmupData = loadLocalStorageWarmupData();
    if (!warmupData || Object.keys(warmupData).length === 0) {
        console.log('ℹ️ No warmup data to migrate');
        return {
            status: 'success',
            migrated: 0,
            skipped: 0,
            errors: 0,
            reason: 'No data to migrate'
        };
    }

    // Migration statistics
    const stats = {
        total: Object.keys(warmupData).length,
        migrated: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        details: []
    };

    console.log(`📊 Found ${stats.total} accounts to migrate`);
    console.log('');

    // Process each account
    for (const [username, progress] of Object.entries(warmupData)) {
        console.log(`\n🔄 Processing: ${username}`);

        // Check if already exists
        const { exists, data: existingData } = await checkAccountExistsInSupabase(username, organizationId);

        if (exists && existingData) {
            console.log(`ℹ️ Account ${username} already exists in Supabase`);
            console.log(`   Current: Day ${existingData.current_day}, Completed: ${existingData.completed}`);
            console.log(`   Local:   Day ${progress.currentDay}, Completed: ${progress.completed}`);

            // Decide whether to update
            const shouldUpdate = progress.currentDay > existingData.current_day ||
                                 (progress.completed && !existingData.completed);

            if (shouldUpdate) {
                console.log(`   📝 Local data is more recent, updating...`);
                const result = await upsertWarmupProgress(username, progress, organizationId);

                if (result.success) {
                    stats.updated++;
                    stats.details.push({ username, action: 'updated', success: true });
                } else {
                    stats.errors++;
                    stats.details.push({ username, action: 'update-failed', error: result.error });
                }
            } else {
                console.log(`   ⏭️ Supabase data is up-to-date, skipping`);
                stats.skipped++;
                stats.details.push({ username, action: 'skipped', reason: 'already-up-to-date' });
            }
        } else {
            console.log(`📥 New account, inserting...`);
            const result = await upsertWarmupProgress(username, progress, organizationId);

            if (result.success) {
                stats.migrated++;
                stats.details.push({ username, action: 'inserted', success: true });
            } else {
                stats.errors++;
                stats.details.push({ username, action: 'insert-failed', error: result.error });
            }
        }
    }

    // Print summary
    console.log('\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('🎉 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Total accounts:     ${stats.total}`);
    console.log(`✅ Migrated (new):  ${stats.migrated}`);
    console.log(`📝 Updated:         ${stats.updated}`);
    console.log(`⏭️ Skipped:         ${stats.skipped}`);
    console.log(`❌ Errors:          ${stats.errors}`);
    console.log('═══════════════════════════════════════════════════');

    if (stats.errors > 0) {
        console.log('\n❌ Migration completed with errors. Check details above.');
    } else {
        console.log('\n✅ Migration completed successfully!');
    }

    // Mark migration as completed
    if (!MIGRATION_CONFIG.dryRun && stats.errors === 0) {
        localStorage.setItem(MIGRATION_CONFIG.migrationCompleteKey, new Date().toISOString());
        console.log('✅ Migration marked as completed in localStorage');
    }

    return {
        status: stats.errors === 0 ? 'success' : 'partial',
        ...stats
    };
}

/**
 * Check migration status
 */
function checkMigrationStatus() {
    const migrationCompleted = localStorage.getItem(MIGRATION_CONFIG.migrationCompleteKey);
    const warmupData = loadLocalStorageWarmupData();

    console.log('═══════════════════════════════════════════════════');
    console.log('📊 MIGRATION STATUS');
    console.log('═══════════════════════════════════════════════════');

    if (migrationCompleted) {
        console.log('✅ Migration completed on:', new Date(migrationCompleted).toLocaleString());
    } else {
        console.log('❌ Migration not yet completed');
    }

    if (warmupData) {
        const accountCount = Object.keys(warmupData).length;
        console.log(`📦 localStorage has ${accountCount} warmup accounts`);
    } else {
        console.log('📦 No warmup data in localStorage');
    }

    console.log('═══════════════════════════════════════════════════');
}

/**
 * Reset migration flag (for testing)
 */
function resetMigrationFlag() {
    localStorage.removeItem(MIGRATION_CONFIG.migrationCompleteKey);
    console.log('✅ Migration flag reset. You can now re-run the migration.');
}

// ============================================================================
// EXPORT FOR CONSOLE USE
// ============================================================================

// Make functions available in console
if (typeof window !== 'undefined') {
    window.migrateWarmupToSupabase = migrateWarmupToSupabase;
    window.checkMigrationStatus = checkMigrationStatus;
    window.resetMigrationFlag = resetMigrationFlag;

    console.log('📋 Warmup Migration Script Loaded!');
    console.log('');
    console.log('Available commands:');
    console.log('  • await migrateWarmupToSupabase() - Run the migration');
    console.log('  • checkMigrationStatus()           - Check migration status');
    console.log('  • resetMigrationFlag()             - Reset migration flag');
    console.log('');
}
