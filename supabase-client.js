/**
 * Supabase Client for VA Manager Pro
 * Complete API functions to replace localStorage operations
 *
 * Features:
 * - Supabase client initialization
 * - User authentication helpers
 * - Password encryption/decryption (AES-GCM)
 * - Complete CRUD operations for all entities
 * - Error handling and logging
 * - Multi-VA creator assignments
 */

// ============================================================================
// INITIALIZATION & CONFIGURATION
// ============================================================================

// Import Supabase client (ensure this is loaded from CDN or npm)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Initialize Supabase client - Prevent double declaration
if (typeof supabase === 'undefined') {
    var supabase;
}

// ============================================================================
// MEMORY CACHE SYSTEM - Avoid redundant API calls
// ============================================================================

const memoryCache = {
  data: new Map(),
  ttl: new Map(), // Time-to-live for each cache entry

  // Set cache with optional TTL (default 30 seconds)
  set(key, value, ttlMs = 30000) {
    this.data.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
  },

  // Get from cache if not expired
  get(key) {
    const expiry = this.ttl.get(key);
    if (!expiry || Date.now() > expiry) {
      this.data.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.data.get(key);
  },

  // Check if cache is valid
  has(key) {
    return this.get(key) !== null;
  },

  // Clear specific key or all cache
  clear(key = null) {
    if (key) {
      this.data.delete(key);
      this.ttl.delete(key);
    } else {
      this.data.clear();
      this.ttl.clear();
    }
  },

  // Clear cache for organization-specific data (when switching orgs)
  clearOrgCache() {
    for (const key of this.data.keys()) {
      if (key.startsWith('org_')) {
        this.data.delete(key);
        this.ttl.delete(key);
      }
    }
  }
};

function initSupabase() {
  try {
    // Check if config is available
    if (typeof SUPABASE_CONFIG === 'undefined') {
      throw new Error('SUPABASE_CONFIG not found. Please include config.js before this script.');
    }

    // Check if Supabase library is loaded
    if (typeof window.supabase === 'undefined') {
      console.warn('⏳ Supabase library not yet loaded, will retry...');
      return null;
    }

    // Create client using the standard UMD export
    if (typeof window.supabase.createClient === 'function') {
      supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      console.log('✅ Supabase client initialized');
      return supabase;
    } else {
      console.error('❌ window.supabase exists but createClient is not a function');
      console.log('window.supabase:', window.supabase);
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    return null;
  }
}

// Auto-retry initialization
let supabaseInitAttempts = 0;
function ensureSupabaseInit() {
  if (supabase) return Promise.resolve(supabase);

  return new Promise((resolve, reject) => {
    const tryInit = () => {
      supabaseInitAttempts++;
      const result = initSupabase();
      if (result) {
        resolve(result);
      } else if (supabaseInitAttempts < 20) {
        setTimeout(tryInit, 250);
      } else {
        reject(new Error('Failed to initialize Supabase after 20 attempts'));
      }
    };
    tryInit();
  });
}

// ============================================================================
// ENCRYPTION UTILITIES (Web Crypto API - AES-GCM)
// ============================================================================

// Generate a random encryption key (store this securely!)
// In production, derive this from user's password or store in secure location
const ENCRYPTION_KEY_STORAGE = 'va_manager_encryption_key';

/**
 * Simple obfuscation for backward compatibility
 * @param {string} password - Plain text password
 * @returns {string} - Obfuscated password
 */
function obfuscatePassword(password) {
  // Avertissement: Ceci n'est PAS une vraie sécurité!
  // Pour une vraie sécurité, utilisez un serveur backend
  return btoa(password).split('').reverse().join('');
}

/**
 * Deobfuscate password for backward compatibility
 * @param {string} obfuscated - Obfuscated password
 * @returns {string} - Plain text password
 */
function deobfuscatePassword(obfuscated) {
  // Pour la compatibilité avec les anciennes données
  try {
    return atob(obfuscated.split('').reverse().join(''));
  } catch {
    // Si ça échoue, c'est probablement un ancien mot de passe non obfusqué
    return obfuscated;
  }
}

async function getEncryptionKey() {
  try {
    // Try to get existing key from localStorage
    const storedKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE);

    if (storedKey) {
      // Import the stored key
      const keyData = JSON.parse(storedKey);
      return await crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    }

    // Generate new key if none exists
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Export and store the key
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem(ENCRYPTION_KEY_STORAGE, JSON.stringify(exportedKey));

    return key;
  } catch (error) {
    console.error('❌ Error getting encryption key:', error);
    throw error;
  }
}

/**
 * Encrypt a password using AES-GCM
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Encrypted password (base64 encoded)
 */
async function encryptPassword(password) {
  try {
    if (!password) return '';

    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    const encodedPassword = new TextEncoder().encode(password);

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encodedPassword
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('❌ Encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt a password using AES-GCM
 * @param {string} encryptedPassword - Encrypted password (base64 encoded)
 * @returns {Promise<string>} - Plain text password
 */
async function decryptPassword(encryptedPassword) {
  try {
    if (!encryptedPassword) return '';

    // Si ce n'est pas du base64 valide (ancien format), retourner tel quel
    if (typeof encryptedPassword !== 'string' || encryptedPassword.length < 20) {
      return encryptedPassword || '';
    }

    const key = await getEncryptionKey();

    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedPassword).split('').map(c => c.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    // ⚠️ Si déchiffrement échoue, retourner le mot de passe tel quel (backward compat)
    console.warn('⚠️ Decryption failed for password, using plaintext fallback:', error.message);
    return encryptedPassword || '';
  }
}

/**
 * Batch encrypt passwords in an object
 * @param {Object} obj - Object with password fields
 * @param {Array<string>} fields - Fields to encrypt (default: ['password'])
 * @returns {Promise<Object>} - Object with encrypted passwords
 */
async function encryptPasswordFields(obj, fields = ['password']) {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field]) {
      result[field] = await encryptPassword(result[field]);
    }
  }
  return result;
}

/**
 * Batch decrypt passwords in an object
 * @param {Object} obj - Object with encrypted password fields
 * @param {Array<string>} fields - Fields to decrypt (default: ['password'])
 * @returns {Promise<Object>} - Object with decrypted passwords
 */
async function decryptPasswordFields(obj, fields = ['password']) {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field]) {
      result[field] = await decryptPassword(result[field]);
    }
  }
  return result;
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} - User object or null
 */
async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('❌ Error getting user:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('❌ Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
async function isAuthenticated() {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Get current user ID (throws if not authenticated)
 * @returns {Promise<string>}
 */
async function getUserId() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    console.log('✅ User signed in:', data.user.email);
    return { success: true, user: data.user };
  } catch (error) {
    console.error('❌ Sign in error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign up with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;

    console.log('✅ User signed up:', data.user.email);
    return { success: true, user: data.user };
  } catch (error) {
    console.error('❌ Sign up error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign out current user
 * @returns {Promise<Object>}
 */
async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    console.log('✅ User signed out');
    return { success: true };
  } catch (error) {
    console.error('❌ Sign out error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// VAS (Virtual Assistants) - CRUD Operations
// ============================================================================

/**
 * Get all VAs for current user
 * @returns {Promise<Array>}
 */
async function getVAs() {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('vas')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`✅ Retrieved ${data.length} VAs`);
    return data || [];
  } catch (error) {
    console.error('❌ Error getting VAs:', error);
    throw error;
  }
}

/**
 * Get a single VA by ID
 * @param {string} vaId
 * @returns {Promise<Object|null>}
 */
async function getVA(vaId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('vas')
      .select('*')
      .eq('id', vaId)
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('❌ Error getting VA:', error);
    throw error;
  }
}

/**
 * Create a new VA
 * @param {Object} vaData - { name, ...other fields }
 * @returns {Promise<Object>}
 */
async function createVA(vaData) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('vas')
      .insert([{
        user_id: userId,
        organization_id: organizationId,
        name: vaData.name,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ VA created:', data.name);
    return data;
  } catch (error) {
    console.error('❌ Error creating VA:', error);
    throw error;
  }
}

/**
 * Update a VA
 * @param {string} vaId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateVA(vaId, updates) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('vas')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', vaId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ VA updated:', vaId);
    return data;
  } catch (error) {
    console.error('❌ Error updating VA:', error);
    throw error;
  }
}

/**
 * Delete a VA (also deletes associated data via CASCADE)
 * @param {string} vaId
 * @returns {Promise<boolean>}
 */
async function deleteVA(vaId) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('vas')
      .delete()
      .eq('id', vaId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ VA deleted:', vaId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting VA:', error);
    throw error;
  }
}

// ============================================================================
// CREATORS - CRUD Operations
// ============================================================================

/**
 * Get all creators for current user
 * @returns {Promise<Array>}
 */
async function getCreators() {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;

    console.log(`✅ Retrieved ${data.length} creators`);
    return data || [];
  } catch (error) {
    console.error('❌ Error getting creators:', error);
    throw error;
  }
}

/**
 * Get creators for a specific VA
 * @param {string} vaId
 * @returns {Promise<Array>}
 */
async function getCreatorsByVA(vaId) {
  try {
    const organizationId = await getOrganizationId();

    // Get creator IDs from va_creators table
    const { data: vaCreators, error: vcError } = await supabase
      .from('va_creators')
      .select('creator_id')
      .eq('va_id', vaId);

    if (vcError) throw vcError;

    const creatorIds = vaCreators.map(vc => vc.creator_id);

    if (creatorIds.length === 0) return [];

    // Get full creator data
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .in('id', creatorIds)
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error getting creators by VA:', error);
    throw error;
  }
}

/**
 * Get a single creator by ID
 * @param {string} creatorId
 * @returns {Promise<Object|null>}
 */
async function getCreator(creatorId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('id', creatorId)
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('❌ Error getting creator:', error);
    throw error;
  }
}

/**
 * Create a new creator
 * @param {Object} creatorData - { name, ...other fields }
 * @returns {Promise<Object>}
 */
async function createCreator(creatorData) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();

    const insertData = {
      user_id: userId,
      organization_id: organizationId,
      name: creatorData.name,
      created_at: new Date().toISOString()
    };

    // Ajouter la photo si elle existe
    if (creatorData.photo_url) {
      insertData.photo_url = creatorData.photo_url;
    }

    const { data, error } = await supabase
      .from('creators')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Creator created:', data.name);
    return data;
  } catch (error) {
    console.error('❌ Error creating creator:', error);
    throw error;
  }
}

/**
 * Update a creator
 * @param {string} creatorId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateCreator(creatorId, updates) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('creators')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', creatorId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Creator updated:', creatorId);
    return data;
  } catch (error) {
    console.error('❌ Error updating creator:', error);
    throw error;
  }
}

/**
 * Delete a creator
 * @param {string} creatorId
 * @returns {Promise<boolean>}
 */
async function deleteCreator(creatorId) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('creators')
      .delete()
      .eq('id', creatorId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ Creator deleted:', creatorId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting creator:', error);
    throw error;
  }
}

// ============================================================================
// VA-CREATOR RELATIONSHIPS
// ============================================================================

/**
 * Assign a creator to a VA
 * @param {string} vaId
 * @param {string} creatorId
 * @returns {Promise<Object>}
 */
