function cleanEnv(value) {
    return String(value || '').replace(/^\uFEFF|^Ã¯Â»Â¿/, '').trim().replace(/^["']|["']$/g, '').replace(/^\uFEFF|^Ã¯Â»Â¿/, '');
}

const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_ANON_KEY = cleanEnv(process.env.SUPABASE_ANON_KEY);

const HEADERS = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
};

function applyCors(req, res) {
    const allowedOrigins = new Set([
        'https://va-manager-pro.vercel.app',
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8000'
    ]);
    const origin = req.headers.origin || '';
    if (allowedOrigins.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function hasConfig() {
    return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY && SUPABASE_ANON_KEY);
}

function normalizeRole(role) {
    const normalized = String(role || 'viewer').toLowerCase().replace(/-/g, '_');
    return normalized === 'superadmin' ? 'super_admin' : normalized;
}

async function verifyAuthToken(token) {
    if (!token) return null;
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

async function userCanAccessOrg(userId, primaryOrgId, targetOrgId, isSuperAdmin) {
    if (!targetOrgId) return false;
    if (isSuperAdmin || targetOrgId === primaryOrgId) return true;
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/organization_members?select=id&user_id=eq.${encodeURIComponent(userId)}&organization_id=eq.${encodeURIComponent(targetOrgId)}&limit=1`,
        { headers: HEADERS }
    );
    if (!response.ok) return false;
    const rows = await response.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0;
}

function isValidJwk(value) {
    return value && typeof value === 'object'
        && value.kty === 'oct'
        && typeof value.k === 'string';
}

export default async function handler(req, res) {
    applyCors(req, res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
    if (!hasConfig()) { res.status(500).json({ error: 'server_misconfigured' }); return; }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const user = await verifyAuthToken(token);
    if (!user) { res.status(401).json({ error: 'unauthorized' }); return; }

    const role = normalizeRole(user?.user_metadata?.role);
    const primaryOrgId = user?.user_metadata?.organization_id || null;
    const isSuperAdmin = role === 'super_admin';
    const isAdmin = role === 'admin' || isSuperAdmin;
    if (!isAdmin) { res.status(403).json({ error: 'admin_required' }); return; }

    const { action, organizationId, keyJwk } = req.body || {};
    const targetOrgId = organizationId || primaryOrgId;
    if (!await userCanAccessOrg(user.id, primaryOrgId, targetOrgId, isSuperAdmin)) {
        res.status(403).json({ error: 'organization_forbidden' });
        return;
    }

    if (action === 'get') {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/organization_password_keys?select=key_jwk,updated_at&organization_id=eq.${encodeURIComponent(targetOrgId)}&limit=1`,
            { headers: HEADERS }
        );
        const rows = await response.json().catch(() => []);
        if (!response.ok) { res.status(response.status).json({ error: 'key_fetch_failed', details: rows }); return; }
        const row = Array.isArray(rows) ? rows[0] : null;
        res.status(200).json({ ok: true, keyJwk: row?.key_jwk || null, updatedAt: row?.updated_at || null });
        return;
    }

    if (action === 'set') {
        if (!isValidJwk(keyJwk)) { res.status(400).json({ error: 'invalid_key' }); return; }
        const response = await fetch(`${SUPABASE_URL}/rest/v1/organization_password_keys?on_conflict=organization_id`, {
            method: 'POST',
            headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=representation' },
            body: JSON.stringify({
                organization_id: targetOrgId,
                key_jwk: keyJwk,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) { res.status(response.status).json({ error: 'key_save_failed', details: payload }); return; }
        res.status(200).json({ ok: true });
        return;
    }

    res.status(400).json({ error: 'invalid_action' });
}
