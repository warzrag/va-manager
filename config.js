// Configuration Supabase
// IMPORTANT : Remplacez ces valeurs par vos propres clés Supabase

const SUPABASE_CONFIG = {
    // Votre URL de projet Supabase
    url: 'https://vjsovnhmjgehqawjmqxn.supabase.co',

    // Votre clé publique (anon key)
    anonKey: 'sb_publishable_kIgnmS0tIhEty9LiAhtkhA_luo1XGXG'
};

// Fonction pour vérifier la configuration
function checkConfig() {
    if (SUPABASE_CONFIG.url === 'VOTRE_SUPABASE_URL_ICI' ||
        SUPABASE_CONFIG.anonKey === 'VOTRE_SUPABASE_ANON_KEY_ICI') {
        console.error('⚠️ ERREUR : Vous devez configurer vos clés Supabase dans config.js');
        console.log('📖 Voir le README.md pour les instructions');
        return false;
    }
    return true;
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_CONFIG, checkConfig };
}
