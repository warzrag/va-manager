// Script pour associer Tom à l'organisation existante
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vjsovnhmjgehqawjmqxn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjQ4OTgsImV4cCI6MjA3NjAwMDg5OH0.uLqNP1Xb6uhrVBH_ESW7eemMdJ08cTrYZ9C0QHvAsDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TOM_USER_ID = 'e1ac7c0b-d51e-417b-a557-c8414baa43d0';

async function fixTom() {
    console.log('🔍 Recherche des organisations existantes...');

    // 1. Lister les organisations
    const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*');

    if (orgsError) {
        console.error('❌ Erreur:', orgsError);
        return;
    }

    console.log('📋 Organisations trouvées:');
    orgs.forEach((org, i) => {
        console.log(`  ${i + 1}. ${org.name} (ID: ${org.id}, Owner: ${org.owner_id})`);
    });

    if (orgs.length === 0) {
        console.log('❌ Aucune organisation trouvée');
        return;
    }

    // Prendre la première organisation (ou celle de Leny)
    const targetOrg = orgs.find(o => o.name.toLowerCase().includes('leny')) || orgs[0];
    console.log('');
    console.log(`🎯 Association de Tom à l'organisation: ${targetOrg.name}`);

    // 2. Vérifier si Tom existe déjà dans managers
    const { data: existingManager } = await supabase
        .from('managers')
        .select('*')
        .eq('user_id', TOM_USER_ID)
        .single();

    if (existingManager) {
        console.log('ℹ️  Tom est déjà manager');
    } else {
        // 3. Ajouter Tom comme manager de l'organisation
        const { data: manager, error: managerError } = await supabase
            .from('managers')
            .insert({
                name: 'Tom',
                user_id: TOM_USER_ID,
                organization_id: targetOrg.id
            })
            .select()
            .single();

        if (managerError) {
            console.log('⚠️  Erreur manager (table peut ne pas exister):', managerError.message);

            // Essayer d'ajouter comme owner de l'organisation
            console.log('🔄 Ajout de Tom comme co-owner...');

            // Mettre à jour l'organisation pour ajouter Tom
            const { error: updateError } = await supabase
                .from('organizations')
                .update({
                    owner_id: TOM_USER_ID
                })
                .eq('id', targetOrg.id);

            if (updateError) {
                console.error('❌ Erreur update:', updateError);
            } else {
                console.log('✅ Tom est maintenant owner de l\'organisation');
            }
        } else {
            console.log('✅ Tom ajouté comme manager:', manager.id);
        }
    }

    console.log('');
    console.log('✅ Terminé! Tom peut maintenant se connecter.');
}

fixTom();
