// COPIEZ CE CODE DANS LA CONSOLE DE app.html

(async function fixGmailPasswords() {
    console.log('🔧 Démarrage de la correction des mots de passe Gmail...');

    // Le vrai mot de passe
    const realPassword = 'war$$8899';

    // Obfuscation simple (comme dans l'app)
    function obfuscatePassword(password) {
        return btoa(password).split('').reverse().join('');
    }

    // Test d'obfuscation
    const obfuscated = obfuscatePassword(realPassword);
    console.log('Original:', realPassword);
    console.log('Obfusqué:', obfuscated);
    console.log('Longueur:', obfuscated.length, 'chars');

    // Vérification que supabase existe
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase non trouvé! Assurez-vous d\'être sur app.html');
        return;
    }

    try {
        // Récupérer l'organisation
        const organizationId = await getOrganizationId();
        console.log('Organization ID:', organizationId);

        // Récupérer tous les comptes Gmail
        const { data: accounts, error } = await supabase
            .from('gmail_accounts')
            .select('id, email, encrypted_password')
            .eq('organization_id', organizationId);

        if (error) {
            console.error('❌ Erreur récupération:', error);
            return;
        }

        console.log(`✅ ${accounts.length} comptes trouvés`);

        // Mettre à jour chaque compte
        let successCount = 0;
        let errorCount = 0;

        for (const account of accounts) {
            console.log(`\n📧 Mise à jour de ${account.email}...`);
            console.log('Ancien encrypted_password:', account.encrypted_password || 'NULL');

            const { error: updateError } = await supabase
                .from('gmail_accounts')
                .update({
                    encrypted_password: obfuscated
                })
                .eq('id', account.id);

            if (updateError) {
                console.error(`❌ Erreur:`, updateError);
                errorCount++;
            } else {
                console.log(`✅ Mis à jour avec succès!`);
                successCount++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('RÉSUMÉ:');
        console.log(`✅ Succès: ${successCount} comptes`);
        if (errorCount > 0) {
            console.log(`❌ Erreurs: ${errorCount} comptes`);
        }

        if (successCount > 0) {
            console.log('\n🎉 TERMINÉ! Rechargez la page (F5) pour voir les changements.');

            // Optionnel: recharger automatiquement les données
            if (typeof loadGmailAccounts === 'function') {
                console.log('Rechargement des données...');
                await loadGmailAccounts();
                console.log('✅ Données rechargées! Testez en cliquant sur une icône de clé.');
            }
        }

    } catch (error) {
        console.error('❌ Erreur générale:', error);
    }
})();