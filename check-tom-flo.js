const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://vjsovnhmjgehqawjmqxn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjQ4OTgsImV4cCI6MjA3NjAwMDg5OH0.uLqNP1Xb6uhrVBH_ESW7eemMdJ08cTrYZ9C0QHvAsDk'
);

async function getTomFloData() {
    // 1. Trouver l'organisation "Tom et Flo"
    console.log('🔍 Recherche de l\'agence "Tom et Flo"...\n');

    const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('*');

    if (orgError) {
        console.error('Error fetching orgs:', orgError);
        return;
    }

    console.log('📋 Organisations trouvées:');
    orgs.forEach(function(org) {
        console.log('  - ' + org.name + ' (ID: ' + org.id + ')');
    });

    var tomFloOrg = orgs.find(function(o) {
        return o.name && o.name.toLowerCase().includes('tom');
    });

    if (!tomFloOrg) {
        console.log('\n❌ Agence "Tom et Flo" non trouvée');
        return;
    }

    console.log('\n✅ Agence trouvée: ' + tomFloOrg.name + ' (ID: ' + tomFloOrg.id + ')');

    // 2. Récupérer les comptes Twitter de cette organisation
    console.log('\n📱 COMPTES TWITTER:');
    console.log('=' .repeat(50));

    const { data: twitter, error: twitterError } = await supabase
        .from('twitter_accounts')
        .select('username, password, creator_id, created_at')
        .eq('organization_id', tomFloOrg.id)
        .order('created_at', { ascending: false });

    if (twitterError) {
        console.error('Error:', twitterError);
    } else if (twitter && twitter.length > 0) {
        twitter.forEach(function(acc, i) {
            console.log((i+1) + '. @' + acc.username);
            console.log('   Password: ' + (acc.password || 'N/A'));
            console.log('');
        });
        console.log('Total: ' + twitter.length + ' comptes Twitter');
    } else {
        console.log('Aucun compte Twitter trouvé');
    }

    // 3. Récupérer les comptes Gmail de cette organisation
    console.log('\n📧 COMPTES GMAIL:');
    console.log('=' .repeat(50));

    const { data: gmail, error: gmailError } = await supabase
        .from('gmail_accounts')
        .select('email, password, created_at')
        .eq('organization_id', tomFloOrg.id)
        .order('created_at', { ascending: false });

    if (gmailError) {
        console.error('Error:', gmailError);
    } else if (gmail && gmail.length > 0) {
        gmail.forEach(function(acc, i) {
            console.log((i+1) + '. ' + acc.email);
            console.log('   Password: ' + (acc.password || 'N/A'));
            console.log('');
        });
        console.log('Total: ' + gmail.length + ' comptes Gmail');
    } else {
        console.log('Aucun compte Gmail trouvé');
    }
}

getTomFloData();
