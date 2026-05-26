// Cron job : scanne tous les comptes Twitter via l'API shadowban
// Détecte les changements de statut et les stocke dans status_changes

function cleanEnv(value) {
    return String(value || '').replace(/^\uFEFF/, '').trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const CRON_SECRET = cleanEnv(process.env.CRON_SECRET);

function hasSupabaseConfig() {
    return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY && CRON_SECRET);
}

function getCronToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return (req.headers['x-cron-secret'] || req.query?.secret || '').toString();
}

const sbHeaders = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
};

function interpretShadowban(data) {
    const p = data.profile || {};
    const tests = data.tests || {};
    const notFound = p.exists === false || p.suspended === true;

    const flags = [];
    if (tests.search === false || tests.search_ban === true) flags.push('Search');
    if (tests.typeahead === false || tests.search_suggestion_ban === true) flags.push('Suggestion');
    if (tests.ghost?.ban === true || tests.ghost_ban === true) flags.push('Ghost');
    if (tests.more_replies?.ban === true || tests.reply_deboosting === true) flags.push('Reply');

    if (notFound) return { status: 'banned', flags: 'not_found' };
    if (flags.length > 0) return { status: 'shadowban', flags: flags.join(',') };
    return { status: 'active', flags: null };
}

async function fetchShadowban(username) {
    const url = `https://shadowban-api.yuzurisa.com:444/${encodeURIComponent(username)}`;
    const res = await fetch(url, {
        headers: {
            'Origin': 'https://shadowban.yuzurisa.com',
            'Referer': 'https://shadowban.yuzurisa.com/',
            'User-Agent': 'Mozilla/5.0 (compatible; va-manager-pro/1.0)',
            'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(12000)
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return null; }
}

async function fetchFollowers(username) {
    try {
        const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(username)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; va-manager-pro/1.0)' },
            signal: AbortSignal.timeout(8000)
        });
        const data = await res.json();
        if (data?.code === 200 && typeof data?.user?.followers === 'number') {
            return data.user.followers;
        }
    } catch {}
    return null;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
    if (!hasSupabaseConfig()) { res.status(500).json({ error: 'server_misconfigured' }); return; }
    if (getCronToken(req) !== CRON_SECRET) { res.status(401).json({ error: 'unauthorized' }); return; }

    const startedAt = Date.now();
    const results = { checked: 0, changed: 0, errors: 0, changes: [] };

    try {
        const listRes = await fetch(`${SUPABASE_URL}/rest/v1/twitter_accounts?select=id,username,status,organization_id`, { headers: sbHeaders });
        const accounts = await listRes.json();
        if (!Array.isArray(accounts)) {
            res.status(500).json({ error: 'supabase_list_failed', data: accounts });
            return;
        }

        for (const acc of accounts) {
            if (Date.now() - startedAt > 270000) break; // laisse 30s de marge avant le timeout
            const username = (acc.username || '').replace(/^@/, '');
            if (!username || !/^[A-Za-z0-9_]{1,20}$/.test(username)) continue;

            try {
                const [data, followers] = await Promise.all([
                    fetchShadowban(username),
                    fetchFollowers(username)
                ]);
                if (!data) { results.errors++; await sleep(400); continue; }
                const { status: newStatus, flags } = interpretShadowban(data);
                const oldStatus = acc.status || 'active';
                results.checked++;

                // Enregistre le count followers s'il a été récupéré (1 point par scan)
                if (typeof followers === 'number') {
                    const today = new Date().toISOString().slice(0, 10);
                    await fetch(`${SUPABASE_URL}/rest/v1/twitter_stats`, {
                        method: 'POST',
                        headers: sbHeaders,
                        body: JSON.stringify({
                            twitter_account_id: acc.id,
                            username: acc.username,
                            followers: followers,
                            date: today,
                            organization_id: acc.organization_id
                        })
                    });
                }

                if (newStatus !== oldStatus) {
                    // Update account
                    await fetch(`${SUPABASE_URL}/rest/v1/twitter_accounts?id=eq.${acc.id}`, {
                        method: 'PATCH',
                        headers: sbHeaders,
                        body: JSON.stringify({ status: newStatus })
                    });
                    // Log change
                    await fetch(`${SUPABASE_URL}/rest/v1/status_changes`, {
                        method: 'POST',
                        headers: sbHeaders,
                        body: JSON.stringify({
                            account_id: acc.id,
                            username: acc.username,
                            old_status: oldStatus,
                            new_status: newStatus,
                            flags: flags
                        })
                    });
                    results.changed++;
                    results.changes.push({ username: acc.username, from: oldStatus, to: newStatus, flags });
                }
            } catch (e) {
                results.errors++;
            }
            await sleep(150); // throttle anti rate-limit
        }

        res.status(200).json({ ok: true, durationMs: Date.now() - startedAt, ...results });
    } catch (err) {
        res.status(500).json({ error: String(err?.message || err) });
    }
}
