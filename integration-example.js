/**
 * Integration Example for VA Manager Pro
 *
 * This file shows how to integrate supabase-client.js with your existing
 * va_manager_pro.html application to replace localStorage operations.
 */

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize Supabase on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize Supabase client
    initSupabase();

    // Check if user is authenticated
    const authenticated = await isAuthenticated();

    if (authenticated) {
      // Load data from Supabase
      await loadDataFromSupabase();
      console.log('✅ Loaded data from Supabase');
    } else {
      // Show login modal
      showLoginModal();
    }
  } catch (error) {
    console.error('❌ Initialization error:', error);
    // Fallback to localStorage if Supabase fails
    loadDataFromLocalStorage();
  }
});

// ============================================================================
// AUTHENTICATION UI
// ============================================================================

function showLoginModal() {
  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.8); display: flex; align-items: center;
                justify-content: center; z-index: 10000;">
      <div style="background: white; padding: 2rem; border-radius: 1rem;
                  max-width: 400px; width: 90%;">
        <h2 style="margin-bottom: 1rem;">Sign In to VA Manager</h2>

        <form id="auth-form">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">Email</label>
            <input type="email" id="auth-email" required
                   style="width: 100%; padding: 0.5rem; border: 1px solid #ccc;
                          border-radius: 0.25rem;">
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">Password</label>
            <input type="password" id="auth-password" required
                   style="width: 100%; padding: 0.5rem; border: 1px solid #ccc;
                          border-radius: 0.25rem;">
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button type="submit" style="flex: 1; padding: 0.75rem;
                    background: #3b82f6; color: white; border: none;
                    border-radius: 0.5rem; cursor: pointer;">
              Sign In
            </button>
            <button type="button" id="signup-btn" style="flex: 1; padding: 0.75rem;
                    background: #10b981; color: white; border: none;
                    border-radius: 0.5rem; cursor: pointer;">
              Sign Up
            </button>
          </div>

          <button type="button" id="offline-btn" style="width: 100%;
                  margin-top: 1rem; padding: 0.5rem; background: #6b7280;
                  color: white; border: none; border-radius: 0.5rem;
                  cursor: pointer; font-size: 0.875rem;">
            Continue Offline (localStorage)
          </button>
        </form>

        <div id="auth-error" style="margin-top: 1rem; padding: 0.75rem;
             background: #fee2e2; color: #dc2626; border-radius: 0.5rem;
             display: none;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle sign in
  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    const result = await signIn(email, password);

    if (result.success) {
      modal.remove();
      await loadDataFromSupabase();
      showSuccess('Signed in successfully!');
    } else {
      showAuthError(result.error);
    }
  });

  // Handle sign up
  document.getElementById('signup-btn').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
      showAuthError('Please enter email and password');
      return;
    }

    const result = await signUp(email, password);

    if (result.success) {
      showAuthError('Check your email to confirm your account!', false);
    } else {
      showAuthError(result.error);
    }
  });

  // Handle offline mode
  document.getElementById('offline-btn').addEventListener('click', () => {
    modal.remove();
    loadDataFromLocalStorage();
    showWarning('Running in offline mode (localStorage)');
  });
}