async function assignCreatorToVA(vaId, creatorId) {
  try {
    // Check if relationship already exists
    const { data: existing, error: checkError } = await supabase
      .from('va_creators')
      .select('*')
      .eq('va_id', vaId)
      .eq('creator_id', creatorId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      console.log('ℹ️ Creator already assigned to VA');
      return existing;
    }

    const { data, error } = await supabase
      .from('va_creators')
      .insert([{
        va_id: vaId,
        creator_id: creatorId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Creator assigned to VA');
    return data;
  } catch (error) {
    console.error('❌ Error assigning creator to VA:', error);
    throw error;
  }
}

/**
 * Remove creator from VA
 * @param {string} vaId
 * @param {string} creatorId
 * @returns {Promise<boolean>}
 */
async function removeCreatorFromVA(vaId, creatorId) {
  try {
    const { error } = await supabase
      .from('va_creators')
      .delete()
      .eq('va_id', vaId)
      .eq('creator_id', creatorId);

    if (error) throw error;

    console.log('✅ Creator removed from VA');
    return true;
  } catch (error) {
    console.error('❌ Error removing creator from VA:', error);
    throw error;
  }
}

/**
 * Get all VAs for a creator
 * @param {string} creatorId
 * @returns {Promise<Array>}
 */
async function getVAsForCreator(creatorId) {
  try {
    const organizationId = await getOrganizationId();

    const { data: vaCreators, error: vcError } = await supabase
      .from('va_creators')
      .select('va_id')
      .eq('creator_id', creatorId);

    if (vcError) throw vcError;

    const vaIds = vaCreators.map(vc => vc.va_id);

    if (vaIds.length === 0) return [];

    const { data, error } = await supabase
      .from('vas')
      .select('*')
      .in('id', vaIds)
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error getting VAs for creator:', error);
    throw error;
  }
}

// ============================================================================
// TWITTER ACCOUNTS - CRUD Operations
// ============================================================================

/**
 * Get all Twitter accounts for current user
 * @returns {Promise<Array>}
 */
async function getTwitterAccounts(options = {}) {
  try {
    const { skipDecryption = false } = options;
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('twitter_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (skipDecryption) {
      // Return with encrypted passwords for fast loading
      console.log(`✅ Retrieved ${data.length} Twitter accounts (passwords encrypted)`);
      return (data || []).map(account => ({
        ...account,
        password: '••••••••' // Placeholder
      }));
    }

    // Get passwords directly from encrypted_password column (stored as plain text)
    const processedData = (data || []).map(account => ({
      ...account,
      password: account.encrypted_password || ''
    }));

    console.log(`✅ Retrieved ${processedData.length} Twitter accounts`);
    return processedData;
  } catch (error) {
    console.error('❌ Error getting Twitter accounts:', error);
    throw error;
  }
}

/**
 * Get Twitter accounts for a specific VA
 * @param {string} vaId
 * @returns {Promise<Array>}
 */
async function getTwitterAccountsByVA(vaId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('twitter_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('va_id', vaId)
      .order('username', { ascending: true });

    if (error) throw error;

    // Decrypt passwords
    const decryptedData = await Promise.all(
      (data || []).map(async account => ({
        ...account,
        password: await decryptPassword(account.encrypted_password)
      }))
    );

    return decryptedData;
  } catch (error) {
    console.error('❌ Error getting Twitter accounts by VA:', error);
    throw error;
  }
}

/**
 * Get Twitter accounts for a specific creator
 * @param {string} creatorId
 * @returns {Promise<Array>}
 */
async function getTwitterAccountsByCreator(creatorId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('twitter_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('creator_id', creatorId)
      .order('username', { ascending: true });

    if (error) throw error;

    // Decrypt passwords
    const decryptedData = await Promise.all(
      (data || []).map(async account => ({
        ...account,
        password: await decryptPassword(account.encrypted_password)
      }))
    );

    return decryptedData;
  } catch (error) {
    console.error('❌ Error getting Twitter accounts by creator:', error);
    throw error;
  }
}

/**
 * Get a single Twitter account by ID
 * @param {string} accountId
 * @returns {Promise<Object|null>}
 */
async function getTwitterAccount(accountId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('twitter_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;

    // Decrypt password
    data.password = await decryptPassword(data.encrypted_password);

    return data;
  } catch (error) {
    console.error('❌ Error getting Twitter account:', error);
    throw error;
  }
}

/**
 * Create a new Twitter account
 * @param {Object} accountData - { username, password, creator_id, va_id, gmail_id }
 * @returns {Promise<Object>}
 */
async function createTwitterAccount(accountData) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();

    // Encrypt password
    const encryptedPassword = await encryptPassword(accountData.password);

    const { data, error } = await supabase
      .from('twitter_accounts')
      .insert([{
        user_id: userId,
        organization_id: organizationId,
        username: accountData.username,
        encrypted_password: encryptedPassword,
        creator_id: accountData.creator_id || null,
        va_id: accountData.va_id || null,
        gmail_id: accountData.gmail_id || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Twitter account created:', data.username);

    // Return with decrypted password
    return {
      ...data,
      password: accountData.password
    };
  } catch (error) {
    console.error('❌ Error creating Twitter account:', error);
    throw error;
  }
}

/**
 * Update a Twitter account
 * @param {string} accountId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateTwitterAccount(accountId, updates) {
  try {
    const organizationId = await getOrganizationId();

    // Encrypt password if provided
    if (updates.password) {
      updates.encrypted_password = await encryptPassword(updates.password);
      delete updates.password;
    }

    const { data, error } = await supabase
      .from('twitter_accounts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Twitter account updated:', accountId);

    // Decrypt password for return
    data.password = await decryptPassword(data.encrypted_password);

    return data;
  } catch (error) {
    console.error('❌ Error updating Twitter account:', error);
    throw error;
  }
}

/**
 * Delete a Twitter account
 * @param {string} accountId
 * @returns {Promise<boolean>}
 */
async function deleteTwitterAccount(accountId) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('twitter_accounts')
      .delete()
      .eq('id', accountId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ Twitter account deleted:', accountId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting Twitter account:', error);
    throw error;
  }
}

// ============================================================================
// INSTAGRAM ACCOUNTS - CRUD Operations
// ============================================================================

/**
 * Get all Instagram accounts for current user
 * @returns {Promise<Array>}
 */
async function getInstagramAccounts(options = {}) {
  try {
    const { skipDecryption = false } = options;
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (skipDecryption) {
      // Return with encrypted passwords for fast loading
      console.log(`✅ Retrieved ${data.length} Instagram accounts (passwords encrypted)`);
      return (data || []).map(account => ({
        ...account,
        password: '••••••••' // Placeholder
      }));
    }

    // Decrypt passwords
    const decryptedData = await Promise.all(
      (data || []).map(async account => ({
        ...account,
        password: await decryptPassword(account.encrypted_password)
      }))
    );

    console.log(`✅ Retrieved ${decryptedData.length} Instagram accounts`);
    return decryptedData;
  } catch (error) {
    console.error('❌ Error getting Instagram accounts:', error);
    throw error;
  }
}

/**
 * Get Instagram accounts for a specific creator
 * @param {string} creatorId
 * @returns {Promise<Array>}
 */
async function getInstagramAccountsByCreator(creatorId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('creator_id', creatorId)
      .order('username', { ascending: true });

    if (error) throw error;

    // Decrypt passwords
    const decryptedData = await Promise.all(
      (data || []).map(async account => ({
        ...account,
        password: await decryptPassword(account.encrypted_password)
      }))
    );

    return decryptedData;
  } catch (error) {
    console.error('❌ Error getting Instagram accounts by creator:', error);
    throw error;
  }
}

/**
 * Create a new Instagram account
 * @param {Object} accountData - { username, password, creator_id, va_id, gmail_id }
 * @returns {Promise<Object>}
 */
async function createInstagramAccount(accountData) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();

    // Encrypt password
    const encryptedPassword = await encryptPassword(accountData.password);

    const { data, error } = await supabase
      .from('instagram_accounts')
      .insert([{
        user_id: userId,
        organization_id: organizationId,
        username: accountData.username,
        encrypted_password: encryptedPassword,
        creator_id: accountData.creator_id || null,
        va_id: accountData.va_id || null,
        gmail_id: accountData.gmail_id || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Instagram account created:', data.username);

    return {
      ...data,
      password: accountData.password
    };
  } catch (error) {
    console.error('❌ Error creating Instagram account:', error);
    throw error;
  }
}

/**
 * Update an Instagram account
 * @param {string} accountId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateInstagramAccount(accountId, updates) {
  try {
    const organizationId = await getOrganizationId();

    // Encrypt password if provided
    if (updates.password) {
      updates.encrypted_password = await encryptPassword(updates.password);
      delete updates.password;
    }

    const { data, error } = await supabase
      .from('instagram_accounts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Instagram account updated:', accountId);

    data.password = await decryptPassword(data.encrypted_password);

    return data;
  } catch (error) {
    console.error('❌ Error updating Instagram account:', error);
    throw error;
  }
}

/**
 * Get Instagram accounts by VA ID
 * @param {string} vaId
 * @returns {Promise<Array>}
 */
async function getInstagramAccountsByVA(vaId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('va_id', vaId)
      .order('username', { ascending: true });

    if (error) throw error;

    // Decrypt passwords
    const decryptedData = await Promise.all(
      (data || []).map(async account => ({
        ...account,
        password: await decryptPassword(account.encrypted_password)
      }))
    );

    console.log(`✅ Retrieved ${decryptedData.length} Instagram accounts for VA ${vaId}`);
    return decryptedData;
  } catch (error) {
    console.error('❌ Error getting Instagram accounts by VA:', error);
    throw error;
  }
}

/**
 * Update Instagram account username
 * @param {string} accountId
 * @param {string} newUsername
 * @returns {Promise<Object>}
 */
async function updateInstagramUsername(accountId, newUsername) {
  try {
    const { data, error } = await supabase
      .from('instagram_accounts')
      .update({ username: newUsername })
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Instagram username updated:', newUsername);
    return data;
  } catch (error) {
    console.error('❌ Error updating Instagram username:', error);
    throw error;
  }
}

/**
 * Delete an Instagram account
 * @param {string} accountId
 * @returns {Promise<boolean>}
 */
async function deleteInstagramAccount(accountId) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('instagram_accounts')
      .delete()
      .eq('id', accountId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ Instagram account deleted:', accountId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting Instagram account:', error);
    throw error;
  }
}

// ============================================================================
// GMAIL ACCOUNTS - CRUD Operations
// ============================================================================

/**
 * Get all Gmail accounts for current user
 * @returns {Promise<Array>}
 */
