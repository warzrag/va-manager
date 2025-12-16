const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://vjsovnhmjgehqawjmqxn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjQ4OTgsImV4cCI6MjA3NjAwMDg5OH0.uLqNP1Xb6uhrVBH_ESW7eemMdJ08cTrYZ9C0QHvAsDk'
);

async function getAllAccounts() {
    // 1. Organisations
    const { data: orgs } = await supabase.from('organizations').select('*');

    console.log('📋 ORGANISATIONS:');
    console.log('='.repeat(60));
    orgs.forEach(function(org) {
        console.log('  • ' + org.name + ' (ID: ' + org.id + ')');
    });

    // 2. Twitter par organisation
    console.log('\n\n📱 COMPTES TWITTER PAR ORGANISATION:');
    console.log('='.repeat(60));

    for (var i = 0; i < orgs.length; i++) {
        var org = orgs[i];
        const { data: twitter } = await supabase
            .from('twitter_accounts')
            .select('username, organization_id')
            .eq('organization_id', org.id);

        console.log('\n🏢 ' + org.name + ' (' + (twitter ? twitter.length : 0) + ' comptes):');
        if (twitter && twitter.length > 0) {
            twitter.forEach(function(acc) {
                console.log('   @' + acc.username);
            });
        } else {
            console.log('   (aucun compte)');
        }
    }

    // 3. Gmail par organisation
    console.log('\n\n📧 COMPTES GMAIL PAR ORGANISATION:');
    console.log('='.repeat(60));

    for (var j = 0; j < orgs.length; j++) {
        var org2 = orgs[j];
        const { data: gmail } = await supabase
            .from('gmail_accounts')
            .select('email, organization_id')
            .eq('organization_id', org2.id);

        console.log('\n🏢 ' + org2.name + ' (' + (gmail ? gmail.length : 0) + ' comptes):');
        if (gmail && gmail.length > 0) {
            gmail.forEach(function(acc) {
                console.log('   ' + acc.email);
            });
        } else {
            console.log('   (aucun compte)');
        }
    }
}

getAllAccounts();
