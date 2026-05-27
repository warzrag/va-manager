function cleanEnv(value) {
    return String(value || '').replace(/^\uFEFF|^ï»¿/, '').trim().replace(/^["']|["']$/g, '').replace(/^\uFEFF|^ï»¿/, '');
}

const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const CRON_SECRET = cleanEnv(process.env.CRON_SECRET);

const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
};

function getCronToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return (req.headers['x-cron-secret'] || req.query?.secret || '').toString();
}

async function ensureOrganization({ id, name, ownerId }) {
    const existing = await fetch(`${SUPABASE_URL}/rest/v1/organizations?id=eq.${encodeURIComponent(id)}&select=id`, {
        headers
    });
    const rows = await existing.json().catch(() => []);
    if (Array.isArray(rows) && rows.length > 0) return false;

    const created = await fetch(`${SUPABASE_URL}/rest/v1/organizations`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ id, name, owner_id: ownerId || null })
    });
    if (!created.ok) {
        const details = await created.text();
        throw new Error(details || `organization_create_failed_${created.status}`);
    }
    return true;
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
        const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers });
        const payload = await usersRes.json();
        if (!usersRes.ok) {
            res.status(usersRes.status).json(payload);
            return;
        }

        const repaired = [];
        for (const user of payload.users || []) {
            const meta = user.user_metadata || {};
            if (!meta.organization_id) continue;
            const created = await ensureOrganization({
                id: meta.organization_id,
                name: meta.organization_name || meta.name || user.email || 'Organisation',
                ownerId: meta.role === 'admin' ? user.id : null
            });
            if (created) repaired.push({ organization_id: meta.organization_id, email: user.email });
        }

        res.status(200).json({ ok: true, repaired });
    } catch (error) {
        res.status(500).json({ error: String(error?.message || error) });
    }
}