async function getGmailAccounts(options = {}) {
  try {
    const { skipDecryption = false } = options;
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('gmail_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (skipDecryption) {
      // Return with encrypted passwords for fast loading
      console.log(`✅ Retrieved ${data.length} Gmail accounts (passwords encrypted)`);
      return (data || []).map(account => ({
        ...account,
        password: '••••••••' // Placeholder
      }));
    }

    // Handle passwords - they come from Supabase already in the 'password' field
    const decryptedData = await Promise.all(
      (data || []).map(async account => {
        let decryptedPassword = '';

        // Les mots de passe sont dans le champ 'password', pas 'encrypted_password'
        const encryptedPwd = account.password || account.encrypted_password;

        if (encryptedPwd) {
          // Try AES decryption first (52 character passwords are AES-GCM)
          if (encryptedPwd.length === 52 || encryptedPwd.length === 60) {
            try {
              decryptedPassword = await decryptPassword(encryptedPwd);
              if (decryptedPassword && decryptedPassword !== '') {
                console.log(`✅ Decrypted password with AES for ${account.email}`);
              }
            } catch (e) {
              console.log(`⚠️ Cannot decrypt password for ${account.email} - using encrypted value`);
              // Si on ne peut pas décrypter, garder la valeur chiffrée
              decryptedPassword = encryptedPwd;
            }
          }
          // Try deobfuscation for shorter passwords
          else if (encryptedPwd.length < 50) {
            try {
              decryptedPassword = deobfuscatePassword(encryptedPwd);
              if (decryptedPassword && decryptedPassword !== '') {
                console.log(`✅ Deobfuscated password for ${account.email}`);
              }
            } catch (e) {
              console.log(`⚠️ Cannot deobfuscate password for ${account.email}`);
              decryptedPassword = encryptedPwd;
            }
          }
          // Keep as is if no decryption method works
          else {
            decryptedPassword = encryptedPwd;
          }
        }

        return {
          ...account,
          password: decryptedPassword,
          encrypted_password: encryptedPwd // Keep original encrypted value for reference
        };
      })
    );

    console.log(`✅ Retrieved ${decryptedData.length} Gmail accounts`);
    return decryptedData;
  } catch (error) {
    console.error('❌ Error getting Gmail accounts:', error);
    throw error;
  }
}

/**
 * Get a single Gmail account by ID
 * @param {string} accountId
 * @returns {Promise<Object|null>}
 */
async function getGmailAccount(accountId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('gmail_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;

    // Decrypt password
    if (data && data.encrypted_password) {
      data.password = await decryptPassword(data.encrypted_password);
    }

    return data;
  } catch (error) {
    console.error('❌ Error getting Gmail account:', error);
    throw error;
  }
}

/**
 * Get Gmail accounts for a specific VA
 * @param {string} vaId
 * @returns {Promise<Array>}
 */
async function getGmailAccountsByVA(vaId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('gmail_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('va_id', vaId)
      .order('email', { ascending: true });

    if (error) throw error;

    // Handle passwords - they come from Supabase already in the 'password' field
    const decryptedData = await Promise.all(
      (data || []).map(async account => {
        let decryptedPassword = '';

        // Les mots de passe sont dans le champ 'password', pas 'encrypted_password'
        const encryptedPwd = account.password || account.encrypted_password;

        if (encryptedPwd) {
          // Try AES decryption first (52 character passwords are AES-GCM)
          if (encryptedPwd.length === 52 || encryptedPwd.length === 60) {
            try {
              decryptedPassword = await decryptPassword(encryptedPwd);
              if (decryptedPassword && decryptedPassword !== '') {
                console.log(`✅ Decrypted password with AES for ${account.email}`);
              }
            } catch (e) {
              console.log(`⚠️ Cannot decrypt password for ${account.email} - using encrypted value`);
              // Si on ne peut pas décrypter, garder la valeur chiffrée
              decryptedPassword = encryptedPwd;
            }
          }
          // Try deobfuscation for shorter passwords
          else if (encryptedPwd.length < 50) {
            try {
              decryptedPassword = deobfuscatePassword(encryptedPwd);
              if (decryptedPassword && decryptedPassword !== '') {
                console.log(`✅ Deobfuscated password for ${account.email}`);
              }
            } catch (e) {
              console.log(`⚠️ Cannot deobfuscate password for ${account.email}`);
              decryptedPassword = encryptedPwd;
            }
          }
          // Keep as is if no decryption method works
          else {
            decryptedPassword = encryptedPwd;
          }
        }

        return {
          ...account,
          password: decryptedPassword,
          encrypted_password: encryptedPwd // Keep original encrypted value for reference
        };
      })
    );

    return decryptedData;
  } catch (error) {
    console.error('❌ Error getting Gmail accounts by VA:', error);
    throw error;
  }
}

/**
 * Create a new Gmail account
 * @param {Object} accountData - { email, password, va_id, notes }
 * @returns {Promise<Object>}
 */
