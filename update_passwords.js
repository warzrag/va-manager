// Script pour mettre à jour les mots de passe dans Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://vjsovnhmjgehqawjmqxn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjQ4OTgsImV4cCI6MjA3NjAwMDg5OH0.uLqNP1Xb6uhrVBH_ESW7eemMdJ08cTrYZ9C0QHvAsDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mots de passe décodés
const passwords = {
  twitter: {
    "laura_bpt": "lauralaura",
    "laura_bpts": "Hugo95!!",
    "laurabptss": "Aristide66!!",
    "laura_ztg": "L@uraztg",
    "laura_jlk": "L@urajlk01",
    "laura_ity": "L@uraity01",
    "lau_bpt": "Laura95!!",
    "justiine_myks": "Juju67!!",
    "justinemyks": "Justine12",
    "jmyks8": "Justine123",
    "myksjustine": "Justine1234",
    "laura_frtl": "milo78za"
  },
  gmail: {
    "laura.media04@gmail.com": "Laura78!!",
    "claranathal78@gmail.com": "L@uraaccount02",
    "clarathreads10@gmail.com": "L@uraaccount01",
    "clarawarnez0@gmail.com": "Accountl@ura1",
    "ivorraflorent1@gmail.com": "flO1998florent",
    "laura.media05@gmail.com": "Laura92!!",
    "talia.media3@gmail.com": "Talia78??",
    "talia.gyro@gmail.com": "Jury76!!!",
    "taliamanzana@gmail.com": "Dury68!!",
    "indryt.media@gmail.com": "Florent95!!",
    "talia.marseille21@gmail.com": "Laro66!!",
    "florentivo95400@gmail.com": "Florent67!!",
    "aurascale.media@gmail.com": "Clemflo95!!"
  }
};

async function updateTwitterPasswords() {
  console.log('\n=== MISE À JOUR DES COMPTES TWITTER ===\n');

  // Récupérer tous les comptes Twitter
  const { data: accounts, error } = await supabase
    .from('twitter_accounts')
    .select('id, username');

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  console.log(`Trouvé ${accounts.length} comptes Twitter dans Supabase\n`);

  let updated = 0;
  let notFound = 0;

  for (const account of accounts) {
    const username = account.username.toLowerCase().replace(/^@/, '');
    const password = passwords.twitter[username];

    if (password) {
      const { error: updateError } = await supabase
        .from('twitter_accounts')
        .update({ encrypted_password: password })
        .eq('id', account.id);

      if (updateError) {
        console.log(`❌ @${account.username}: Erreur - ${updateError.message}`);
      } else {
        console.log(`✅ @${account.username}: mot de passe mis à jour`);
        updated++;
      }
    } else {
      console.log(`⚠️ @${account.username}: pas de mot de passe trouvé`);
      notFound++;
    }
  }

  console.log(`\n📊 Résultat Twitter: ${updated} mis à jour, ${notFound} sans mot de passe`);
}

async function updateGmailPasswords() {
  console.log('\n=== MISE À JOUR DES COMPTES GMAIL ===\n');

  // Récupérer tous les comptes Gmail
  const { data: accounts, error } = await supabase
    .from('gmail_accounts')
    .select('id, email');

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  console.log(`Trouvé ${accounts.length} comptes Gmail dans Supabase\n`);

  let updated = 0;
  let notFound = 0;

  for (const account of accounts) {
    const email = account.email.toLowerCase();
    const password = passwords.gmail[email];

    if (password && !password.includes('�')) { // Ignorer les mots de passe corrompus
      const { error: updateError } = await supabase
        .from('gmail_accounts')
        .update({ encrypted_password: password })
        .eq('id', account.id);

      if (updateError) {
        console.log(`❌ ${account.email}: Erreur - ${updateError.message}`);
      } else {
        console.log(`✅ ${account.email}: mot de passe mis à jour`);
        updated++;
      }
    } else {
      console.log(`⚠️ ${account.email}: pas de mot de passe valide trouvé`);
      notFound++;
    }
  }

  console.log(`\n📊 Résultat Gmail: ${updated} mis à jour, ${notFound} sans mot de passe`);
}

async function main() {
  console.log('🔄 Démarrage de la mise à jour des mots de passe...\n');

  await updateTwitterPasswords();
  await updateGmailPasswords();

  console.log('\n✅ Terminé!');
}

main().catch(console.error);
