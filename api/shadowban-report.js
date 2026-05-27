import { escapeHtml, formatStatus, sendTelegramMessage } from './_telegram.js';

function cleanEnv(value) {
    return String(value || '').replace(/^\uFEFF/, '').trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const CRON_SECRET = cleanEnv(process.env.CRON_SECRET);

function getCronToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return (req.headers['x-cron-secret'] || req.query?.secret || '').toString();
}

function hasSupabaseConfig() {
    return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY && CRON_SECRET);
}

const sbHeaders = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
};

function buildReport(accounts) {
    const counts = accounts.reduce((acc, account) => {
        const status = account.status || 'active';
        acc[status] = (acc[status] || 0) + 1;
        acc.total++;
        return acc;
    }, { total: 0, active: 0, shadowban: 0, banned: 0 });

    const percent = (value) => counts.total > 0 ? Math.round((value / counts.total) * 100) : 0;
    const atRisk = counts.shadowban + counts.banned;
    const bannedAccounts = accounts.filter(account => account.status === 'banned');
    const shadowbanAccounts = accounts.filter(account => account.status === 'shadowban');

    const formatAccountList = (items, max = 10) => {
        const visible = items.slice(0, max).map(account => {
            const username = escapeHtml(String(account.username || '').replace(/^@/, ''));
            return `- @${username}`;
        });
        if (items.length > max) visible.push(`- et ${items.length - max} autres`);
        return visible;
    };

    const lines = [
        '<b>VA Manager - Rapport shadowban</b>',
        `${counts.total} comptes surveilles`,
        '',
        `<b>Etat global</b>`,
        `Actifs : ${counts.active} (${percent(counts.active)}%)`,
        `Shadowban : ${counts.shadowban} (${percent(counts.shadowban)}%)`,
        `Bannis : ${counts.banned} (${percent(counts.banned)}%)`,
        '',
        atRisk > 0
            ? `<b>Priorite</b> : ${atRisk} compte${atRisk > 1 ? 's' : ''} a verifier`
            : '<b>Priorite</b> : rien a traiter pour le moment'
    ];

    if (bannedAccounts.length > 0) {
        lines.push('', `<b>Bannis (${bannedAccounts.length})</b>`, ...formatAccountList(bannedAccounts, 8));
    }

    if (shadowbanAccounts.length > 0) {
        lines.push('', `<b>Shadowban (${shadowbanAccounts.length})</b>`, ...formatAccountList(shadowbanAccounts, 12));
    }

    lines.push('', 'Action : ouvre VA Manager pour verifier, transferer ou corriger les comptes.');
    return lines.join('\n');
}

export default async function handler(req, res) {
    if (!hasSupabaseConfig()) {
        res.status(500).json({ error: 'server_misconfigured' });
        return;
    }
    if (getCronToken(req) !== CRON_SECRET) {
        res.status(401).json({ error: 'unauthorized' });
        return;
    }

    try {
        const listRes = await fetch(`${SUPABASE_URL}/rest/v1/twitter_accounts?select=id,username,status&order=username.asc`, {
            headers: sbHeaders
        });
        const accounts = await listRes.json();
        if (!Array.isArray(accounts)) {
            res.status(500).json({ error: 'supabase_list_failed', data: accounts });
            return;
        }

        const message = buildReport(accounts);
        await sendTelegramMessage(message);
        res.status(200).json({ ok: true, total: accounts.length });
    } catch (error) {
        res.status(500).json({ error: String(error?.message || error) });
    }
}
