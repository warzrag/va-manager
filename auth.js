// Authentication Logic

let supabaseClient;

// Initialize Supabase
function initSupabase() {
    // Check config first
    if (!checkConfig()) {
        showAlert('Erreur de configuration. Consultez le README.md', 'error');
        return false;
    }

    try {
        // Utiliser l'objet global Supabase depuis le CDN
        const { createClient } = window.supabase;
        supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('✅ Supabase initialisé');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de Supabase:', error);
        showAlert('Erreur lors de l\'initialisation. Vérifiez votre configuration.', 'error');
        return false;
    }
}

// Detect user type and redirect to appropriate dashboard
async function detectUserTypeAndRedirect(userId) {
    try {
        console.log('🔍 Détection du type d\'utilisateur pour:', userId);

        // Check if user is a VA
        const { data: vaData, error: vaError } = await supabaseClient
            .from('vas')
            .select('id, name, organization_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (vaError && vaError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('❌ Erreur lors de la vérification VA:', vaError);
        }

        if (vaData) {
            console.log('✅ Utilisateur détecté comme VA:', vaData.name);
            showAlert('Connexion en tant que VA... Redirection...', 'success');
            setTimeout(() => {
                window.location.href = 'va-dashboard.html';
            }, 1000);
            return;
        }

        // Check if user is an organization owner
        const { data: orgData, error: orgError } = await supabaseClient
            .from('organizations')
            .select('id, name')
            .eq('owner_id', userId)
            .maybeSingle();

        if (orgError && orgError.code !== 'PGRST116') {
            console.error('❌ Erreur lors de la vérification Organization:', orgError);
        }

        if (orgData) {
            console.log('✅ Utilisateur détecté comme Owner:', orgData.name);
            showAlert('Connexion en tant que Owner... Redirection...', 'success');
            setTimeout(() => {
                window.location.href = 'app.html';
            }, 1000);
            return;
        }

        // Check if user is a member of any organization
        const { data: memberData, error: memberError } = await supabaseClient
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', userId)
            .maybeSingle();

        if (memberError && memberError.code !== 'PGRST116') {
            console.error('❌ Erreur lors de la vérification Member:', memberError);
        }

        if (memberData) {
            console.log('✅ Utilisateur détecté comme Member');
            showAlert('Connexion réussie... Redirection...', 'success');
            setTimeout(() => {
                window.location.href = 'app.html';
            }, 1000);
            return;
        }

        // Default: redirect to app.html (new user without organization)
        console.log('⚠️ Nouvel utilisateur sans organisation');
        showAlert('Bienvenue ! Redirection...', 'success');
        setTimeout(() => {
            window.location.href = 'app.html';
        }, 1000);

    } catch (error) {
        console.error('❌ Erreur lors de la détection du type d\'utilisateur:', error);
        // Fallback to app.html
        setTimeout(() => {
            window.location.href = 'app.html';
        }, 1000);
    }
}

// Check if user is already logged in on page load
async function checkExistingSession() {
    if (!initSupabase()) return;

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        if (session) {
            console.log('✅ Session active trouvée');
            showAlert('Connexion en cours...', 'info');
            await detectUserTypeAndRedirect(session.user.id);
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
    }
}

// Switch between login and register tabs
function switchTab(tab) {
    // Update tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));

    if (tab === 'login') {
        document.getElementById('login-form').classList.add('active');
    } else {
        document.getElementById('register-form').classList.add('active');
    }

    // Clear alerts
    hideAlert();
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = event.target.closest('.password-toggle').querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Show alert
function showAlert(message, type = 'info') {
    const alert = document.getElementById('alert');
    alert.className = `alert alert-${type} show`;
    alert.textContent = message;
}

// Hide alert
function hideAlert() {
    const alert = document.getElementById('alert');
    alert.classList.remove('show');
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();

    if (!initSupabase()) return;

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');

    // Validation
    if (!email || !password) {
        showAlert('Veuillez remplir tous les champs', 'error');
        return;
    }

    // Disable button and show loading
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Connexion...';
    hideAlert();

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('✅ Connexion réussie:', data);

        // Detect user type and redirect to appropriate dashboard
        await detectUserTypeAndRedirect(data.user.id);

    } catch (error) {
        console.error('❌ Erreur de connexion:', error);

        let errorMessage = 'Erreur lors de la connexion';

        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Email ou mot de passe incorrect';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Veuillez confirmer votre email';
        } else {
            errorMessage = error.message;
        }

        showAlert(errorMessage, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
    }
}

