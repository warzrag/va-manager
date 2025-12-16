const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://vjsovnhmjgehqawjmqxn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjQ4OTgsImV4cCI6MjA3NjAwMDg5OH0.uLqNP1Xb6uhrVBH_ESW7eemMdJ08cTrYZ9C0QHvAsDk'
);

async function checkTwitterAccounts() {
    console.log('🔍 Checking Twitter accounts in Supabase...\n');

    const { data, error } = await supabase
        .from('twitter_accounts')
        .select('id, username, creator_id, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('📊 Total Twitter accounts: ' + data.length + '\n');
    console.log('All accounts:');
    data.forEach(function(acc, i) {
        var date = acc.created_at ? acc.created_at.substring(0, 10) : 'N/A';
        console.log((i+1) + '. @' + acc.username + ' (created: ' + date + ')');
    });
}

checkTwitterAccounts();