function showAuthError(message, isError = true) {
  const errorDiv = document.getElementById('auth-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  errorDiv.style.background = isError ? '#fee2e2' : '#dcfce7';
  errorDiv.style.color = isError ? '#dc2626' : '#16a34a';
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadDataFromSupabase() {
  try {
    // Get all data from Supabase
    const supabaseData = await getAllUserData();

    // Transform to match existing data structure
    data.vas = supabaseData.vas.map(va => ({
      id: va.id,
      name: va.name,
      creators: [] // Will be populated below
    }));

    data.creators = supabaseData.creators.map(creator => ({
      id: creator.id,
      name: creator.name,
      vaIds: [],
      accounts: []
    }));

    // Build VA-Creator relationships
    for (const relation of supabaseData.vaCreatorRelations) {
      const creator = data.creators.find(c => c.id === relation.creator_id);
      if (creator && !creator.vaIds.includes(relation.va_id)) {
        creator.vaIds.push(relation.va_id);
      }
    }

    // Populate creators on VAs for backward compatibility
    data.vas.forEach(va => {
      va.creators = data.creators.filter(c => c.vaIds.includes(va.id));
    });

    // Twitter accounts
    data.twitterAccounts = supabaseData.twitterAccounts.map(acc => ({
      id: acc.id,
      username: acc.username,
      password: acc.password, // Already decrypted by the client
      creatorId: acc.creator_id,
      vaId: acc.va_id,
      gmailId: acc.gmail_id,
      created: acc.created_at
    }));

    // Add Twitter accounts to creators
    data.creators.forEach(creator => {
      creator.accounts = data.twitterAccounts
        .filter(acc => acc.creatorId === creator.id)
        .map(acc => ({
          id: acc.id,
          username: acc.username,
          password: acc.password,
          gmailId: acc.gmailId,
          assignedVaId: acc.vaId
        }));
    });

    // Instagram accounts
    data.instagramAccounts = supabaseData.instagramAccounts.map(acc => ({
      id: acc.id,
      username: acc.username,
      password: acc.password,
      creatorId: acc.creator_id,
      vaId: acc.va_id,
      gmailId: acc.gmail_id,
      created: acc.created_at
    }));

    // Gmail accounts
    data.gmailAccounts = supabaseData.gmailAccounts.map(acc => ({
      id: acc.id,
      email: acc.email,
      password: acc.password,
      vaId: acc.va_id,
      notes: acc.notes,
      created: acc.created_at
    }));

    // Subscriptions
    data.subs = supabaseData.subscriptions.map(sub => ({
      id: sub.id,
      vaId: sub.va_id,
      date: sub.date,
      count: sub.count,
      amount: sub.amount
    }));

    // Revenues
    data.revenues = supabaseData.revenues.map(rev => ({
      id: rev.id,
      vaId: rev.va_id,
      date: rev.date,
      amountUSD: rev.amount_usd,
      amountEUR: rev.amount_eur,
      exchangeRate: rev.exchange_rate,
      trackingLink: rev.tracking_link,
      description: rev.description,
      commission: rev.commission
    }));

    // Payments
    data.vaPayments = supabaseData.payments.map(payment => ({
      id: payment.id,
      vaId: payment.va_id,
      date: payment.date,
      amount: payment.amount,
      description: payment.description
    }));

    // Twitter stats
    data.twitterStats = supabaseData.twitterStats.map(stat => ({
      id: stat.id,
      username: stat.username,
      date: stat.date,
      followersCount: stat.followers_count,
      vaId: stat.va_id,
      creatorId: stat.creator_id
    }));

    // Update UI
    updateDisplay();

  } catch (error) {
    console.error('❌ Error loading from Supabase:', error);
    throw error;
  }
}

function loadDataFromLocalStorage() {
  // Your existing localStorage loading code
  const savedData = localStorage.getItem('vaManagerProData');
  if (savedData) {
    const loadedData = JSON.parse(savedData);
    data.vas = loadedData.vas || [];
    data.subs = loadedData.subs || [];
    data.revenues = loadedData.revenues || [];
    data.payments = loadedData.payments || [];
    data.vaPayments = loadedData.vaPayments || [];
    data.gmailAccounts = loadedData.gmailAccounts || [];
    data.creators = loadedData.creators || [];
    data.twitterAccounts = loadedData.twitterAccounts || [];
    data.instagramAccounts = loadedData.instagramAccounts || [];
    data.twitterStats = loadedData.twitterStats || [];
  }
  updateDisplay();
}

// ============================================================================
// DATA SAVING (Replace existing saveData function)
// ============================================================================

async function saveData() {
  try {
    const authenticated = await isAuthenticated();

    if (authenticated) {
      // Save to Supabase
      await saveDataToSupabase();
      updateSaveStatus('Saved to cloud ✓');
    } else {
      // Fallback to localStorage
      localStorage.setItem('vaManagerProData', JSON.stringify(data));
      updateSaveStatus('Saved locally ✓');
    }
  } catch (error) {
    console.error('❌ Save error:', error);
    // Fallback to localStorage on error
    localStorage.setItem('vaManagerProData', JSON.stringify(data));
    updateSaveStatus('Saved locally (backup) ✓');
  }
}

async function saveDataToSupabase() {
  // Note: Individual operations are already saved in real-time
  // This function is for manual save/sync operations
  console.log('✅ Data synced to Supabase');
}

// ============================================================================
// CRUD OPERATIONS (Replace existing functions)
// ============================================================================

// Example: Replace addVA function
async function addVA(e) {
  e.preventDefault();

  const vaName = document.getElementById('va-name').value.trim();

  try {
    const authenticated = await isAuthenticated();

    if (authenticated) {
      // Save to Supabase
      const newVA = await createVA({ name: vaName });

      // Add to local data
      data.vas.push({
        id: newVA.id,
        name: newVA.name,
        creators: []
      });
    } else {
      // Fallback to localStorage
      const newVA = {
        id: 'va_' + Date.now(),
        name: vaName,
        creators: []
      };
      data.vas.push(newVA);
      await saveData();
    }

    e.target.reset();
    updateVAGrid();
    showSuccess(`VA "${vaName}" added!`);

  } catch (error) {
    console.error('❌ Error adding VA:', error);
    showError('Failed to add VA: ' + error.message);
  }
}

// Example: Replace addCreator function
async function addCreator(e) {
  e.preventDefault();

  const creatorName = document.getElementById('creator-name').value.trim();

  try {
    const authenticated = await isAuthenticated();

    if (authenticated) {
      // Check for duplicates in Supabase
      const creators = await getCreators();
      if (creators.some(c => c.name.toLowerCase() === creatorName.toLowerCase())) {
        showError(`Creator "${creatorName}" already exists!`);
        return;
      }

      // Save to Supabase
      const newCreator = await createCreator({ name: creatorName });

      // Add to local data
      data.creators.push({
        id: newCreator.id,
        name: newCreator.name,
        vaIds: [],
        accounts: []
      });
    } else {
      // Fallback to localStorage
      if (data.creators.some(c => c.name.toLowerCase() === creatorName.toLowerCase())) {
        showError(`Creator "${creatorName}" already exists!`);
        return;
      }

      const newCreator = {
        id: 'creator_' + Date.now(),
        name: creatorName,
        vaIds: [],
        accounts: []
      };
      data.creators.push(newCreator);
      await saveData();
    }

    e.target.reset();
    updateAllCreatorsTable();
    showSuccess(`Creator "${creatorName}" added!`);

  } catch (error) {
    console.error('❌ Error adding creator:', error);
    showError('Failed to add creator: ' + error.message);
  }
}

// Example: Replace addAccount function (Twitter)
async function addTwitterAccountToSupabase(accountData) {
  try {
    const authenticated = await isAuthenticated();

    if (authenticated) {
      // Create Twitter account in Supabase
      const newAccount = await createTwitterAccount({
        username: accountData.username,
        password: accountData.password,
        creator_id: accountData.creatorId,
        va_id: accountData.vaId,
        gmail_id: accountData.gmailId
      });

      // Add to local data
      data.twitterAccounts.push({
        id: newAccount.id,
        username: newAccount.username,
        password: accountData.password,
        creatorId: accountData.creatorId,
        vaId: accountData.vaId,
        gmailId: accountData.gmailId,
        created: newAccount.created_at
      });

      // Update creator's accounts array
      const creator = data.creators.find(c => c.id === accountData.creatorId);
      if (creator) {
        if (!creator.accounts) creator.accounts = [];
        creator.accounts.push({
          id: newAccount.id,
          username: accountData.username,
          password: accountData.password,
          gmailId: accountData.gmailId,
          assignedVaId: accountData.vaId
        });
      }

      // Assign creator to VA if needed
      if (accountData.vaId && accountData.creatorId) {
        const creator = data.creators.find(c => c.id === accountData.creatorId);
        if (creator && !creator.vaIds.includes(accountData.vaId)) {
          await assignCreatorToVA(accountData.vaId, accountData.creatorId);
          creator.vaIds.push(accountData.vaId);
        }
      }

      return newAccount;
    } else {
      // Fallback to localStorage logic
      return null;
    }
  } catch (error) {
    console.error('❌ Error adding Twitter account:', error);
    throw error;
  }
}

// Example: Replace deleteVA function
async function deleteVA(vaId) {
  const va = data.vas.find(v => v.id === vaId);
  if (!va) return;

  // Show confirmation dialog (existing logic)
  if (!confirm(`Delete VA "${va.name}" and all associated data?`)) {
    return;
  }

  try {
    const authenticated = await isAuthenticated();

    if (authenticated) {
      // Delete from Supabase (cascades to related data)
      await deleteVA(vaId);
    }

    // Remove from local data
    data.vas = data.vas.filter(v => v.id !== vaId);
    data.subs = data.subs.filter(s => s.vaId !== vaId);
    data.revenues = data.revenues.filter(r => r.vaId !== vaId);
    data.vaPayments = data.vaPayments.filter(p => p.vaId !== vaId);

    if (!authenticated) {
      await saveData();
    }

    showSuccess(`VA "${va.name}" deleted successfully!`);
    updateVAGrid();
    updateDisplay();

  } catch (error) {
    console.error('❌ Error deleting VA:', error);
    showError('Failed to delete VA: ' + error.message);
  }
}

// ============================================================================
// MIGRATION UTILITY
// ============================================================================

async function migrateLocalStorageToSupabase() {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      showError('Please sign in first to migrate data');
      showLoginModal();
      return;
    }

    // Get localStorage data
    const localData = localStorage.getItem('vaManagerProData');
    if (!localData) {
      showError('No localStorage data found to migrate');
      return;
    }

    const data = JSON.parse(localData);

    // Show confirmation
    if (!confirm(
      `Migrate data to Supabase?\n\n` +
      `VAs: ${data.vas?.length || 0}\n` +
      `Creators: ${data.creators?.length || 0}\n` +
      `Twitter Accounts: ${data.twitterAccounts?.length || 0}\n` +
      `Subscriptions: ${data.subs?.length || 0}\n` +
      `Revenues: ${data.revenues?.length || 0}\n\n` +
      `This may take a few moments...`
    )) {
      return;
    }

    // Show progress
    const progressDiv = document.createElement('div');
    progressDiv.id = 'migration-progress';
    progressDiv.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                  background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                  z-index: 10000; text-align: center;">
        <h3>Migrating data to Supabase...</h3>
        <div style="margin: 1rem 0;">
          <div style="width: 300px; height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden;">
            <div id="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981);
                                         transition: width 0.3s;"></div>
          </div>
        </div>
        <p id="progress-text">Starting...</p>
      </div>
    `;
    document.body.appendChild(progressDiv);

    const updateProgress = (percent, text) => {
      document.getElementById('progress-bar').style.width = percent + '%';
      document.getElementById('progress-text').textContent = text;
    };

    // Perform migration
    updateProgress(10, 'Preparing data...');

    const summary = await bulkInsertData(data);

    updateProgress(100, 'Migration complete!');

    // Remove progress and show success
    setTimeout(() => {
      progressDiv.remove();
      showSuccess(
        `Migration completed successfully!\n\n` +
        `VAs: ${summary.vas}\n` +
        `Creators: ${summary.creators}\n` +
        `Twitter Accounts: ${summary.twitterAccounts}\n` +
        `Instagram Accounts: ${summary.instagramAccounts}\n` +
        `Gmail Accounts: ${summary.gmailAccounts}\n` +
        `Subscriptions: ${summary.subscriptions}\n` +
        `Revenues: ${summary.revenues}\n` +
        `Payments: ${summary.payments}\n` +
        `Twitter Stats: ${summary.twitterStats}`
      );

      // Reload from Supabase
      loadDataFromSupabase();
    }, 1500);

  } catch (error) {
    console.error('❌ Migration error:', error);
    document.getElementById('migration-progress')?.remove();
    showError('Migration failed: ' + error.message);
  }
}

// Add migration button to UI
function addMigrationButton() {
  const button = document.createElement('button');
  button.textContent = 'Migrate to Supabase';
  button.className = 'btn';
  button.style.cssText = 'background: #8b5cf6; color: white; margin: 1rem;';
  button.onclick = migrateLocalStorageToSupabase;

  // Add to settings or top of page
  const container = document.querySelector('.quick-actions') || document.body;
  container.appendChild(button);
}

// Call on page load if needed
// addMigrationButton();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function showSuccess(message) {
  alert('✅ ' + message);
  // Or use your existing notification system
}

function showError(message) {
  alert('❌ ' + message);
  // Or use your existing notification system
}

function showWarning(message) {
  alert('⚠️ ' + message);
  // Or use your existing notification system
}

function updateSaveStatus(status) {
  const statusDiv = document.getElementById('save-status');
  if (statusDiv) {
    statusDiv.textContent = status;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

// Make functions available globally
window.loadDataFromSupabase = loadDataFromSupabase;
window.migrateLocalStorageToSupabase = migrateLocalStorageToSupabase;
window.addMigrationButton = addMigrationButton;