// Handle registration
async function handleRegister(event) {
    event.preventDefault();

    if (!initSupabase()) return;

    const pseudo = document.getElementById('register-pseudo').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const invitationCode = document.getElementById('register-invitation-code').value.trim();
    const btn = document.getElementById('register-btn');

    // Validation
    if (!pseudo || !email || !password || !passwordConfirm) {
        showAlert('Veuillez remplir tous les champs', 'error');
        return;
    }

    if (pseudo.length < 2) {
        showAlert('Le pseudo doit contenir au moins 2 caractères', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('Le mot de passe doit contenir au moins 6 caractères', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showAlert('Les mots de passe ne correspondent pas', 'error');
        return;
    }

    // Disable button and show loading
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Création du compte...';
    hideAlert();

    try {
        // 1. Create user account
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('✅ Compte créé:', data);

        // 2. Save pseudo to user_profiles table
        if (data.user) {
            try {
                const { error: profileError } = await supabaseClient
                    .from('user_profiles')
                    .insert([{
                        user_id: data.user.id,
                        pseudo: pseudo
                    }]);

                if (profileError) {
                    console.error('❌ Erreur lors de la sauvegarde du pseudo:', profileError);
                } else {
                    console.log('✅ Pseudo sauvegardé:', pseudo);
                }
            } catch (err) {
                console.error('❌ Erreur profil:', err);
            }
        }

        // 3. If invitation code provided, join the organization
        if (invitationCode && data.user) {
            console.log('🔵 Code d\'invitation fourni:', invitationCode);

            try {
                // Parse invitation code (format: organization_id:role)
                const [orgId, roleFromCode] = invitationCode.split(':');

                if (!orgId || !roleFromCode) {
                    throw new Error('Code d\'invitation invalide');
                }

                // SECURITY: Force role to 'member' - only owners can be admin
                const role = 'member';

                console.log('🔵 Tentative de rejoindre l\'organisation:', orgId);
                console.log('🔒 [SÉCURITÉ] Rôle forcé à "member"');

                // Add user to organization_members table
                const { error: memberError } = await supabaseClient
                    .from('organization_members')
                    .insert([{
                        organization_id: orgId,
                        user_id: data.user.id,
                        role: role
                    }]);

                if (memberError) {
                    console.error('❌ Erreur lors de l\'ajout à l\'organisation:', memberError);
                    showAlert('Compte créé, mais erreur avec le code d\'invitation. Vous pouvez le rejoindre manuellement depuis la page Équipe.', 'success');
                } else {
                    console.log('✅ Ajouté à l\'organisation avec succès');
                    showAlert('Compte créé et équipe rejointe avec succès ! Redirection...', 'success');
                }
            } catch (inviteError) {
                console.error('❌ Erreur avec le code d\'invitation:', inviteError);
                showAlert('Compte créé, mais code d\'invitation invalide. Vous pouvez rejoindre l\'équipe manuellement.', 'success');
            }
        } else {
            // No invitation code - create default organization
            console.log('🔵 Pas de code d\'invitation - création d\'une organisation par défaut');
        }

        // 3. Check if email confirmation is required
        if (data.user && !data.session) {
            showAlert('Compte créé ! Vérifiez votre email pour confirmer votre inscription.', 'success');
            btn.innerHTML = '<i class="fas fa-check"></i> Compte créé';
        } else {
            // Detect user type and redirect to appropriate dashboard
            await detectUserTypeAndRedirect(data.user.id);
        }

    } catch (error) {
        console.error('❌ Erreur d\'inscription:', error);

        let errorMessage = 'Erreur lors de la création du compte';

        if (error.message.includes('User already registered')) {
            errorMessage = 'Cet email est déjà enregistré';
        } else if (error.message.includes('Password should be')) {
            errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
        } else {
            errorMessage = error.message;
        }

        showAlert(errorMessage, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Page de connexion chargée');
    checkExistingSession();
});
