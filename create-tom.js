// Script pour créer un compte pour Tom
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vjsovnhmjgehqawjmqxn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjQ4OTgsImV4cCI6MjA3NjAwMDg5OH0.uLqNP1Xb6uhrVBH_ESW7eemMdJ08cTrYZ9C0QHvAsDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Identifiants pour Tom
const TOM_EMAIL = 'tom@vamanager.pro';
const TOM_PASSWORD = 'Tom2024!Secure';

async function createTomAccount() {
    console.log('🔐 Création du compte pour Tom...');
    console.log('');

    try {
        // 1. Créer le compte Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: TOM_EMAIL,
            password: TOM_PASSWORD,
            options: {
                data: {
                    name: 'Tom',
                    role: 'admin'
                }
            }
        });

        if (authError) {
            throw authError;
        }

        console.log('✅ Compte créé avec succès!');
        console.log('');
        console.log('='.repeat(50));
        console.log('📧 IDENTIFIANTS DE TOM');
        console.log('='.repeat(50));
        console.log(`Email:       ${TOM_EMAIL}`);
        console.log(`Mot de passe: ${TOM_PASSWORD}`);
        console.log('='.repeat(50));
        console.log('');
        console.log('🔗 URL: https://va-manager-pro.vercel.app/');
        console.log('');

        if (authData.user) {
            console.log('User ID:', authData.user.id);
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);

        if (error.message.includes('already registered')) {
            console.log('');
            console.log('ℹ️  Ce compte existe déjà. Voici les identifiants:');
            console.log('='.repeat(50));
            console.log(`Email:       ${TOM_EMAIL}`);
            console.log(`Mot de passe: ${TOM_PASSWORD}`);
            console.log('='.repeat(50));
        }
    }
}

createTomAccount();
