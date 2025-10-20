// Script pour analyser les données de va_manager_pro.html
// À exécuter dans la console du navigateur après avoir ouvert le fichier

function analyserDonnees() {
    console.log('🔍 ANALYSE COMPLÈTE DES DONNÉES');
    console.log('================================\n');

    // Récupérer les données du localStorage
    const savedData = localStorage.getItem('vaManagerProData');

    if (!savedData) {
        console.log('❌ Aucune donnée trouvée dans localStorage');
        return;
    }

    const data = JSON.parse(savedData);

    // 1. Comptes Gmail
    console.log('📧 COMPTES GMAIL:');
    console.log(`Total: ${data.gmailAccounts ? data.gmailAccounts.length : 0}`);
    if (data.gmailAccounts && data.gmailAccounts.length > 0) {
        data.gmailAccounts.forEach((gmail, i) => {
            console.log(`  ${i + 1}. ${gmail.email} (VA: ${gmail.vaId || 'Non assigné'})`);
        });
    }
    console.log('');

    // 2. Comptes Twitter
    let twitterTotal = 0;
    console.log('🐦 COMPTES TWITTER:');

    // Twitter dans creators
    if (data.creators) {
        data.creators.forEach(creator => {
            if (creator.accounts) {
                creator.accounts.forEach(account => {
                    console.log(`  • ${account.username} (Créatrice: ${creator.name})`);
                    twitterTotal++;
                });
            }
        });
    }

    // Twitter standalone
    if (data.twitterAccounts) {
        data.twitterAccounts.forEach(twitter => {
            console.log(`  • ${twitter.username} (Standalone)`);
            twitterTotal++;
        });
    }

    console.log(`Total Twitter: ${twitterTotal}`);
    console.log('');

    // 3. Comptes Instagram
    let instagramTotal = 0;
    console.log('📷 COMPTES INSTAGRAM:');

    // Instagram dans creators
    if (data.creators) {
        data.creators.forEach(creator => {
            if (creator.instagramAccounts) {
                creator.instagramAccounts.forEach(insta => {
                    console.log(`  • ${insta.username} (Créatrice: ${creator.name})`);
                    instagramTotal++;
                });
            }
        });
    }

    // Instagram standalone
    if (data.instagramAccounts) {
        data.instagramAccounts.forEach(insta => {
            console.log(`  • ${insta.username} (Standalone)`);
            instagramTotal++;
        });
    }

    console.log(`Total Instagram: ${instagramTotal}`);
    console.log('');

    // 4. Virtual Assistants
    console.log('👤 VIRTUAL ASSISTANTS (VAs):');
    console.log(`Total: ${data.vas ? data.vas.length : 0}`);
    if (data.vas && data.vas.length > 0) {
        data.vas.forEach((va, i) => {
            console.log(`  ${i + 1}. ${va.name} (ID: ${va.id})`);
        });
    }
    console.log('');

    // 5. Créatrices
    console.log('👩 CRÉATRICES:');
    console.log(`Total: ${data.creators ? data.creators.length : 0}`);
    if (data.creators && data.creators.length > 0) {
        data.creators.forEach((creator, i) => {
            const twitterCount = creator.accounts ? creator.accounts.length : 0;
            const instaCount = creator.instagramAccounts ? creator.instagramAccounts.length : 0;
            console.log(`  ${i + 1}. ${creator.name} - Twitter: ${twitterCount}, Instagram: ${instaCount}`);
        });
    }
    console.log('');

    // 6. Abonnements (Subs)
    console.log('💳 ABONNEMENTS:');
    console.log(`Total: ${data.subs ? data.subs.length : 0}`);
    console.log('');

    // 7. Revenues
    console.log('💰 REVENUS:');
    console.log(`Total: ${data.revenues ? data.revenues.length : 0}`);
    if (data.revenues && data.revenues.length > 0) {
        const totalRevenue = data.revenues.reduce((sum, rev) => sum + (rev.amount || 0), 0);
        console.log(`Montant total: ${totalRevenue.toFixed(2)}€`);
    }
    console.log('');

    // 8. Paiements
    console.log('💸 PAIEMENTS:');
    console.log(`Total: ${data.payments ? data.payments.length : 0}`);
    if (data.payments && data.payments.length > 0) {
        const totalPayments = data.payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
        console.log(`Montant total: ${totalPayments.toFixed(2)}€`);
    }
    console.log('');

    // 9. Statistiques Twitter
    console.log('📊 STATS TWITTER:');
    console.log(`Total entrées: ${data.twitterStats ? data.twitterStats.length : 0}`);
    console.log('');

    // RÉSUMÉ
    console.log('================================');
    console.log('📋 RÉSUMÉ:');
    console.log(`  • ${data.gmailAccounts ? data.gmailAccounts.length : 0} comptes Gmail`);
    console.log(`  • ${twitterTotal} comptes Twitter`);
    console.log(`  • ${instagramTotal} comptes Instagram`);
    console.log(`  • ${data.vas ? data.vas.length : 0} Virtual Assistants`);
    console.log(`  • ${data.creators ? data.creators.length : 0} Créatrices`);
    console.log(`  • ${data.subs ? data.subs.length : 0} Abonnements`);
    console.log(`  • ${data.revenues ? data.revenues.length : 0} Revenus`);
    console.log(`  • ${data.payments ? data.payments.length : 0} Paiements`);
    console.log('================================\n');

    // Retourner les données pour manipulation
    return {
        gmail: data.gmailAccounts || [],
        twitter: twitterTotal,
        instagram: instagramTotal,
        vas: data.vas || [],
        creators: data.creators || [],
        subs: data.subs || [],
        revenues: data.revenues || [],
        payments: data.payments || [],
        twitterStats: data.twitterStats || [],
        rawData: data
    };
}

// Exécuter l'analyse
console.log('Pour analyser les données, exécutez: analyserDonnees()');
console.log('Pour exporter en JSON: JSON.stringify(analyserDonnees().rawData, null, 2)');
