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

    const recentlyChanged = accounts
        .filter(account => account.status && account.status !== 'active')
        .slice(0, 12)
        .map(account => `- @${escapeHtml(String(account.username || '').replace(/^@/, ''))} : ${escapeHtml(formatStatus(account.status))}`);

    const lines = [
        'Rapport VA Manager - Shadowban',
        `Total comptes : ${counts.total}`,
        `Actifs : ${counts.active}`,
        `Shadowban : ${counts.shadowban}`,
        `Bannis : ${counts.banned}`
    ];

    if (recentlyChanged.length > 0) {
        lines.push('', 'Comptes a surveiller :', ...recentlyChanged);
    } else {
        lines.push('', 'Aucun compte a surveiller pour le moment.');
    }

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
