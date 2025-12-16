// Script pour ajouter la colonne photo_url à la table creators
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vjsovnhmjgehqawjmqxn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjQ4OTgsImV4cCI6MjA3NjAwMDg5OH0.uLqNP1Xb6uhrVBH_ESW7eemMdJ08cTrYZ9C0QHvAsDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function addPhotoColumn() {
    console.log('🔧 Ajout de la colonne photo_url à la table creators...');

    try {
        // Tester si la colonne existe déjà en essayant une requête
        const { data, error } = await supabase
            .from('creators')
            .select('photo_url')
            .limit(1);

        if (error && error.message.includes('photo_url')) {
            console.log('❌ La colonne photo_url n\'existe pas encore.');
            console.log('');
            console.log('⚠️  Tu dois l\'ajouter manuellement dans Supabase:');
            console.log('');
            console.log('1. Va sur https://supabase.com/dashboard');
            console.log('2. Ouvre ton projet');
            console.log('3. Va dans "SQL Editor"');
            console.log('4. Exécute cette commande:');
            console.log('');
            console.log('   ALTER TABLE creators ADD COLUMN photo_url TEXT;');
            console.log('');
        } else {
            console.log('✅ La colonne photo_url existe déjà!');
            console.log('');
            console.log('Tu peux maintenant ajouter des photos aux créatrices.');
        }

    } catch (err) {
        console.error('Erreur:', err.message);
    }
}

addPhotoColumn();