async function createGmailAccount(accountData) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();

    // Obfuscate password (simple base64 pour pouvoir le récupérer)
    const encryptedPassword = obfuscatePassword(accountData.password);

    const { data, error } = await supabase
      .from('gmail_accounts')
      .insert([{
        user_id: userId,
        organization_id: organizationId,
        email: accountData.email,
        encrypted_password: encryptedPassword,
        va_id: accountData.va_id || null,
        notes: accountData.notes || '',
        status: accountData.status || 'active', // active, banned
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Gmail account created:', data.email);

    return {
      ...data,
      password: accountData.password
    };
  } catch (error) {
    console.error('❌ Error creating Gmail account:', error);
    throw error;
  }
}

/**
 * Update a Gmail account
 * @param {string} accountId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateGmailAccount(accountId, updates) {
  try {
    const organizationId = await getOrganizationId();

    // Obfuscate password if provided
    if (updates.password) {
      updates.encrypted_password = obfuscatePassword(updates.password);
      delete updates.password;
    }

    const { data, error } = await supabase
      .from('gmail_accounts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Gmail account updated:', accountId);

    data.password = await decryptPassword(data.encrypted_password);

    return data;
  } catch (error) {
    console.error('❌ Error updating Gmail account:', error);
    throw error;
  }
}

/**
 * Update Gmail account status (active/banned)
 * @param {string} accountId
 * @param {string} status - 'active' or 'banned'
 * @returns {Promise<Object>}
 */
async function updateGmailAccountStatus(accountId, status) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('gmail_accounts')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Gmail account status updated to ${status}:`, data.email);
    return data;
  } catch (error) {
    console.error('❌ Error updating Gmail account status:', error);
    throw error;
  }
}

/**
 * Delete a Gmail account
 * @param {string} accountId
 * @returns {Promise<boolean>}
 */
async function deleteGmailAccount(accountId) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('gmail_accounts')
      .delete()
      .eq('id', accountId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ Gmail account deleted:', accountId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting Gmail account:', error);
    throw error;
  }
}

// ============================================================================
// SUBSCRIPTIONS - CRUD Operations
// ============================================================================

/**
 * Get all subscriptions for current user
 * @returns {Promise<Array>}
 */
async function getSubscriptions() {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });

    if (error) throw error;

    console.log(`✅ Retrieved ${data.length} subscriptions`);
    return data || [];
  } catch (error) {
    console.error('❌ Error getting subscriptions:', error);
    throw error;
  }
}

/**
 * Get subscriptions for a specific VA
 * @param {string} vaId
 * @returns {Promise<Array>}
 */
async function getSubscriptionsByVA(vaId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('va_id', vaId)
      .order('date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error getting subscriptions by VA:', error);
    throw error;
  }
}

/**
 * Create a new subscription entry
 * @param {Object} subData - { va_id, date, count, amount }
 * @returns {Promise<Object>}
 */
async function createSubscription(subData) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: userId,
        organization_id: organizationId,
        va_id: subData.va_id,
        date: subData.date,
        count: subData.count,
        amount: subData.amount || (subData.count * 0.50), // Default $0.50 per sub
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Subscription created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error creating subscription:', error);
    throw error;
  }
}

/**
 * Update a subscription
 * @param {string} subId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateSubscription(subId, updates) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', subId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Subscription updated:', subId);
    return data;
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    throw error;
  }
}

/**
 * Delete a subscription
 * @param {string} subId
 * @returns {Promise<boolean>}
 */
async function deleteSubscription(subId) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', subId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ Subscription deleted:', subId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting subscription:', error);
    throw error;
  }
}

// ============================================================================
// REVENUES - CRUD Operations
// ============================================================================

/**
 * Get all revenues for current user
 * @returns {Promise<Array>}
 */
async function getRevenues() {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('revenues')
      .select('*')
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });

    if (error) throw error;

    console.log(`✅ Retrieved ${data.length} revenues`);
    return data || [];
  } catch (error) {
    console.error('❌ Error getting revenues:', error);
    throw error;
  }
}

/**
 * Get revenues for a specific VA
 * @param {string} vaId
 * @returns {Promise<Array>}
 */
async function getRevenuesByVA(vaId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('revenues')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('va_id', vaId)
      .order('date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error getting revenues by VA:', error);
    throw error;
  }
}

/**
 * Create a new revenue entry
 * @param {Object} revenueData - { va_id, date, amount_usd, amount_eur, exchange_rate, tracking_link, description, commission }
 * @returns {Promise<Object>}
 */
async function createRevenue(revenueData) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('revenues')
      .insert([{
        user_id: userId,
        organization_id: organizationId,
        va_id: revenueData.va_id,
        date: revenueData.date,
        amount_usd: revenueData.amount_usd,
        amount_eur: revenueData.amount_eur,
        exchange_rate: revenueData.exchange_rate,
        tracking_link: revenueData.tracking_link || '',
        description: revenueData.description || '',
        commission: revenueData.commission || 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Revenue created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error creating revenue:', error);
    throw error;
  }
}

/**
 * Update a revenue
 * @param {string} revenueId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateRevenue(revenueId, updates) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('revenues')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', revenueId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Revenue updated:', revenueId);
    return data;
  } catch (error) {
    console.error('❌ Error updating revenue:', error);
    throw error;
  }
}

/**
 * Delete a revenue
 * @param {string} revenueId
 * @returns {Promise<boolean>}
 */
async function deleteRevenue(revenueId) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('revenues')
      .delete()
      .eq('id', revenueId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ Revenue deleted:', revenueId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting revenue:', error);
    throw error;
  }
}

// ============================================================================
// PAYMENTS (VA Payments) - CRUD Operations
// ============================================================================

/**
 * Get all payments for current user
 * @returns {Promise<Array>}
 */
async function getPayments() {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });

    if (error) throw error;

    console.log(`✅ Retrieved ${data.length} payments`);
    return data || [];
  } catch (error) {
    console.error('❌ Error getting payments:', error);
    throw error;
  }
}

/**
 * Get payments for a specific VA
 * @param {string} vaId
 * @returns {Promise<Array>}
 */
async function getPaymentsByVA(vaId) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('va_id', vaId)
      .order('date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error getting payments by VA:', error);
    throw error;
  }
}

/**
 * Create a new payment entry
 * @param {Object} paymentData - { va_id, date, amount, description }
 * @returns {Promise<Object>}
 */
async function createPayment(paymentData) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('payments')
      .insert([{
        user_id: userId,
        organization_id: organizationId,
        va_id: paymentData.va_id,
        date: paymentData.date,
        amount: paymentData.amount,
        description: paymentData.description || '',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Payment created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error creating payment:', error);
    throw error;
  }
}

/**
 * Update a payment
 * @param {string} paymentId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updatePayment(paymentId, updates) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('payments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Payment updated:', paymentId);
    return data;
  } catch (error) {
    console.error('❌ Error updating payment:', error);
    throw error;
  }
}

/**
 * Delete a payment
 * @param {string} paymentId
 * @returns {Promise<boolean>}
 */
async function deletePayment(paymentId) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ Payment deleted:', paymentId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting payment:', error);
    throw error;
  }
}

// ============================================================================
// TWITTER STATS - CRUD Operations
// ============================================================================

/**
 * Get all Twitter stats for current user
 * @returns {Promise<Array>}
 */
async function getTwitterStats() {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('twitter_stats')
      .select('*')
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });

    if (error) throw error;

    // Normaliser les données (followers -> followers_count pour compatibilité)
    const normalizedData = (data || []).map(stat => ({
      ...stat,
      followers_count: stat.followers_count || stat.followers,
      followers: stat.followers || stat.followers_count
    }));

    console.log(`✅ Retrieved ${normalizedData.length} Twitter stats`);
    return normalizedData;
  } catch (error) {
    console.error('❌ Error getting Twitter stats:', error);
    throw error;
  }
}

/**
 * Get Twitter stats for a specific account
 * @param {string} username
 * @returns {Promise<Array>}
 */
async function getTwitterStatsByUsername(username) {
  try {
    const organizationId = await getOrganizationId();

    // Essayer avec et sans @
    const cleanUsername = username.replace('@', '');

    const { data, error } = await supabase
      .from('twitter_stats')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`username.eq.${cleanUsername},username.eq.@${cleanUsername}`)
      .order('date', { ascending: false });

    if (error) throw error;

    // Normaliser les données (followers -> followers_count pour compatibilité)
    const normalizedData = (data || []).map(stat => ({
      ...stat,
      followers_count: stat.followers_count || stat.followers,
      followers: stat.followers || stat.followers_count
    }));

    return normalizedData;
  } catch (error) {
    console.error('❌ Error getting Twitter stats by username:', error);
    throw error;
  }
}

/**
 * Get latest Twitter stats for an account
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
async function getLatestTwitterStat(username) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('twitter_stats')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('username', username)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('❌ Error getting latest Twitter stat:', error);
    throw error;
  }
}

/**
 * Create a new Twitter stats entry
 * @param {Object} statsData - { username, date, followers_count, va_id, creator_id }
 * @returns {Promise<Object>}
 */
async function createTwitterStat(statsData) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();

    const insertData = {
      user_id: userId,
      organization_id: organizationId,
      username: statsData.username,
      date: statsData.date,
      followers: statsData.followers_count || statsData.followers
    };

    const { data, error } = await supabase
      .from('twitter_stats')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Twitter stat created:', data.username, data.followers);
    return data;
  } catch (error) {
    console.error('❌ Error creating Twitter stat:', error);
    throw error;
  }
}

/**
 * Update a Twitter stat
 * @param {string} statId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateTwitterStat(statId, updates) {
  try {
    const organizationId = await getOrganizationId();

    // Ne mettre à jour que les champs valides
    const updateData = {};
    if (updates.followers !== undefined) updateData.followers = updates.followers;
    if (updates.followers_count !== undefined) updateData.followers = updates.followers_count;

    const { data, error } = await supabase
      .from('twitter_stats')
      .update(updateData)
      .eq('id', statId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Twitter stat updated:', statId);
    return data;
  } catch (error) {
    console.error('❌ Error updating Twitter stat:', error);
    throw error;
  }
}

/**
 * Delete a Twitter stat
 * @param {string} statId
 * @returns {Promise<boolean>}
 */
async function deleteTwitterStat(statId) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('twitter_stats')
      .delete()
      .eq('id', statId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ Twitter stat deleted:', statId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting Twitter stat:', error);
    throw error;
  }
}

// ============================================================================
// SUBS TRACKING FUNCTIONS (Clics & Abonnements)
// ============================================================================

/**
 * Get all subs tracking data for current organization
 * @param {number} days - Number of days to fetch (default 30)
 * @returns {Promise<Array>}
 */
async function getSubsTracking(days = 30) {
  try {
    const organizationId = await getOrganizationId();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('twitter_subs_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) throw error;

    console.log(`✅ Retrieved ${(data || []).length} subs tracking entries`);
    return data || [];
  } catch (error) {
    console.error('❌ Error getting subs tracking:', error);
    return [];
  }
}

/**
 * Get subs tracking for a specific account
 * @param {string} username
 * @param {number} days - Number of days to fetch
 * @returns {Promise<Array>}
 */
async function getSubsTrackingByUsername(username, days = 30) {
  try {
    const organizationId = await getOrganizationId();
    const cleanUsername = username.replace('@', '');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('twitter_subs_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`username.eq.${cleanUsername},username.eq.@${cleanUsername}`)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error getting subs tracking by username:', error);
    return [];
  }
}

/**
 * Get latest subs tracking entry for an account
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
async function getLatestSubsTracking(username) {
  try {
    const organizationId = await getOrganizationId();
    const cleanUsername = username.replace('@', '');

    const { data, error } = await supabase
      .from('twitter_subs_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`username.eq.${cleanUsername},username.eq.@${cleanUsername}`)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error getting latest subs tracking:', error);
    return null;
  }
}

/**
 * Create or update a subs tracking entry
 * @param {Object} trackingData - { username, date, clicks, subs, tracking_link }
 * @returns {Promise<Object>}
 */
async function upsertSubsTracking(trackingData) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();
    const cleanUsername = trackingData.username.replace('@', '');

    const insertData = {
      user_id: userId,
      organization_id: organizationId,
      username: cleanUsername,
      date: trackingData.date || new Date().toISOString().split('T')[0],
      clicks: trackingData.clicks || 0,
      subs: trackingData.subs || 0,
      tracking_link: trackingData.tracking_link || null
    };

    // Upsert - insert or update if exists for same username/date
    const { data, error } = await supabase
      .from('twitter_subs_tracking')
      .upsert([insertData], {
        onConflict: 'username,date,organization_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Subs tracking saved:', cleanUsername, insertData.clicks, 'clicks,', insertData.subs, 'subs');
    return data;
  } catch (error) {
    console.error('❌ Error saving subs tracking:', error);
    throw error;
  }
}

/**
 * Create a new subs tracking entry
 * @param {Object} trackingData - { username, date, clicks, subs, tracking_link }
 * @returns {Promise<Object>}
 */
async function createSubsTracking(trackingData) {
  return upsertSubsTracking(trackingData);
}

/**
 * Bulk save subs tracking entries
 * @param {Array} entries - Array of { username, clicks, subs, tracking_link }
 * @param {string} date - Date for all entries
 * @returns {Promise<Array>}
 */
async function bulkSaveSubsTracking(entries, date) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();
    const targetDate = date || new Date().toISOString().split('T')[0];

    const insertData = entries.map(entry => ({
      user_id: userId,
      organization_id: organizationId,
      username: entry.username.replace('@', ''),
      date: targetDate,
      clicks: entry.clicks || 0,
      subs: entry.subs || 0,
      tracking_link: entry.tracking_link || null
    }));

    const { data, error } = await supabase
      .from('twitter_subs_tracking')
      .upsert(insertData, {
        onConflict: 'username,date,organization_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;

    console.log(`✅ Bulk saved ${(data || []).length} subs tracking entries`);
    return data || [];
  } catch (error) {
    console.error('❌ Error bulk saving subs tracking:', error);
    throw error;
  }
}

/**
 * Delete a subs tracking entry
 * @param {string} trackingId
 * @returns {Promise<boolean>}
 */
async function deleteSubsTracking(trackingId) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('twitter_subs_tracking')
      .delete()
      .eq('id', trackingId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ Subs tracking deleted:', trackingId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting subs tracking:', error);
    throw error;
  }
}

// ============================================================================
// CREATOR SUBS TRACKING FUNCTIONS (Subs par Créatrice)
// ============================================================================

/**
 * Get all creator subs tracking data for current organization
 * @param {number} days - Number of days to fetch (default 30)
 * @returns {Promise<Array>}
 */
async function getCreatorSubsTracking(days = 30) {
  try {
    const organizationId = await getOrganizationId();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('creator_subs_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) throw error;

    console.log(`✅ Retrieved ${(data || []).length} creator subs tracking entries`);
    return data || [];
  } catch (error) {
    console.error('❌ Error getting creator subs tracking:', error);
    return [];
  }
}

/**
 * Get creator subs tracking for a specific creator
 * @param {string} creatorId
 * @param {number} days - Number of days to fetch
 * @returns {Promise<Array>}
 */
async function getCreatorSubsByCreatorId(creatorId, days = 30) {
  try {
    const organizationId = await getOrganizationId();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('creator_subs_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('creator_id', creatorId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error getting creator subs by creator ID:', error);
    return [];
  }
}

/**
 * Upsert (insert or update) creator subs tracking
 * @param {Object} trackingData - { creator_id, date, subs }
 * @returns {Promise<Object>}
 */
async function upsertCreatorSubsTracking(trackingData) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('creator_subs_tracking')
      .upsert({
        organization_id: organizationId,
        creator_id: trackingData.creator_id,
        date: trackingData.date,
        subs: trackingData.subs,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'creator_id,date,organization_id'
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Creator subs tracking upserted:', data);
    return data;
  } catch (error) {
    console.error('❌ Error upserting creator subs tracking:', error);
    throw error;
  }
}

/**
 * Bulk save creator subs tracking for a specific date
 * @param {Array} entries - Array of { creator_id, subs }
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<boolean>}
 */
async function bulkSaveCreatorSubsTracking(entries, date) {
  try {
    const organizationId = await getOrganizationId();

    const records = entries.map(entry => ({
      organization_id: organizationId,
      creator_id: entry.creator_id,
      date: date,
      subs: entry.subs,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('creator_subs_tracking')
      .upsert(records, {
        onConflict: 'creator_id,date,organization_id'
      });

    if (error) throw error;

    console.log(`✅ Bulk saved ${entries.length} creator subs tracking entries`);
    return true;
  } catch (error) {
    console.error('❌ Error bulk saving creator subs tracking:', error);
    throw error;
  }
}

// ============================================================================
// VA SUBS TRACKING FUNCTIONS (Subs par VA - Tracking Links)
// ============================================================================

/**
 * Get all VA subs tracking data for current organization
 * @param {number} days - Number of days to fetch (default 30)
 * @returns {Promise<Array>}
 */
async function getVASubsTracking(days = 30) {
  try {
    const organizationId = await getOrganizationId();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('va_subs_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) throw error;

    console.log(`✅ Retrieved ${(data || []).length} VA subs tracking entries`);
    return data || [];
  } catch (error) {
    console.error('❌ Error getting VA subs tracking:', error);
    return [];
  }
}

/**
 * Get VA subs tracking for a specific VA
 * @param {string} vaId
 * @param {number} days - Number of days to fetch
 * @returns {Promise<Array>}
 */
async function getVASubsByVAId(vaId, days = 30) {
  try {
    const organizationId = await getOrganizationId();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('va_subs_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('va_id', vaId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error getting VA subs by VA ID:', error);
    return [];
  }
}

/**
 * Upsert (insert or update) VA subs tracking
 * @param {Object} trackingData - { va_id, date, subs }
 * @returns {Promise<Object>}
 */
async function upsertVASubsTracking(trackingData) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('va_subs_tracking')
      .upsert({
        organization_id: organizationId,
        va_id: trackingData.va_id,
        date: trackingData.date,
        subs: trackingData.subs,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'va_id,date,organization_id'
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ VA subs tracking upserted:', data);
    return data;
  } catch (error) {
    console.error('❌ Error upserting VA subs tracking:', error);
    throw error;
  }
}

/**
 * Bulk save VA subs tracking for a specific date
 * @param {Array} entries - Array of { va_id, subs }
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<boolean>}
 */
async function bulkSaveVASubsTracking(entries, date) {
  try {
    const organizationId = await getOrganizationId();

    const records = entries.map(entry => ({
      organization_id: organizationId,
      va_id: entry.va_id,
      date: date,
      subs: entry.subs,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('va_subs_tracking')
      .upsert(records, {
        onConflict: 'va_id,date,organization_id'
      });

    if (error) throw error;

    console.log(`✅ Bulk saved ${entries.length} VA subs tracking entries`);
    return true;
  } catch (error) {
    console.error('❌ Error bulk saving VA subs tracking:', error);
    throw error;
  }
}

// ============================================================================
// TWITTER SUBS TRACKING FUNCTIONS (Subs par compte Twitter)
// ============================================================================

/**
 * Get all Twitter subs tracking data for current organization
 * @param {number} days - Number of days to fetch (default 30)
 * @returns {Promise<Array>}
 */
async function getTwitterSubsTracking(days = 30) {
  try {
    const organizationId = await getOrganizationId();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('twitter_subs_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) throw error;

    console.log(`✅ Retrieved ${(data || []).length} Twitter subs tracking entries`);
    return data || [];
  } catch (error) {
    console.error('❌ Error getting Twitter subs tracking:', error);
    return [];
  }
}

/**
 * Bulk save Twitter subs tracking for a specific date
 * @param {Array} entries - Array of { twitter_account_id, subs }
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<boolean>}
 */
async function bulkSaveTwitterSubsTracking(entries, date) {
  try {
    const organizationId = await getOrganizationId();

    // Filter out entries with no subs value
    const validEntries = entries.filter(e => e.subs !== null && e.subs !== undefined && e.subs !== '');

    if (validEntries.length === 0) {
      console.log('⚠️ No valid Twitter subs entries to save');
      return true;
    }

    const records = validEntries.map(entry => ({
      organization_id: organizationId,
      twitter_account_id: entry.twitter_account_id,
      date: date,
      subs: parseInt(entry.subs) || 0,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('twitter_subs_tracking')
      .upsert(records, {
        onConflict: 'twitter_account_id,date,organization_id'
      });

    if (error) throw error;

    console.log(`✅ Bulk saved ${validEntries.length} Twitter subs tracking entries`);
    return true;
  } catch (error) {
    console.error('❌ Error bulk saving Twitter subs tracking:', error);
    throw error;
  }
}

// ============================================================================
// INSTAGRAM STATS FUNCTIONS
// ============================================================================

/**
 * Get all Instagram stats for the organization
 * @returns {Promise<Array>}
 */
async function getAllInstagramStats() {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('instagram_stats')
      .select('*')
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });

    if (error) throw error;

    console.log(`✅ Retrieved ${data.length} Instagram stats`);
    return data || [];
  } catch (error) {
    console.error('❌ Error getting Instagram stats:', error);
    throw error;
  }
}

/**
 * Get Instagram stats for a specific account
 * @param {string} username
 * @returns {Promise<Array>}
 */
async function getInstagramStatsByUsername(username) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('instagram_stats')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('username', username)
      .order('date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error getting Instagram stats by username:', error);
    throw error;
  }
}

/**
 * Get latest Instagram stats for an account
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
async function getLatestInstagramStat(username) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('instagram_stats')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('username', username)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('❌ Error getting latest Instagram stat:', error);
    throw error;
  }
}

/**
 * Create a new Instagram stats entry
 * @param {Object} statsData - { username, date, followers_count, following_count, posts_count, engagement_rate, va_id, creator_id }
 * @returns {Promise<Object>}
 */
async function createInstagramStat(statsData) {
  try {
    const userId = await getUserId();
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('instagram_stats')
      .insert([{
        user_id: userId,
        organization_id: organizationId,
        username: statsData.username,
        date: statsData.date,
        followers_count: statsData.followers_count,
        following_count: statsData.following_count || null,
        posts_count: statsData.posts_count || null,
        engagement_rate: statsData.engagement_rate || null,
        va_id: statsData.va_id || null,
        creator_id: statsData.creator_id || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Instagram stat created:', data.username, data.followers_count);
    return data;
  } catch (error) {
    console.error('❌ Error creating Instagram stat:', error);
    throw error;
  }
}

/**
 * Update an Instagram stat
 * @param {string} statId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateInstagramStat(statId, updates) {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('instagram_stats')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', statId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Instagram stat updated:', statId);
    return data;
  } catch (error) {
    console.error('❌ Error updating Instagram stat:', error);
    throw error;
  }
}

/**
 * Delete an Instagram stat
 * @param {string} statId
 * @returns {Promise<boolean>}
 */
async function deleteInstagramStat(statId) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('instagram_stats')
      .delete()
      .eq('id', statId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ Instagram stat deleted:', statId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting Instagram stat:', error);
    throw error;
  }
}

// ============================================================================
// WARMUP PROGRESS FUNCTIONS
// ============================================================================

/**
 * Get all warmup progress entries
 * @returns {Promise<Array>}
 */
async function getWarmupProgress() {
  try {
    const organizationId = await getOrganizationId();

    const { data, error } = await supabase
      .from('warmup_progress')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`✅ Retrieved ${data.length} warmup progress entries`);
    return data || [];
  } catch (error) {
    console.error('❌ Error getting warmup progress:', error);
    throw error;
  }
}

/**
 * Upsert warmup progress entry
 * @param {Object} warmupData - { username, current_day, completed, start_date, completed_date }
 * @returns {Promise<Object>}
 */
async function upsertWarmupProgress(warmupData) {
  try {
    const organizationId = await getOrganizationId();
    const timestamp = new Date().toISOString();

    const { data, error } = await supabase
      .from('warmup_progress')
      .upsert({
        username: warmupData.username.replace('@', ''),
        organization_id: organizationId,
        current_day: warmupData.current_day,
        completed: warmupData.completed || false,
        start_date: warmupData.start_date || timestamp,
        completed_date: warmupData.completed_date || null,
        last_update: timestamp
      }, {
        onConflict: 'username,organization_id'
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Warmup progress upserted:', data.username, `Day ${data.current_day}`);
    return data;
  } catch (error) {
    console.error('❌ Error upserting warmup progress:', error);
    throw error;
  }
}

/**
 * Delete warmup progress entry
 * @param {string} username
 * @returns {Promise<boolean>}
 */
async function deleteWarmupProgress(username) {
  try {
    const organizationId = await getOrganizationId();

    const { error } = await supabase
      .from('warmup_progress')
      .delete()
      .eq('username', username.replace('@', ''))
      .eq('organization_id', organizationId);

    if (error) throw error;

    console.log('✅ Warmup progress deleted:', username);
    return true;
  } catch (error) {
    console.error('❌ Error deleting warmup progress:', error);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get complete VA data with all associated records
 * @param {string} vaId
 * @returns {Promise<Object>}
 */
async function getCompleteVAData(vaId) {
  try {
    const [
      va,
      creators,
      twitterAccounts,
      gmailAccounts,
      subscriptions,
      revenues,
      payments
    ] = await Promise.all([
      getVA(vaId),
      getCreatorsByVA(vaId),
      getTwitterAccountsByVA(vaId),
      getGmailAccountsByVA(vaId),
      getSubscriptionsByVA(vaId),
      getRevenuesByVA(vaId),
      getPaymentsByVA(vaId)
    ]);

    return {
      va,
      creators,
      twitterAccounts,
      gmailAccounts,
      subscriptions,
      revenues,
      payments
    };
  } catch (error) {
    console.error('❌ Error getting complete VA data:', error);
    throw error;
  }
}

/**
 * Get complete creator data with all accounts
 * @param {string} creatorId
 * @returns {Promise<Object>}
 */
async function getCompleteCreatorData(creatorId) {
  try {
    const [
      creator,
      vas,
      twitterAccounts,
      instagramAccounts
    ] = await Promise.all([
      getCreator(creatorId),
      getVAsForCreator(creatorId),
      getTwitterAccountsByCreator(creatorId),
      getInstagramAccountsByCreator(creatorId)
    ]);

    return {
      creator,
      vas,
      twitterAccounts,
      instagramAccounts
    };
  } catch (error) {
    console.error('❌ Error getting complete creator data:', error);
    throw error;
  }
}

/**
 * Get all VA-Creator relationships in a single query (optimized)
 * @returns {Promise<Array>} - Array of {va_id, creator_id}
 */
async function getAllVACreatorRelations() {
  try {
    const organizationId = await getOrganizationId();

    // Get all VA IDs for this organization
    const { data: vas, error: vasError } = await supabase
      .from('vas')
      .select('id')
      .eq('organization_id', organizationId);

    if (vasError) throw vasError;

    const vaIds = vas.map(v => v.id);

    if (vaIds.length === 0) return [];

    // Get all relations for these VAs in ONE query
    const { data, error } = await supabase
      .from('va_creators')
      .select('va_id, creator_id')
      .in('va_id', vaIds);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('❌ Error getting all VA-Creator relations:', error);
    return [];
  }
}

// ============================================================================
// ⚡ CACHED VERSIONS - For ultra-fast loading (avoid redundant org ID queries)
// ============================================================================

async function getVAsWithCachedOrgId(organizationId) {
  const { data, error } = await supabase
    .from('vas')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });
  if (error) throw error;
  console.log(`✅ Retrieved ${data.length} VAs`);
  return data || [];
}

async function getCreatorsWithCachedOrgId(organizationId) {
  const { data, error } = await supabase
    .from('creators')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });
  if (error) throw error;
  console.log(`✅ Retrieved ${data.length} creators`);
  return data || [];
}

async function getTwitterAccountsWithCachedOrgId(organizationId, options = {}) {
  const { skipDecryption = false } = options;
  const { data, error } = await supabase
    .from('twitter_accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (skipDecryption) {
    console.log(`✅ Retrieved ${data.length} Twitter accounts (passwords encrypted)`);
    return (data || []).map(account => ({
      ...account,
      password: '••••••••'
    }));
  }
  // Get passwords directly from encrypted_password column (stored as plain text)
  const processedData = (data || []).map(account => ({
    ...account,
    password: account.encrypted_password || ''
  }));
  console.log(`✅ Retrieved ${processedData.length} Twitter accounts`);
  return processedData;
}

async function getInstagramAccountsWithCachedOrgId(organizationId, options = {}) {
  const { skipDecryption = false } = options;
  const { data, error } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (skipDecryption) {
    console.log(`✅ Retrieved ${data.length} Instagram accounts (passwords encrypted)`);
    return (data || []).map(account => ({
      ...account,
      password: '••••••••'
    }));
  }
  // Get passwords directly from encrypted_password column (stored as plain text)
  const processedData = (data || []).map(account => ({
    ...account,
    password: account.encrypted_password || ''
  }));
  console.log(`✅ Retrieved ${processedData.length} Instagram accounts`);
  return processedData;
}

async function getGmailAccountsWithCachedOrgId(organizationId, options = {}) {
  const { skipDecryption = false } = options;
  const { data, error } = await supabase
    .from('gmail_accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('email', { ascending: true });
  if (error) throw error;
  if (skipDecryption) {
    console.log(`✅ Retrieved ${data.length} Gmail accounts (passwords encrypted)`);
    return (data || []).map(account => ({
      ...account,
      password: '••••••••'
    }));
  }
  // Get passwords directly from encrypted_password column (stored as plain text)
  const processedData = (data || []).map(account => ({
    ...account,
    password: account.encrypted_password || ''
  }));
  console.log(`✅ Retrieved ${processedData.length} Gmail accounts`);
  return processedData;
}

async function getAllVACreatorRelationsWithCachedOrgId(organizationId) {
  const { data: vas, error: vasError } = await supabase
    .from('vas')
    .select('id')
    .eq('organization_id', organizationId);
  if (vasError) throw vasError;
  const vaIds = vas.map(v => v.id);
  if (vaIds.length === 0) return [];
  const { data, error } = await supabase
    .from('va_creators')
    .select('va_id, creator_id')
    .in('va_id', vaIds);
  if (error) throw error;
  return data || [];
}

/**
 * Get all data for current user (for migration/export)
 * @returns {Promise<Object>}
 */
async function getAllUserData(options = {}) {
  try {
    const {
      loadStats = false,  // Load heavy stats data (Twitter stats, warmup progress)
      loadFinancials = true  // Load financial data (subscriptions, revenues, payments)
    } = options;

    // ⚡ CACHE organization ID to avoid 6 redundant queries
    const organizationId = await getOrganizationId();

    // ESSENTIAL DATA - Always load first (6 queries in parallel)
    // Skip password decryption for MUCH faster loading
    const [
      vas,
      creators,
      twitterAccounts,
      instagramAccounts,
      gmailAccounts,
      vaCreatorRelations
    ] = await Promise.all([
      getVAsWithCachedOrgId(organizationId),
      getCreatorsWithCachedOrgId(organizationId),
      getTwitterAccountsWithCachedOrgId(organizationId, { skipDecryption: false }),
      getInstagramAccountsWithCachedOrgId(organizationId, { skipDecryption: false }),
      getGmailAccountsWithCachedOrgId(organizationId, { skipDecryption: false }),
      getAllVACreatorRelationsWithCachedOrgId(organizationId)
    ]);

    console.log('✅ Retrieved essential user data');

    // OPTIONAL DATA - Load based on options
    let subscriptions = [];
    let revenues = [];
    let payments = [];
    let twitterStats = [];
    let warmupProgress = [];

    if (loadFinancials || loadStats) {
      const optionalPromises = [];

      if (loadFinancials) {
        optionalPromises.push(getSubscriptions(), getRevenues(), getPayments());
      }

      if (loadStats) {
        optionalPromises.push(getTwitterStats(), getWarmupProgress());
      }

      const optionalResults = await Promise.all(optionalPromises);

      if (loadFinancials) {
        [subscriptions, revenues, payments] = optionalResults.splice(0, 3);
      }

      if (loadStats) {
        [twitterStats, warmupProgress] = optionalResults;
      }

      console.log('✅ Retrieved optional user data');
    }

    return {
      vas,
      creators,
      vaCreatorRelations,
      twitterAccounts,
      instagramAccounts,
      gmailAccounts,
      subscriptions,
      revenues,
      payments,
      twitterStats,
      warmupProgress
    };
  } catch (error) {
    console.error('❌ Error getting all user data:', error);
    throw error;
  }
}

/**
 * Bulk insert data (for migration from localStorage)
 * @param {Object} data - Complete data object
 * @returns {Promise<Object>} - Summary of inserted records
 */
async function bulkInsertData(data) {
  try {
    const userId = await getUserId();
    const summary = {
      vas: 0,
      creators: 0,
      twitterAccounts: 0,
      instagramAccounts: 0,
      gmailAccounts: 0,
      subscriptions: 0,
      revenues: 0,
      payments: 0,
      twitterStats: 0
    };

    // Insert VAs
    if (data.vas && data.vas.length > 0) {
      const vasData = data.vas.map(va => ({
        user_id: userId,
        name: va.name,
        created_at: va.created || new Date().toISOString()
      }));

      const { data: insertedVAs, error } = await supabase
        .from('vas')
        .insert(vasData)
        .select();

      if (error) throw error;
      summary.vas = insertedVAs.length;
    }

    // Insert Creators
    if (data.creators && data.creators.length > 0) {
      const creatorsData = data.creators.map(creator => ({
        user_id: userId,
        name: creator.name,
        created_at: creator.created || new Date().toISOString()
      }));

      const { data: insertedCreators, error } = await supabase
        .from('creators')
        .insert(creatorsData)
        .select();

      if (error) throw error;
      summary.creators = insertedCreators.length;

      // Insert VA-Creator relationships
      if (data.vaCreatorRelations) {
        for (const relation of data.vaCreatorRelations) {
          await assignCreatorToVA(relation.va_id, relation.creator_id);
        }
      }
    }

    // Insert Twitter accounts (with encrypted passwords)
    if (data.twitterAccounts && data.twitterAccounts.length > 0) {
      for (const account of data.twitterAccounts) {
        await createTwitterAccount(account);
        summary.twitterAccounts++;
      }
    }

    // Insert Instagram accounts
    if (data.instagramAccounts && data.instagramAccounts.length > 0) {
      for (const account of data.instagramAccounts) {
        await createInstagramAccount(account);
        summary.instagramAccounts++;
      }
    }

    // Insert Gmail accounts
    if (data.gmailAccounts && data.gmailAccounts.length > 0) {
      for (const account of data.gmailAccounts) {
        await createGmailAccount(account);
        summary.gmailAccounts++;
      }
    }

    // Insert Subscriptions
    if (data.subs && data.subs.length > 0) {
      const subsData = data.subs.map(sub => ({
        user_id: userId,
        va_id: sub.vaId,
        date: sub.date,
        count: sub.count,
        amount: sub.amount,
        created_at: sub.created || new Date().toISOString()
      }));

      const { data: insertedSubs, error } = await supabase
        .from('subscriptions')
        .insert(subsData)
        .select();

      if (error) throw error;
      summary.subscriptions = insertedSubs.length;
    }

    // Insert Revenues
    if (data.revenues && data.revenues.length > 0) {
      const revenuesData = data.revenues.map(rev => ({
        user_id: userId,
        va_id: rev.vaId,
        date: rev.date,
        amount_usd: rev.amountUSD,
        amount_eur: rev.amountEUR,
        exchange_rate: rev.exchangeRate,
        tracking_link: rev.trackingLink || '',
        description: rev.description || '',
        commission: rev.commission || 0,
        created_at: rev.created || new Date().toISOString()
      }));

      const { data: insertedRevenues, error } = await supabase
        .from('revenues')
        .insert(revenuesData)
        .select();

      if (error) throw error;
      summary.revenues = insertedRevenues.length;
    }

    // Insert Payments
    if (data.vaPayments && data.vaPayments.length > 0) {
      const paymentsData = data.vaPayments.map(payment => ({
        user_id: userId,
        va_id: payment.vaId,
        date: payment.date,
        amount: payment.amount,
        description: payment.description || '',
        created_at: payment.created || new Date().toISOString()
      }));

      const { data: insertedPayments, error } = await supabase
        .from('payments')
        .insert(paymentsData)
        .select();

      if (error) throw error;
      summary.payments = insertedPayments.length;
    }

    // Insert Twitter Stats
    if (data.twitterStats && data.twitterStats.length > 0) {
      const statsData = data.twitterStats.map(stat => ({
        user_id: userId,
        username: stat.username,
        date: stat.date,
        followers_count: stat.followersCount || stat.followers_count,
        va_id: stat.vaId || null,
        creator_id: stat.creatorId || null,
        created_at: stat.created || new Date().toISOString()
      }));

      const { data: insertedStats, error } = await supabase
        .from('twitter_stats')
        .insert(statsData)
        .select();

      if (error) throw error;
      summary.twitterStats = insertedStats.length;
    }

    console.log('✅ Bulk insert completed:', summary);
    return summary;

  } catch (error) {
    console.error('❌ Error during bulk insert:', error);
    throw error;
  }
}

/**
 * Check database health
 * @returns {Promise<Object>}
 */
async function checkDatabaseHealth() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        status: 'error',
        message: 'User not authenticated'
      };
    }

    const data = await getAllUserData();

    return {
      status: 'healthy',
      user: user.email,
      counts: {
        vas: data.vas.length,
        creators: data.creators.length,
        twitterAccounts: data.twitterAccounts.length,
        instagramAccounts: data.instagramAccounts.length,
        gmailAccounts: data.gmailAccounts.length,
        subscriptions: data.subscriptions.length,
        revenues: data.revenues.length,
        payments: data.payments.length,
        twitterStats: data.twitterStats.length
      }
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

// ============================================================================
// ORGANIZATION/TEAM MANAGEMENT
// ============================================================================

/**
 * Get user's organization
 * For multi-agency admins, returns the active organization from localStorage
 * For regular members, returns their single organization
 * @returns {Promise<Object|null>}
 */
async function getUserOrganization() {
  try {
    const userId = await getUserId();

    // Check if there's an active organization ID in localStorage (multi-agency mode)
    const activeOrgId = localStorage.getItem('active_organization_id');

    if (activeOrgId) {
      // Verify user owns this organization
      const { data: ownedOrg, error: ownedError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', activeOrgId)
        .eq('owner_id', userId)
        .maybeSingle();

      if (!ownedError && ownedOrg) {
        return ownedOrg;
      }

      // If not found or error, clear invalid localStorage
      localStorage.removeItem('active_organization_id');
    }

    // Fallback: get first owned organization
    let { data: ownedOrgs, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', userId);

    if (error) throw error;

    // Si trouvé, retourner le premier
    if (ownedOrgs && ownedOrgs.length > 0) {
      if (ownedOrgs.length > 1) {
        console.log(`🏢 User owns ${ownedOrgs.length} organizations, using the first one`);
      }
      return ownedOrgs[0];
    }

    // Check if user is a manager
    const { data: managerRecord, error: managerError } = await supabase
      .from('managers')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!managerError && managerRecord) {
      // Get the organization the manager belongs to
      const { data: managerOrg, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', managerRecord.organization_id)
        .single();

      if (!orgError && managerOrg) {
        console.log(`👔 User is a manager of organization: ${managerOrg.name}`);
        return managerOrg;
      }
    }

    // Sinon, chercher s'il est membre d'une org
    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId);

    if (memberError) throw memberError;

    if (!memberships || memberships.length === 0) return null;

    // Si plusieurs orgs, prendre la première (ou préférence stockée)
    const membership = memberships[0];
    if (memberships.length > 1) {
      console.log(`🏢 User has ${memberships.length} organizations, using the first one`);
    }

    // Récupérer l'organisation via le membership
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', membership.organization_id)
      .single();

    if (orgError) throw orgError;

    return org;
  } catch (error) {
    console.error('❌ Error getting user organization:', error);
    throw error;
  }
}

/**
 * Get organization ID
 * @returns {Promise<string>}
 */
async function getOrganizationId() {
  // Lire directement depuis localStorage (plus rapide, pas de requête)
  const storedOrgId = localStorage.getItem('active_organization_id');
  if (storedOrgId) {
    return storedOrgId;
  }
  // Fallback sur l'organisation par défaut
  const org = await getUserOrganization();
  return org?.id;
}

/**
 * Get organization members
 * @returns {Promise<Array>}
 */
async function getOrganizationMembers() {
  try {
    const orgId = await getOrganizationId();

    // OPTIMIZED: Get members with user_profiles in a single query using join
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select(`
        *,
        user_profiles!inner (
          pseudo,
          email
        )
      `)
      .eq('organization_id', orgId);

    if (membersError) {
      // Fallback if join doesn't work (schema issue)
      console.warn('⚠️ Join failed, falling back to separate query');
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId);

      if (error) throw error;

      // Get all user_ids at once
      const userIds = (data || []).map(m => m.user_id);

      // Single query to get all profiles
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, pseudo, email')
        .in('user_id', userIds);

      // Create a map for quick lookup
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Merge data
      const membersWithPseudos = (data || []).map(member => {
        const profile = profileMap.get(member.user_id);
        return {
          ...member,
          pseudo: profile?.pseudo || 'Utilisateur',
          email: profile?.email || 'N/A'
        };
      });

      console.log(`✅ Retrieved ${membersWithPseudos.length} organization members (fallback)`);
      return membersWithPseudos;
    }

    // Map the joined data to the expected format
    const membersWithPseudos = (members || []).map(member => ({
      ...member,
      pseudo: member.user_profiles?.pseudo || 'Utilisateur',
      email: member.user_profiles?.email || 'N/A',
      user_profiles: undefined // Remove the nested object
    }));

    console.log(`✅ Retrieved ${membersWithPseudos.length} organization members (optimized)`);
    return membersWithPseudos;
  } catch (error) {
    console.error('❌ Error getting organization members:', error);
    // Return empty array instead of throwing to avoid blocking the page
    return [];
  }
}

/**
 * Get ALL users from the entire platform (admin function)
 * Returns ALL registered users, whether they're in an organization or not
 * @returns {Promise<Array>}
 */
async function getAllPlatformUsers() {
  try {
    console.log('🌍 Fetching ALL platform users (including users without organizations)...');

    // Get ALL user profiles first
    let allProfiles = [];
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, pseudo, email, created_at');

      if (profilesError) {
        console.warn('⚠️ Error fetching user profiles:', profilesError);
      } else {
        allProfiles = profiles || [];
      }
    } catch (profileError) {
      console.warn('⚠️ user_profiles table may not exist or is not accessible:', profileError);
    }

    console.log(`👤 Found ${allProfiles.length} user profiles`);

    // Get all organization memberships
    const { data: allMembers, error: membersError } = await supabase
      .from('organization_members')
      .select(`
        user_id,
        organization_id,
        role,
        organizations!inner (
          id,
          name,
          owner_id,
          created_at
        )
      `);

    if (membersError) {
      console.warn('⚠️ Error fetching organization members:', membersError);
    }

    console.log(`📊 Found ${allMembers?.length || 0} organization memberships`);

    // Create a map to group memberships by user
    const membershipsByUser = new Map();
    (allMembers || []).forEach(member => {
      if (!membershipsByUser.has(member.user_id)) {
        membershipsByUser.set(member.user_id, []);
      }
      membershipsByUser.get(member.user_id).push(member);
    });

    // Build complete user list from profiles
    const allUsers = allProfiles.map(profile => {
      const memberships = membershipsByUser.get(profile.user_id) || [];

      const organizations = memberships.map(member => ({
        org_id: member.organizations.id,
        org_name: member.organizations.name,
        role: member.role,
        is_owner: member.organizations.owner_id === profile.user_id,
        joined_at: member.organizations.created_at
      }));

      const isOwnerOf = memberships
        .filter(m => m.organizations.owner_id === profile.user_id)
        .map(m => m.organizations.name);

      return {
        user_id: profile.user_id,
        pseudo: profile.pseudo || 'Utilisateur',
        email: profile.email || 'N/A',
        created_at: profile.created_at || new Date().toISOString(),
        last_sign_in: null, // Last sign in not available without admin access
        organizations: organizations,
        total_organizations: organizations.length,
        is_owner_of: isOwnerOf
      };
    });

    console.log(`✅ Retrieved ${allUsers.length} total platform users (${allUsers.filter(u => u.total_organizations === 0).length} without organizations)`);
    return allUsers;
  } catch (error) {
    console.error('❌ Error getting all platform users:', error);
    throw error;
  }
}

/**
 * Delete user from entire platform (removes from auth, profiles, organizations)
 * Uses RPC function with SECURITY DEFINER to delete from auth.users
 * @param {string} userId - User ID to delete
 * @returns {Promise<boolean>}
 */
async function deletePlatformUser(userId) {
  try {
    console.log(`🗑️ Deleting user ${userId} from platform using RPC...`);

    // Call the server-side function that has privileges to delete from auth.users
    const { data, error } = await supabase.rpc('delete_user_completely', {
      target_user_id: userId
    });

    if (error) {
      console.error('❌ RPC error:', error);
      throw new Error(`Erreur lors de la suppression : ${error.message}`);
    }

    // Check the result
    if (data && !data.success) {
      console.error('❌ Delete failed:', data.message);
      throw new Error(data.message || 'Échec de la suppression');
    }

    console.log('✅ User deleted successfully from platform:', data);
    return true;
  } catch (error) {
    console.error('❌ Error deleting platform user:', error);
    throw error;
  }
}

/**
 * Invite member to organization (create invitation link/code)
 * @param {string} email - Email of invitee
 * @param {string} role - Role for the new member
 * @returns {Promise<Object>}
 */
async function inviteMemberToOrganization(email, role = 'member') {
  try {
    const orgId = await getOrganizationId();
    // For now, just return an invitation code
    return {
      invitationCode: `${orgId}:${role}`,
      organizationId: orgId,
      role: role
    };
  } catch (error) {
    console.error('❌ Error creating invitation:', error);
    throw error;
  }
}

/**
 * Accept invitation (add user to organization)
 * @param {string} invitationCode - Invitation code
 * @returns {Promise<Object>}
 */
async function acceptInvitation(invitationCode) {
  try {
    const [orgId, role] = invitationCode.split(':');
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('organization_members')
      .insert([{
        organization_id: orgId,
        user_id: userId,
        role: role || 'member'
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ User joined organization');
    return data;
  } catch (error) {
    console.error('❌ Error accepting invitation:', error);
    throw error;
  }
}

/**
 * Remove member from organization
 * @param {string} memberId - Member ID to remove
 * @returns {Promise<boolean>}
 */
async function removeMemberFromOrganization(memberId) {
  try {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;

    console.log('✅ Member removed from organization');
    return true;
  } catch (error) {
    console.error('❌ Error removing member:', error);
    throw error;
  }
}

/**
 * Update organization name
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>}
 */
async function updateOrganization(updates) {
  try {
    const orgId = await getOrganizationId();
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Organization updated');
    return data;
  } catch (error) {
    console.error('❌ Error updating organization:', error);
    throw error;
  }
}

// ============================================================================
// MULTI-AGENCY SYSTEM (Admin only)
// ============================================================================

/**
 * Get all organizations where user is owner (via owner_id OR organization_members with role owner)
 * @returns {Promise<Array>}
 */
async function getUserOwnedOrganizations() {
  try {
    // Check cache first (60 second TTL)
    const cached = memoryCache.get('user_owned_orgs');
    if (cached) {
      console.log('✅ Retrieved owned organizations from cache');
      return cached;
    }

    const userId = await getUserId();

    // OPTIMIZED: Run both queries in parallel
    const [ownedResult, memberResult] = await Promise.all([
      supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', userId),
      supabase
        .from('organization_members')
        .select('organization_id, organizations(*)')
        .eq('user_id', userId)
        .eq('role', 'owner')
    ]);

    if (ownedResult.error) throw ownedResult.error;
    if (memberResult.error) throw memberResult.error;

    // Combine and deduplicate
    const allOrgs = [...(ownedResult.data || [])];
    const existingIds = new Set(allOrgs.map(o => o.id));

    (memberResult.data || []).forEach(m => {
      if (m.organizations && !existingIds.has(m.organizations.id)) {
        allOrgs.push(m.organizations);
        existingIds.add(m.organizations.id);
      }
    });

    // Sort by name
    allOrgs.sort((a, b) => a.name.localeCompare(b.name));

    // Cache for 60 seconds
    memoryCache.set('user_owned_orgs', allOrgs, 60000);

    console.log(`✅ Retrieved ${allOrgs.length} owned organizations`);
    return allOrgs;
  } catch (error) {
    console.error('❌ Error getting owned organizations:', error);
    throw error;
  }
}

/**
 * Get organization by ID
 * @param {string} organizationId
 * @returns {Promise<Object|null>}
 */
async function getOrganizationById(organizationId) {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('❌ Error getting organization by ID:', error);
    throw error;
  }
}

/**
 * Create new organization
 * @param {string} name - Organization name
 * @returns {Promise<Object>}
 */
async function createOrganization(name) {
  try {
    const userId = await getUserId();

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([{
        name: name,
        owner_id: userId
      }])
      .select()
      .single();

    if (orgError) throw orgError;

    // Add owner as admin member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert([{
        organization_id: org.id,
        user_id: userId,
        role: 'admin'
      }]);

    if (memberError) throw memberError;

    console.log('✅ Organization created:', org.name);
    return org;
  } catch (error) {
    console.error('❌ Error creating organization:', error);
    throw error;
  }
}

/**
 * Check if user can use organization switcher (only founder florent.media2@gmail.com)
 * @returns {Promise<boolean>}
 */
async function isMultiAgencyAdmin() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    // Seul le fondateur peut voir le switcher d'agence
    return user?.email === 'florent.media2@gmail.com';
  } catch (error) {
    console.error('❌ Error checking multi-agency status:', error);
    return false;
  }
}

/**
 * Get active organization ID from localStorage or default
 * @returns {Promise<string|null>}
 */
async function getActiveOrganizationId() {
  try {
    // Check localStorage first
    const storedOrgId = localStorage.getItem('active_organization_id');

    if (storedOrgId) {
      // Verify user has access to this org
      const orgs = await getUserOwnedOrganizations();
      const hasAccess = orgs.some(org => org.id === storedOrgId);

      if (hasAccess) {
        return storedOrgId;
      }
    }

    // Fallback: get default organization
    const defaultOrg = await getUserOrganization();
    return defaultOrg?.id || null;
  } catch (error) {
    console.error('❌ Error getting active organization ID:', error);
    return null;
  }
}

/**
 * Set active organization ID
 * @param {string} organizationId
 */
function setActiveOrganizationId(organizationId) {
  localStorage.setItem('active_organization_id', organizationId);
  console.log('✅ Active organization set to:', organizationId);
}

/**
 * Get stats for an organization (member count, etc.)
 * @param {string} organizationId
 * @returns {Promise<Object>}
 */
async function getOrganizationStats(organizationId) {
  try {
    // Check cache first (30 second TTL)
    const cacheKey = `org_stats_${organizationId}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // OPTIMIZED: Run all 3 count queries in parallel instead of sequentially
    const [memberResult, creatorResult, vaResult] = await Promise.all([
      supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      supabase
        .from('creators')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      supabase
        .from('vas')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
    ]);

    const stats = {
      memberCount: memberResult.count || 0,
      creatorCount: creatorResult.count || 0,
      vaCount: vaResult.count || 0
    };

    // Cache for 30 seconds
    memoryCache.set(cacheKey, stats, 30000);

    return stats;
  } catch (error) {
    console.error('❌ Error getting organization stats:', error);
    return {
      memberCount: 0,
      creatorCount: 0,
      vaCount: 0
    };
  }
}

