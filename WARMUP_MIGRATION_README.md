# Warmup Data Migration - README

Welcome! This folder contains everything you need to migrate your warmup data from localStorage to Supabase.

## Quick Start (TL;DR)

**Easiest way to migrate:**

1. Open `migrate-warmup.html` in your browser
2. Click "Start Migration"
3. Done!

## Documentation

Choose what you need:

### 🚀 Just want to migrate quickly?
→ Read: **MIGRATION_QUICK_START.md**

### 📚 Want full details and options?
→ Read: **MIGRATION_INSTRUCTIONS.md**

### 📊 Want technical overview?
→ Read: **MIGRATION_SOLUTION_SUMMARY.md**

## Files

| File | What It Does |
|------|--------------|
| **migrate-warmup.html** | Visual migration tool (RECOMMENDED) |
| **warmup-migration.js** | Script for console or embedding |
| **MIGRATION_QUICK_START.md** | Quick reference guide |
| **MIGRATION_INSTRUCTIONS.md** | Complete documentation |
| **MIGRATION_SOLUTION_SUMMARY.md** | Technical overview |
| **WARMUP_MIGRATION_README.md** | This file |

## Three Ways to Migrate

### 1. Visual Tool (Easiest)
Open `migrate-warmup.html` in browser → Click button

### 2. Browser Console (Quick)
Open app.html → F12 → Paste `warmup-migration.js` → Run migration

### 3. Integrated (Permanent)
Add migration to app.html (see MIGRATION_INSTRUCTIONS.md)

## Questions?

1. **Quick help:** See MIGRATION_QUICK_START.md
2. **Detailed help:** See MIGRATION_INSTRUCTIONS.md
3. **Technical details:** See MIGRATION_SOLUTION_SUMMARY.md

## What This Does

- Reads warmup data from your browser's localStorage
- Uploads it to your Supabase database
- Keeps localStorage as backup
- Safe to run multiple times (won't create duplicates)

## When to Use

Run this migration:
- On your PC (if you have warmup data in app.html)
- On JAJA's phone (if there's warmup data in va-dashboard.html)
- Only needs to run once per browser/device

## After Migration

Your warmup data will be:
- ✅ Stored in Supabase (permanent)
- ✅ Synced across devices
- ✅ Safe from browser clearing
- ✅ Still backed up in localStorage

## Get Started

**Recommended:** Open `migrate-warmup.html` and click the button!
