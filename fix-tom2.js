// Script pour corriger - remettre Flo comme owner de "Agence Flo"
// et mettre Tom comme owner de "Tom et Flo"
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vjsovnhmjgehqawjmqxn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjQ4OTgsImV4cCI6MjA3NjAwMDg5OH0.uLqNP1Xb6uhrVBH_ESW7eemMdJ08cTrYZ9C0QHvAsDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FLO_USER_ID = 'f007237d-207b-4cfe-8aa2-679e46396277';
const TOM_USER_ID = 'e1ac7c0b-d51e-417b-a557-c8414baa43d0';

async function fix() {
    console.log('🔧 Correction des organisations...');

    // 1. Remettre Flo comme owner de "Agence Flo"
    const { error: error1 } = await supabase
        .from('organizations')
        .update({ owner_id: FLO_USER_ID })
        .eq('id', 'bee22561-406d-4d7d-a9a9-50a6928cf037');

    if (error1) {
        console.error('❌ Erreur Agence Flo:', error1);
    } else {
        console.log('✅ Agence Flo -> Owner: Flo');
    }

    // 2. Mettre Tom comme owner de "Tom et Flo"
    const { error: error2 } = await supabase
        .from('organizations')
        .update({ owner_id: TOM_USER_ID })
        .eq('id', '97943916-59bf-476b-a089-0379c3806716');

    if (error2) {
        console.error('❌ Erreur Tom et Flo:', error2);
    } else {
        console.log('✅ Tom et Flo -> Owner: Tom');
    }

    // Vérifier
    const { data: orgs } = await supabase
        .from('organizations')
        .select('*');

    console.log('');
    console.log('📋 État final:');
    orgs.forEach(org => {
        const owner = org.owner_id === FLO_USER_ID ? 'Flo' :
                      org.owner_id === TOM_USER_ID ? 'Tom' : 'Unknown';
        console.log(`  - ${org.name}: Owner = ${owner}`);
    });

    console.log('');
    console.log('✅ Tom peut maintenant se connecter et voir "Tom et Flo"');
}

fix();
