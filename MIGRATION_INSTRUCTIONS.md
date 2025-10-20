# Warmup Data Migration Instructions

This guide will help you migrate existing localStorage warmup data to Supabase.

## Overview

The migration script reads warmup progress data from browser localStorage and uploads it to your Supabase database. It handles:

- ✅ Reading existing localStorage data
- ✅ Checking for duplicate entries
- ✅ Smart updates (only updates if local data is newer)
- ✅ Error handling and detailed logging
- ✅ One-time execution (won't run twice unless you want it to)

## Files

- **warmup-migration.js** - The migration script
- **MIGRATION_INSTRUCTIONS.md** - This file

---

## Option 1: Run in Browser Console (Recommended for One-Time Migration)

This is the easiest method for a one-time migration.

### Steps:

1. **Open the app**
   - Navigate to `app.html` in your browser
   - Make sure you are logged in

2. **Open the browser console**
   - Press `F12` or right-click and select "Inspect"
   - Go to the "Console" tab

3. **Copy and paste the script**
   - Open `warmup-migration.js` in a text editor
   - Copy the entire contents (Ctrl+A, Ctrl+C)
   - Paste into the browser console (Ctrl+V)
   - Press Enter

4. **Run the migration**
   - Type in the console:
     ```javascript
     await migrateWarmupToSupabase()
     ```
   - Press Enter

5. **Review the results**
   - The script will show a detailed summary of what was migrated
   - Check for any errors in the output

### On JAJA's Phone (va-dashboard.html):

Same steps as above, but open `va-dashboard.html` instead of `app.html`.

---

## Option 2: Add Migration Button to UI

This adds a button to the app that users can click to migrate their data.

### For app.html:

1. **Add the migration script**

   Open `/mnt/d/claude/Leny/app.html` and find the section where other scripts are loaded (usually near the end before `</body>`).

   Add this before the closing `</script>` tag:

   ```javascript
   // ============================================================================
   // WARMUP MIGRATION TO SUPABASE
   // ============================================================================

   // Paste the entire contents of warmup-migration.js here
   // (or load it as an external script: <script src="warmup-migration.js"></script>)
   ```

2. **Add migration button to the UI**

   Find the warmup management section (search for "Warmup Management" or look for the warmup accounts list).

   Add this button somewhere visible (e.g., near the warmup section header):

   ```html
   <button onclick="runWarmupMigration()" style="
       background: linear-gradient(135deg, #10b981 0%, #059669 100%);
       color: white;
       border: none;
       padding: 0.75rem 1.5rem;
       border-radius: 0.5rem;
       cursor: pointer;
       font-weight: 600;
       margin: 1rem 0;
   ">
       🔄 Migrate Warmup Data to Supabase
   </button>
   ```

3. **Add the button handler**

   Add this function to your JavaScript (near other warmup functions):

   ```javascript
   async function runWarmupMigration() {
       if (!confirm('This will migrate your warmup data from localStorage to Supabase. Continue?')) {
           return;
       }

       try {
           showSuccess('Starting migration...');
           const result = await migrateWarmupToSupabase();

           if (result.status === 'success') {
               showSuccess(`Migration complete! Migrated: ${result.migrated}, Updated: ${result.updated}, Skipped: ${result.skipped}`);
           } else if (result.status === 'partial') {
               showError(`Migration completed with errors. Migrated: ${result.migrated}, Errors: ${result.errors}`);
           } else {
               showError('Migration failed: ' + result.reason);
           }
       } catch (error) {
           console.error('Migration error:', error);
           showError('Migration failed. Check console for details.');
       }
   }
   ```

### For va-dashboard.html:

Same steps as above, but make modifications to `/mnt/d/claude/Leny/va-dashboard.html`.

---

## Option 3: Auto-Run on Page Load (One-Time)

This automatically runs the migration the first time a user loads the page.

### For app.html:

1. **Add the migration script** (same as Option 2, step 1)

2. **Add auto-run code**

   Find the `DOMContentLoaded` event listener or initialization function (usually near the bottom of the JavaScript).

   Add this code:

   ```javascript
   // Auto-run warmup migration on first load
   window.addEventListener('DOMContentLoaded', async () => {
       // Wait a bit for Supabase to initialize
       setTimeout(async () => {
           const migrationCompleted = localStorage.getItem('warmupMigrationCompleted');
           const warmupData = localStorage.getItem('warmupProgress');

           // Only run if not already completed and there's data to migrate
           if (!migrationCompleted && warmupData) {
               console.log('🔄 Auto-running warmup migration...');
               try {
                   const result = await migrateWarmupToSupabase();
                   if (result.status === 'success') {
                       console.log('✅ Auto-migration completed successfully');
                   }
               } catch (error) {
                   console.error('❌ Auto-migration failed:', error);
               }
           }
       }, 2000); // Wait 2 seconds for Supabase initialization
   });
   ```

---

## Verification

After running the migration, verify it worked:

### 1. Check the Console Output

Look for messages like:
```
✅ Successfully upserted username
🎉 MIGRATION SUMMARY
Total accounts:     5
✅ Migrated (new):  5
```

### 2. Check Supabase Database

1. Go to your Supabase dashboard
2. Navigate to the Table Editor
3. Open the `warmup_progress` table
4. Verify your warmup accounts are there with correct data

### 3. Check in the App

1. Refresh `app.html`
2. Go to the Warmup Management section
3. Verify all warmup accounts show up correctly with their progress

---

## Troubleshooting

### "Supabase client not available"

**Solution:** Make sure you're on `app.html` or `va-dashboard.html` and the page has fully loaded.

### "No organization ID found"

**Solution:** Make sure you're logged in. The script needs an organization ID to save data.

### "Migration already completed"

**Solution:** The script has already run. To run again:
```javascript
resetMigrationFlag()
await migrateWarmupToSupabase()
```

### Errors during migration

**Solution:**
1. Check the console for specific error messages
2. Verify your Supabase credentials are correct
3. Check that the `warmup_progress` table exists in Supabase
4. Ensure you have write permissions

### Want to test without writing to database

**Solution:** In the migration script, set:
```javascript
const MIGRATION_CONFIG = {
    dryRun: true,  // Set this to true
    verbose: true
};
```

---

## Advanced Usage

### Check Migration Status

```javascript
checkMigrationStatus()
```

Shows:
- Whether migration has been completed
- How many accounts are in localStorage
- When migration was last run

### Force Re-run Migration

```javascript
resetMigrationFlag()
await migrateWarmupToSupabase()
```

### Enable Verbose Logging

Edit the migration script:
```javascript
const MIGRATION_CONFIG = {
    verbose: true,  // Set to true for detailed logs
    dryRun: false
};
```

---

## What Gets Migrated

For each warmup account, the following data is migrated:

- ✅ Username
- ✅ Current day (1-6)
- ✅ Completed status (true/false)
- ✅ Start date
- ✅ Last update timestamp
- ✅ Completed date (if applicable)
- ✅ Organization ID (automatically added)

---

## Safety Features

1. **Idempotent** - Safe to run multiple times, won't create duplicates
2. **Smart Updates** - Only updates if local data is newer than Supabase
3. **Non-Destructive** - Doesn't delete localStorage data (keeps as backup)
4. **One-Time Flag** - Won't accidentally run twice
5. **Dry Run Mode** - Test without writing to database

---

## Support

If you encounter issues:

1. Check the console for error messages
2. Review the "Troubleshooting" section above
3. Check that Supabase is properly configured
4. Verify the `warmup_progress` table exists with the correct schema

---

## Recommended Approach

**For PC (app.html):**
- Use **Option 1** (Browser Console) for immediate one-time migration

**For JAJA's Phone (va-dashboard.html):**
- Use **Option 1** (Browser Console) or
- Use **Option 2** (Add Button) for easier mobile usage

**For Future Users:**
- Use **Option 3** (Auto-Run) so new users automatically migrate their data