/**
 * Delete an organization and all its related data
 * @param {string} organizationId - Organization ID to delete
 * @returns {Promise<boolean>}
 */
async function deleteOrganization(organizationId) {
  try {
    const userId = await getUserId();

    // Verify user is the owner
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;

    if (org.owner_id !== userId) {
      throw new Error('Only the organization owner can delete it');
    }

    // Delete organization (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (deleteError) throw deleteError;

    console.log('✅ Organization deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting organization:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export all functions
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/CommonJS
  module.exports = {
    // Initialization
    initSupabase,
    supabase,

    // Encryption
    encryptPassword,
    decryptPassword,
    encryptPasswordFields,
    decryptPasswordFields,

    // Auth
    getCurrentUser,
    isAuthenticated,
    getUserId,
    signIn,
    signUp,
    signOut,

    // VAs
    getVAs,
    getVA,
    createVA,
    updateVA,
    deleteVA,

    // Creators
    getCreators,
    getCreatorsByVA,
    getCreator,
    createCreator,
    updateCreator,
    deleteCreator,

    // VA-Creator Relationships
    assignCreatorToVA,
    removeCreatorFromVA,
    getVAsForCreator,

    // Twitter Accounts
    getTwitterAccounts,
    getTwitterAccountsByVA,
    getTwitterAccountsByCreator,
    getTwitterAccount,
    createTwitterAccount,
    updateTwitterAccount,
    deleteTwitterAccount,

    // Instagram Accounts
    getInstagramAccounts,
    getInstagramAccountsByCreator,
    getInstagramAccountsByVA,
    createInstagramAccount,
    updateInstagramAccount,
    updateInstagramUsername,
    deleteInstagramAccount,

    // Gmail Accounts
    getGmailAccounts,
    getGmailAccount,
    getGmailAccountsByVA,
    createGmailAccount,
    updateGmailAccount,
    deleteGmailAccount,
    updateGmailAccountStatus,

    // Subscriptions
    getSubscriptions,
    getSubscriptionsByVA,
    createSubscription,
    updateSubscription,
    deleteSubscription,

    // Revenues
    getRevenues,
    getRevenuesByVA,
    createRevenue,
    updateRevenue,
    deleteRevenue,

    // Payments
    getPayments,
    getPaymentsByVA,
    createPayment,
    updatePayment,
    deletePayment,

    // Twitter Stats
    getTwitterStats,
    getTwitterStatsByUsername,
    getLatestTwitterStat,
    createTwitterStat,
    updateTwitterStat,
    deleteTwitterStat,

    // Instagram Stats
    getAllInstagramStats,
    getInstagramStatsByUsername,
    getLatestInstagramStat,
    createInstagramStat,
    updateInstagramStat,
    deleteInstagramStat,

    // Organizations/Team
    getUserOrganization,
    getOrganizationId,
    getOrganizationMembers,
    getAllPlatformUsers,
    deletePlatformUser,
    inviteMemberToOrganization,
    acceptInvitation,
    removeMemberFromOrganization,
    updateOrganization,

    // Multi-Agency System
    getUserOwnedOrganizations,
    getOrganizationById,
    createOrganization,
    isMultiAgencyAdmin,
    getActiveOrganizationId,
    setActiveOrganizationId,
    getOrganizationStats,

    // Utilities
    getCompleteVAData,
    getCompleteCreatorData,
    getAllUserData,
    bulkInsertData,
    checkDatabaseHealth
  };
} else {
  // Browser/Window
  const SupabaseClientAPI = {
    // Initialization
    initSupabase,

    // Encryption
    encryptPassword,
    decryptPassword,
    encryptPasswordFields,
    decryptPasswordFields,

    // Auth
    getCurrentUser,
    isAuthenticated,
    getUserId,
    signIn,
    signUp,
    signOut,

    // VAs
    getVAs,
    getVA,
    createVA,
    updateVA,
    deleteVA,

    // Creators
    getCreators,
    getCreatorsByVA,
    getCreator,
    createCreator,
    updateCreator,
    deleteCreator,

    // VA-Creator Relationships
    assignCreatorToVA,
    removeCreatorFromVA,
    getVAsForCreator,

    // Twitter Accounts
    getTwitterAccounts,
    getTwitterAccountsByVA,
    getTwitterAccountsByCreator,
    getTwitterAccount,
    createTwitterAccount,
    updateTwitterAccount,
    deleteTwitterAccount,

    // Instagram Accounts
    getInstagramAccounts,
    getInstagramAccountsByCreator,
    getInstagramAccountsByVA,
    createInstagramAccount,
    updateInstagramAccount,
    updateInstagramUsername,
    deleteInstagramAccount,

    // Gmail Accounts
    getGmailAccounts,
    getGmailAccount,
    getGmailAccountsByVA,
    createGmailAccount,
    updateGmailAccount,
    deleteGmailAccount,
    updateGmailAccountStatus,

    // Subscriptions
    getSubscriptions,
    getSubscriptionsByVA,
    createSubscription,
    updateSubscription,
    deleteSubscription,

    // Revenues
    getRevenues,
    getRevenuesByVA,
    createRevenue,
    updateRevenue,
    deleteRevenue,

    // Payments
    getPayments,
    getPaymentsByVA,
    createPayment,
    updatePayment,
    deletePayment,

    // Twitter Stats
    getTwitterStats,
    getTwitterStatsByUsername,
    getLatestTwitterStat,
    createTwitterStat,
    updateTwitterStat,
    deleteTwitterStat,

    // Instagram Stats
    getAllInstagramStats,
    getInstagramStatsByUsername,
    getLatestInstagramStat,
    createInstagramStat,
    updateInstagramStat,
    deleteInstagramStat,

    // Organizations/Team
    getUserOrganization,
    getOrganizationId,
    getOrganizationMembers,
    getAllPlatformUsers,
    deletePlatformUser,
    inviteMemberToOrganization,
    acceptInvitation,
    removeMemberFromOrganization,
    updateOrganization,

    // Multi-Agency System
    getUserOwnedOrganizations,
    getOrganizationById,
    createOrganization,
    isMultiAgencyAdmin,
    getActiveOrganizationId,
    setActiveOrganizationId,
    getOrganizationStats,

    // Utilities
    getCompleteVAData,
    getCompleteCreatorData,
    getAllUserData,
    bulkInsertData,
    checkDatabaseHealth,

    // Backup functions
    createAutomaticBackup,
    downloadBackup,
    getBackupHistory,
    deleteOldBackups,

    // Subs Tracking (Twitter accounts)
    getSubsTracking,
    getSubsTrackingByUsername,
    getLatestSubsTracking,
    upsertSubsTracking,
    createSubsTracking,
    bulkSaveSubsTracking,
    deleteSubsTracking,

    // Creator Subs Tracking
    getCreatorSubsTracking,
    getCreatorSubsByCreatorId,
    upsertCreatorSubsTracking,
    bulkSaveCreatorSubsTracking,

    // VA Subs Tracking (Tracking Links)
    getVASubsTracking,
    getVASubsByVAId,
    upsertVASubsTracking,
    bulkSaveVASubsTracking,

    // Twitter Subs Tracking
    getTwitterSubsTracking,
    bulkSaveTwitterSubsTracking
  };

  // Export to both window.SupabaseClient AND window directly
  window.SupabaseClient = SupabaseClientAPI;
  Object.assign(window, SupabaseClientAPI);
}

// ============================================================================
// BACKUP SYSTEM - Automatic Data Protection
// ============================================================================

/**
 * Créer un backup automatique de tous les données
 * @returns {Promise<Object>} - Backup metadata
 */
async function createAutomaticBackup() {
  try {
    const organizationId = currentOrganization?.id || localStorage.getItem('currentOrganizationId');
    if (!organizationId) {
      console.warn('⚠️ No organization ID for backup');
      return null;
    }

    console.log('🔄 Création du backup automatique...');

    // Récupérer toutes les données
    const [vas, creators, twitterAccounts, instagramAccounts, gmailAccounts] = await Promise.all([
      supabase.from('vas').select('*').eq('organization_id', organizationId),
      supabase.from('creators').select('*').eq('organization_id', organizationId),
      supabase.from('twitter_accounts').select('*').eq('organization_id', organizationId),
      supabase.from('instagram_accounts').select('*').eq('organization_id', organizationId),
      supabase.from('gmail_accounts').select('*').eq('organization_id', organizationId)
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      organizationId: organizationId,
      version: '1.0',
      data: {
        vas: vas.data || [],
        creators: creators.data || [],
        twitter_accounts: twitterAccounts.data || [],
        instagram_accounts: instagramAccounts.data || [],
        gmail_accounts: gmailAccounts.data || []
      },
      counts: {
        vas: (vas.data || []).length,
        creators: (creators.data || []).length,
        twitter_accounts: (twitterAccounts.data || []).length,
        instagram_accounts: (instagramAccounts.data || []).length,
        gmail_accounts: (gmailAccounts.data || []).length
      }
    };

    // Sauvegarder dans localStorage avec timestamp
    const backups = JSON.parse(localStorage.getItem('va_manager_backups') || '[]');
    backups.push({
      timestamp: backup.timestamp,
      size: new Blob([JSON.stringify(backup)]).size,
      counts: backup.counts
    });

    // Garder seulement les 10 derniers backups
    const recentBackups = backups.slice(-10);
    localStorage.setItem('va_manager_backups', JSON.stringify(recentBackups));

    // Sauvegarder le backup complet
    localStorage.setItem(`va_manager_backup_${backup.timestamp}`, JSON.stringify(backup));

    console.log('✅ Backup créé:', backup.timestamp);
    console.log('📊 Données sauvegardées:', backup.counts);

    return backup;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return null;
  }
}

/**
 * Télécharger un backup en JSON
 */
function downloadBackup() {
  try {
    const backups = JSON.parse(localStorage.getItem('va_manager_backups') || '[]');
    if (backups.length === 0) {
      alert('❌ Aucun backup disponible');
      return;
    }

    const latestBackup = backups[backups.length - 1];
    const backupData = JSON.parse(localStorage.getItem(`va_manager_backup_${latestBackup.timestamp}`) || '{}');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2)));
    element.setAttribute('download', `va-manager-backup-${latestBackup.timestamp.split('T')[0]}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    console.log('✅ Backup téléchargé');
  } catch (error) {
    console.error('❌ Download backup failed:', error);
    alert('❌ Erreur lors du téléchargement');
  }
}

/**
 * Obtenir l'historique des backups
 */
function getBackupHistory() {
  const backups = JSON.parse(localStorage.getItem('va_manager_backups') || '[]');
  return backups.map((b, i) => ({
    index: i + 1,
    timestamp: b.timestamp,
    date: new Date(b.timestamp).toLocaleString('fr-FR'),
    size: `${(b.size / 1024).toFixed(2)} KB`,
    counts: b.counts
  }));
}

/**
 * Supprimer les anciens backups (garder les 10 derniers)
 */
function deleteOldBackups() {
  const backups = JSON.parse(localStorage.getItem('va_manager_backups') || '[]');
  const toDelete = backups.slice(0, -10);

  toDelete.forEach(backup => {
    localStorage.removeItem(`va_manager_backup_${backup.timestamp}`);
  });

  const recentBackups = backups.slice(-10);
  localStorage.setItem('va_manager_backups', JSON.stringify(recentBackups));

  console.log(`🗑️ ${toDelete.length} anciens backups supprimés`);
}
