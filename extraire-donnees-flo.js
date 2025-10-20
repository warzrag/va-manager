// Script pour extraire TOUTES les données de l'agence de Flo
// À exécuter dans la console du navigateur sur va_manager_pro.html

function extraireDonneesFlo() {
    const savedData = localStorage.getItem('vaManagerProData');
    if (!savedData) {
        console.log('❌ Aucune donnée trouvée');
        return null;
    }

    const data = JSON.parse(savedData);

    console.log('🔍 EXTRACTION DES DONNÉES - AGENCE FLO');
    console.log('=========================================\n');

    // Identifier l'organisation de Flo (supposons que c'est l'ID de l'organisation)
    // On va extraire TOUT ce qui n'est PAS dans l'agence de Leny

    const resultats = {
        vas: [],
        creators: [],
        gmailAccounts: [],
        twitterAccounts: [],
        instagramAccounts: [],
        subs: [],
        revenues: [],
        payments: []
    };

    // Fonction pour déobfusquer les mots de passe
    function deobfuscatePassword(obfuscated) {
        if (!obfuscated) return '';
        try {
            return atob(obfuscated.split('').reverse().join(''));
        } catch {
            return obfuscated;
        }
    }

    // 1. EXTRAIRE LES VAs (on suppose que Leny a un organization_id spécifique)
    console.log('👤 VIRTUAL ASSISTANTS:');
    if (data.vas) {
        data.vas.forEach(va => {
            // Exclure si c'est l'agence de Leny (adapter selon ton cas)
            // Pour l'instant, on prend TOUT et tu me diras lesquels garder
            const vaInfo = {
                id: va.id,
                name: va.name,
                email: va.email || '',
                organization_id: va.organization_id || 'non_defini'
            };
            resultats.vas.push(vaInfo);
            console.log(`  • ${va.name} (Org: ${vaInfo.organization_id})`);
        });
    }
    console.log('');

    // 2. EXTRAIRE LES CRÉATRICES avec leurs comptes
    console.log('👩 CRÉATRICES ET LEURS COMPTES:');
    if (data.creators) {
        data.creators.forEach(creator => {
            const creatorInfo = {
                id: creator.id,
                name: creator.name,
                vaIds: creator.vaIds || [],
                vaNames: (creator.vaIds || []).map(vaId => {
                    const va = data.vas.find(v => v.id === vaId);
                    return va ? va.name : 'inconnu';
                }),
                twitterAccounts: [],
                instagramAccounts: []
            };

            console.log(`\n  📋 ${creator.name} (VAs: ${creatorInfo.vaNames.join(', ')})`);

            // Comptes Twitter de cette créatrice
            if (creator.accounts && creator.accounts.length > 0) {
                console.log('    🐦 Twitter:');
                creator.accounts.forEach(account => {
                    const twitterInfo = {
                        username: account.username,
                        email: account.email || '',
                        password: deobfuscatePassword(account.password) || '',
                        assignedVaId: account.assignedVaId || '',
                        assignedVaName: account.assignedVaId ?
                            (data.vas.find(v => v.id === account.assignedVaId)?.name || 'inconnu') :
                            'non assigné'
                    };
                    creatorInfo.twitterAccounts.push(twitterInfo);
                    console.log(`      • ${twitterInfo.username}`);
                    console.log(`        Email: ${twitterInfo.email}`);
                    console.log(`        Password: ${twitterInfo.password}`);
                    console.log(`        VA: ${twitterInfo.assignedVaName}`);
                });
            }

            // Comptes Instagram de cette créatrice
            if (creator.instagramAccounts && creator.instagramAccounts.length > 0) {
                console.log('    📷 Instagram:');
                creator.instagramAccounts.forEach(account => {
                    const instaInfo = {
                        username: account.username,
                        email: account.email || '',
                        password: deobfuscatePassword(account.password) || '',
                        assignedVaId: account.assignedVaId || '',
                        assignedVaName: account.assignedVaId ?
                            (data.vas.find(v => v.id === account.assignedVaId)?.name || 'inconnu') :
                            'non assigné'
                    };
                    creatorInfo.instagramAccounts.push(instaInfo);
                    console.log(`      • ${instaInfo.username}`);
                    console.log(`        Email: ${instaInfo.email}`);
                    console.log(`        Password: ${instaInfo.password}`);
                    console.log(`        VA: ${instaInfo.assignedVaName}`);
                });
            }

            resultats.creators.push(creatorInfo);
        });
    }
    console.log('');

    // 3. EXTRAIRE LES COMPTES TWITTER STANDALONE
    console.log('🐦 COMPTES TWITTER STANDALONE:');
    if (data.twitterAccounts && data.twitterAccounts.length > 0) {
        data.twitterAccounts.forEach(account => {
            const twitterInfo = {
                username: account.username,
                email: account.email || '',
                password: deobfuscatePassword(account.password) || '',
                vaId: account.vaId || '',
                vaName: account.vaId ?
                    (data.vas.find(v => v.id === account.vaId)?.name || 'inconnu') :
                    'non assigné'
            };
            resultats.twitterAccounts.push(twitterInfo);
            console.log(`  • ${twitterInfo.username}`);
            console.log(`    Email: ${twitterInfo.email}`);
            console.log(`    Password: ${twitterInfo.password}`);
            console.log(`    VA: ${twitterInfo.vaName}`);
        });
    }
    console.log('');

    // 4. EXTRAIRE LES COMPTES INSTAGRAM STANDALONE
    console.log('📷 COMPTES INSTAGRAM STANDALONE:');
    if (data.instagramAccounts && data.instagramAccounts.length > 0) {
        data.instagramAccounts.forEach(account => {
            const instaInfo = {
                username: account.username,
                email: account.email || '',
                password: deobfuscatePassword(account.password) || '',
                vaId: account.vaId || '',
                vaName: account.vaId ?
                    (data.vas.find(v => v.id === account.vaId)?.name || 'inconnu') :
                    'non assigné'
            };
            resultats.instagramAccounts.push(instaInfo);
            console.log(`  • ${instaInfo.username}`);
            console.log(`    Email: ${instaInfo.email}`);
            console.log(`    Password: ${instaInfo.password}`);
            console.log(`    VA: ${instaInfo.vaName}`);
        });
    }
    console.log('');

    // 5. EXTRAIRE LES COMPTES GMAIL
    console.log('📧 COMPTES GMAIL:');
    if (data.gmailAccounts && data.gmailAccounts.length > 0) {
        data.gmailAccounts.forEach(gmail => {
            const gmailInfo = {
                email: gmail.email,
                password: deobfuscatePassword(gmail.password) || '',
                vaId: gmail.vaId || '',
                vaName: gmail.vaId ?
                    (data.vas.find(v => v.id === gmail.vaId)?.name || 'inconnu') :
                    'non assigné'
            };
            resultats.gmailAccounts.push(gmailInfo);
            console.log(`  • ${gmailInfo.email}`);
            console.log(`    Password: ${gmailInfo.password}`);
            console.log(`    VA: ${gmailInfo.vaName}`);
        });
    }
    console.log('');

    // 6. EXTRAIRE ABONNEMENTS, REVENUS, PAIEMENTS
    resultats.subs = data.subs || [];
    resultats.revenues = data.revenues || [];
    resultats.payments = data.payments || [];

    console.log('=========================================');
    console.log('📊 RÉSUMÉ EXTRACTION:');
    console.log(`  • ${resultats.vas.length} VAs`);
    console.log(`  • ${resultats.creators.length} Créatrices`);
    console.log(`  • ${resultats.gmailAccounts.length} Comptes Gmail`);

    let totalTwitter = resultats.twitterAccounts.length;
    resultats.creators.forEach(c => totalTwitter += c.twitterAccounts.length);
    console.log(`  • ${totalTwitter} Comptes Twitter (${resultats.twitterAccounts.length} standalone)`);

    let totalInsta = resultats.instagramAccounts.length;
    resultats.creators.forEach(c => totalInsta += c.instagramAccounts.length);
    console.log(`  • ${totalInsta} Comptes Instagram (${resultats.instagramAccounts.length} standalone)`);

    console.log(`  • ${resultats.subs.length} Abonnements`);
    console.log(`  • ${resultats.revenues.length} Revenus`);
    console.log(`  • ${resultats.payments.length} Paiements`);
    console.log('=========================================\n');

    console.log('💾 Pour exporter en JSON:');
    console.log('copy(JSON.stringify(resultats, null, 2))');
    console.log('Puis colle dans un fichier .json\n');

    // Stocker globalement pour accès facile
    window.donneesFlo = resultats;

    return resultats;
}

// Exécuter l'extraction
const donnees = extraireDonneesFlo();
console.log('✅ Données extraites! Accès via: window.donneesFlo');
console.log('📋 Pour copier: copy(JSON.stringify(window.donneesFlo, null, 2))');
