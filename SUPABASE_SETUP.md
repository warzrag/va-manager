# Supabase Client Setup Guide

Complete setup instructions for the VA Manager Pro Supabase integration.

## Table of Contents
1. [Database Schema](#database-schema)
2. [Configuration](#configuration)
3. [Usage Examples](#usage-examples)
4. [Migration from localStorage](#migration-from-localstorage)
5. [Security Notes](#security-notes)

## Database Schema

### Required Tables

Create these tables in your Supabase project:

#### 1. VAs (Virtual Assistants)
```sql
CREATE TABLE vas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vas_user_id ON vas(user_id);

-- Enable Row Level Security
ALTER TABLE vas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own VAs
CREATE POLICY "Users can view their own VAs" ON vas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own VAs" ON vas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own VAs" ON vas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own VAs" ON vas
  FOR DELETE USING (auth.uid() = user_id);
```

#### 2. Creators
```sql
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_creators_user_id ON creators(user_id);

-- Enable Row Level Security
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own creators" ON creators
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own creators" ON creators
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creators" ON creators
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creators" ON creators
  FOR DELETE USING (auth.uid() = user_id);
```

#### 3. VA-Creator Relationships (Junction Table)
```sql
CREATE TABLE va_creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  va_id UUID NOT NULL REFERENCES vas(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(va_id, creator_id)
);

CREATE INDEX idx_va_creators_va_id ON va_creators(va_id);
CREATE INDEX idx_va_creators_creator_id ON va_creators(creator_id);

-- Enable Row Level Security
ALTER TABLE va_creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own VA-creator relationships" ON va_creators
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vas WHERE vas.id = va_creators.va_id AND vas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own VA-creator relationships" ON va_creators
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM vas WHERE vas.id = va_creators.va_id AND vas.user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own VA-creator relationships" ON va_creators
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM vas WHERE vas.id = va_creators.va_id AND vas.user_id = auth.uid())
  );
```

#### 4. Twitter Accounts
```sql
CREATE TABLE twitter_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password TEXT NOT NULL, -- Encrypted
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  va_id UUID REFERENCES vas(id) ON DELETE CASCADE,
  gmail_id UUID REFERENCES gmail_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_twitter_accounts_user_id ON twitter_accounts(user_id);
CREATE INDEX idx_twitter_accounts_creator_id ON twitter_accounts(creator_id);
CREATE INDEX idx_twitter_accounts_va_id ON twitter_accounts(va_id);
CREATE INDEX idx_twitter_accounts_username ON twitter_accounts(username);

-- Enable Row Level Security
ALTER TABLE twitter_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Twitter accounts" ON twitter_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Twitter accounts" ON twitter_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Twitter accounts" ON twitter_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Twitter accounts" ON twitter_accounts
  FOR DELETE USING (auth.uid() = user_id);
```

#### 5. Instagram Accounts
```sql
CREATE TABLE instagram_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password TEXT NOT NULL, -- Encrypted
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  va_id UUID REFERENCES vas(id) ON DELETE CASCADE,
  gmail_id UUID REFERENCES gmail_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_instagram_accounts_user_id ON instagram_accounts(user_id);
CREATE INDEX idx_instagram_accounts_creator_id ON instagram_accounts(creator_id);
CREATE INDEX idx_instagram_accounts_username ON instagram_accounts(username);

-- Enable Row Level Security
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Instagram accounts" ON instagram_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Instagram accounts" ON instagram_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram accounts" ON instagram_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Instagram accounts" ON instagram_accounts
  FOR DELETE USING (auth.uid() = user_id);
```

#### 6. Gmail Accounts
```sql
CREATE TABLE gmail_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT NOT NULL, -- Encrypted
  va_id UUID REFERENCES vas(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gmail_accounts_user_id ON gmail_accounts(user_id);
CREATE INDEX idx_gmail_accounts_va_id ON gmail_accounts(va_id);
CREATE INDEX idx_gmail_accounts_email ON gmail_accounts(email);

-- Enable Row Level Security
ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Gmail accounts" ON gmail_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Gmail accounts" ON gmail_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Gmail accounts" ON gmail_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Gmail accounts" ON gmail_accounts
  FOR DELETE USING (auth.uid() = user_id);
```

#### 7. Subscriptions
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  va_id UUID NOT NULL REFERENCES vas(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_va_id ON subscriptions(va_id);
CREATE INDEX idx_subscriptions_date ON subscriptions(date);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" ON subscriptions
  FOR DELETE USING (auth.uid() = user_id);
```

#### 8. Revenues
```sql
CREATE TABLE revenues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  va_id UUID NOT NULL REFERENCES vas(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount_usd DECIMAL(10, 2) NOT NULL,
  amount_eur DECIMAL(10, 2) NOT NULL,
  exchange_rate DECIMAL(10, 4) NOT NULL,
  tracking_link TEXT,
  description TEXT,
  commission DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_revenues_user_id ON revenues(user_id);
CREATE INDEX idx_revenues_va_id ON revenues(va_id);
CREATE INDEX idx_revenues_date ON revenues(date);

-- Enable Row Level Security
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own revenues" ON revenues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own revenues" ON revenues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenues" ON revenues
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revenues" ON revenues
  FOR DELETE USING (auth.uid() = user_id);
```

#### 9. Payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  va_id UUID NOT NULL REFERENCES vas(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_va_id ON payments(va_id);
CREATE INDEX idx_payments_date ON payments(date);

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" ON payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments" ON payments
  FOR DELETE USING (auth.uid() = user_id);
```

#### 10. Twitter Stats
```sql
CREATE TABLE twitter_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  date DATE NOT NULL,
  followers_count INTEGER NOT NULL,
  va_id UUID REFERENCES vas(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_twitter_stats_user_id ON twitter_stats(user_id);
CREATE INDEX idx_twitter_stats_username ON twitter_stats(username);
CREATE INDEX idx_twitter_stats_date ON twitter_stats(date);

-- Enable Row Level Security
ALTER TABLE twitter_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Twitter stats" ON twitter_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Twitter stats" ON twitter_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Twitter stats" ON twitter_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Twitter stats" ON twitter_stats
  FOR DELETE USING (auth.uid() = user_id);
```

## Configuration

### 1. Include Supabase Library

Add to your HTML file (before `supabase-client.js`):

```html
<!-- Supabase JS Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Your Supabase Client -->
<script src="supabase-client.js"></script>
```

### 2. Update Configuration

In `supabase-client.js`, replace these values:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

Get these values from your Supabase project settings:
- Project URL: Settings > API > Project URL
- Anon Key: Settings > API > Project API keys > anon/public

### 3. Initialize

```javascript
// Initialize Supabase client
const supabase = initSupabase();
```

## Usage Examples

### Authentication

```javascript
// Sign up a new user
const result = await signUp('user@example.com', 'password123');
if (result.success) {
  console.log('User signed up:', result.user.email);
}

// Sign in
const loginResult = await signIn('user@example.com', 'password123');
if (loginResult.success) {
  console.log('User logged in:', loginResult.user.email);
}

// Check if authenticated
const isAuth = await isAuthenticated();

// Get current user
const user = await getCurrentUser();

// Sign out
await signOut();
```

### VAs (Virtual Assistants)

```javascript
// Create a VA
const va = await createVA({ name: 'Hugo' });

// Get all VAs
const vas = await getVAs();

// Get single VA
const vaData = await getVA(vaId);

// Update VA
await updateVA(vaId, { name: 'Hugo Updated' });

// Delete VA (cascades to related data)
await deleteVA(vaId);
```

### Creators

```javascript
// Create a creator
const creator = await createCreator({ name: 'Justine' });

// Get all creators
const creators = await getCreators();

// Get creators for a specific VA
const vaCreators = await getCreatorsByVA(vaId);

// Update creator
await updateCreator(creatorId, { name: 'Justine Updated' });

// Assign creator to VA
await assignCreatorToVA(vaId, creatorId);

// Remove creator from VA
await removeCreatorFromVA(vaId, creatorId);

// Get all VAs for a creator
const creatorVAs = await getVAsForCreator(creatorId);

// Delete creator
await deleteCreator(creatorId);
```

### Twitter Accounts

```javascript
// Create Twitter account
const account = await createTwitterAccount({
  username: '@justine_pro',
  password: 'secret123',
  creator_id: creatorId,
  va_id: vaId,
  gmail_id: gmailId
});

// Get all Twitter accounts
const accounts = await getTwitterAccounts();

// Get Twitter accounts by VA
const vaAccounts = await getTwitterAccountsByVA(vaId);

// Get Twitter accounts by creator
const creatorAccounts = await getTwitterAccountsByCreator(creatorId);

// Update Twitter account
await updateTwitterAccount(accountId, {
  password: 'newsecret456'
});

// Delete Twitter account
await deleteTwitterAccount(accountId);
```

### Instagram Accounts

```javascript
// Create Instagram account
const igAccount = await createInstagramAccount({
  username: '@justine_ig',
  password: 'secret123',
  creator_id: creatorId,
  va_id: vaId,
  gmail_id: gmailId
});

// Get all Instagram accounts
const igAccounts = await getInstagramAccounts();

// Get by creator
const creatorIgAccounts = await getInstagramAccountsByCreator(creatorId);

// Update
await updateInstagramAccount(accountId, { password: 'newpass' });

// Delete
await deleteInstagramAccount(accountId);
```

### Gmail Accounts

```javascript
// Create Gmail account
const gmail = await createGmailAccount({
  email: 'account@gmail.com',
  password: 'secret123',
  va_id: vaId,
  notes: 'Recovery email set'
});

// Get all Gmail accounts
const gmails = await getGmailAccounts();

// Get by VA
const vaGmails = await getGmailAccountsByVA(vaId);

// Update
await updateGmailAccount(gmailId, {
  notes: 'Updated notes'
});

// Delete
await deleteGmailAccount(gmailId);
```

### Subscriptions

```javascript
// Create subscription entry
const sub = await createSubscription({
  va_id: vaId,
  date: '2025-10-14',
  count: 10,
  amount: 5.00
});

// Get all subscriptions
const subs = await getSubscriptions();

// Get by VA
const vaSubs = await getSubscriptionsByVA(vaId);

// Update
await updateSubscription(subId, { count: 15, amount: 7.50 });

// Delete
await deleteSubscription(subId);
```

### Revenues

```javascript
// Create revenue entry
const revenue = await createRevenue({
  va_id: vaId,
  date: '2025-10-14',
  amount_usd: 100.00,
  amount_eur: 92.50,
  exchange_rate: 0.925,
  tracking_link: 'https://link.com',
  description: 'October revenue',
  commission: 4.63
});

// Get all revenues
const revenues = await getRevenues();

// Get by VA
const vaRevenues = await getRevenuesByVA(vaId);

// Update
await updateRevenue(revenueId, { amount_usd: 120.00 });

// Delete
await deleteRevenue(revenueId);
```

### Payments

```javascript
// Create payment entry
const payment = await createPayment({
  va_id: vaId,
  date: '2025-10-14',
  amount: 500.00,
  description: 'Monthly payment'
});

// Get all payments
const payments = await getPayments();

// Get by VA
const vaPayments = await getPaymentsByVA(vaId);

// Update
await updatePayment(paymentId, { amount: 550.00 });

// Delete
await deletePayment(paymentId);
```

### Twitter Stats

```javascript
// Create Twitter stat entry
const stat = await createTwitterStat({
  username: '@justine_pro',
  date: '2025-10-14',
  followers_count: 1250,
  va_id: vaId,
  creator_id: creatorId
});

// Get all Twitter stats
const stats = await getTwitterStats();

// Get stats for specific username
const userStats = await getTwitterStatsByUsername('@justine_pro');

// Get latest stat for username
const latestStat = await getLatestTwitterStat('@justine_pro');

// Update
await updateTwitterStat(statId, { followers_count: 1300 });

// Delete
await deleteTwitterStat(statId);
```

### Utility Functions

```javascript
// Get complete VA data (with all relationships)
const completeVA = await getCompleteVAData(vaId);
// Returns: { va, creators, twitterAccounts, gmailAccounts, subscriptions, revenues, payments }

// Get complete creator data
const completeCreator = await getCompleteCreatorData(creatorId);
// Returns: { creator, vas, twitterAccounts, instagramAccounts }

// Get all user data (for export/backup)
const allData = await getAllUserData();

// Check database health
const health = await checkDatabaseHealth();
console.log(health.status); // 'healthy' or 'error'
console.log(health.counts); // Record counts
```

## Migration from localStorage

### Automatic Migration

```javascript
// 1. Load data from localStorage
const localData = localStorage.getItem('vaManagerProData');
const data = JSON.parse(localData);

// 2. Ensure user is authenticated
await signIn('user@example.com', 'password');

// 3. Bulk insert all data
const summary = await bulkInsertData({
  vas: data.vas,
  creators: data.creators,
  twitterAccounts: data.twitterAccounts,
  instagramAccounts: data.instagramAccounts,
  gmailAccounts: data.gmailAccounts,
  subs: data.subs,
  revenues: data.revenues,
  vaPayments: data.vaPayments,
  twitterStats: data.twitterStats
});

console.log('Migration complete:', summary);
// Output: { vas: 5, creators: 12, twitterAccounts: 48, ... }
```

### Manual Migration

```javascript
// Migrate VAs
for (const va of localStorageData.vas) {
  await createVA({ name: va.name });
}

// Migrate creators
for (const creator of localStorageData.creators) {
  const newCreator = await createCreator({ name: creator.name });

  // Assign to VAs
  for (const vaId of creator.vaIds) {
    await assignCreatorToVA(vaId, newCreator.id);
  }

  // Migrate Twitter accounts
  for (const account of creator.accounts) {
    await createTwitterAccount({
      username: account.username,
      password: account.password, // Will be encrypted automatically
      creator_id: newCreator.id,
      va_id: account.assignedVaId
    });
  }
}

// Continue with other entities...
```

## Security Notes

### Password Encryption

All passwords are automatically encrypted using **AES-GCM** (256-bit) before being sent to Supabase:

- Twitter account passwords
- Instagram account passwords
- Gmail account passwords

**Important:** The encryption key is stored in `localStorage`. For production use, consider:
1. Deriving the key from the user's password (using PBKDF2)
2. Storing the key in a secure key management system
3. Using Supabase's built-in encryption features

### Row Level Security (RLS)

All tables have RLS enabled, ensuring:
- Users can only access their own data
- Data is isolated per user
- No cross-user data leakage

### Best Practices

1. **Never commit credentials**: Keep `SUPABASE_URL` and `SUPABASE_ANON_KEY` in environment variables
2. **Use HTTPS**: Always access Supabase over HTTPS
3. **Backup regularly**: Export data using `getAllUserData()`
4. **Rotate keys**: If credentials are compromised, rotate your Supabase keys immediately
5. **Monitor usage**: Check Supabase dashboard for unusual activity

### Encryption Key Management

Current implementation stores encryption key in localStorage. For production:

```javascript
// Derive key from user password
async function deriveKeyFromPassword(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}
```

## Troubleshooting

### Common Issues

1. **"User not authenticated"**
   - Solution: Call `signIn()` before any data operations

2. **"PGRST116: The result contains 0 rows"**
   - Solution: Record doesn't exist or user doesn't have access (check RLS policies)

3. **Decryption fails**
   - Solution: Encryption key might have changed. Re-encrypt passwords or restore key

4. **Foreign key violation**
   - Solution: Ensure parent records (VAs, creators) exist before creating child records

### Debug Mode

```javascript
// Enable verbose logging
console.log(await checkDatabaseHealth());

// Check user authentication
const user = await getCurrentUser();
console.log('Current user:', user);

// Test connection
const vas = await getVAs();
console.log('VAs count:', vas.length);
```

## API Reference

See inline JSDoc comments in `supabase-client.js` for complete API documentation.

## Support

For issues or questions:
1. Check the Supabase documentation: https://supabase.com/docs
2. Review the database schema and RLS policies
3. Check browser console for error messages
4. Verify authentication status

---

**Version:** 1.0.0
**Last Updated:** 2025-10-14
**License:** Private Use
