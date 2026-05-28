function cleanEnv(value) {
    return String(value || '').replace(/^\uFEFF|^ï»¿/, '').trim().replace(/^["']|["']$/g, '').replace(/^\uFEFF|^ï»¿/, '');
}

const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const CRON_SECRET = cleanEnv(process.env.CRON_SECRET);

const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
};

function getCronToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return (req.headers['x-cron-secret'] || req.query?.secret || '').toString();
}

export default async function handler(req, res) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !CRON_SECRET) {
        res.status(500).json({ error: 'server_misconfigured' });
        return;
    }
    if (getCronToken(req) !== CRON_SECRET) {
        res.status(401).json({ error: 'unauthorized' });
        return;
    }

    try {
        const statsRes = await fetch(`${SUPABASE_URL}/rest/v1/twitter_stats?select=id,username,twitter_account_id,organization_id&organization_id=is.null`, { headers });
        const stats = await statsRes.json();
        if (!Array.isArray(stats)) {
            res.status(500).json({ error: 'stats_list_failed', details: stats });
            return;
        }

        const repaired = [];
        for (const stat of stats) {
            let account = null;
            if (stat.twitter_account_id) {
                const accRes = await fetch(`${SUPABASE_URL}/rest/v1/twitter_accounts?id=eq.${encodeURIComponent(stat.twitter_account_id)}&select=id,organization_id`, { headers });
                const rows = await accRes.json().catch(() => []);
                account = Array.isArray(rows) ? rows[0] : null;
            }
            if (!account?.organization_id && stat.username) {
                const username = String(stat.username).replace(/^@/, '').toLowerCase();
                const accRes = await fetch(`${SUPABASE_URL}/rest/v1/twitter_accounts?username=eq.${encodeURIComponent(username)}&select=id,organization_id&limit=1`, { headers });
                const rows = await accRes.json().catch(() => []);
                account = Array.isArray(rows) ? rows[0] : null;
            }
            if (!account?.organization_id) continue;

            await fetch(`${SUPABASE_URL}/rest/v1/twitter_stats?id=eq.${encodeURIComponent(stat.id)}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    twitter_account_id: account.id || stat.twitter_account_id,
                    organization_id: account.organization_id
                })
            });
            repaired.push(stat.id);
        }

        res.status(200).json({ ok: true, repaired: repaired.length });
    } catch (error) {
        res.status(500).json({ error: String(error?.message || error) });
    }
}
