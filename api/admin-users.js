// Proxy sécurisé pour la gestion des utilisateurs admin Supabase
// Nécessite un utilisateur authentifié avec role=admin dans user_metadata

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

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

function hasSupabaseConfig() {
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
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

const ADMIN_HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
};

export default async function handler(req, res) {
    applyCors(req, res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
    if (!hasSupabaseConfig()) { res.status(500).json({ error: 'server_misconfigured' }); return; }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const user = await verifyAuthToken(token);
    if (!user) { res.status(401).json({ error: 'unauthorized' }); return; }

    const role = normalizeRole(user?.user_metadata?.role);
    const orgId = user?.user_metadata?.organization_id;
    const isSuperAdmin = role === 'super_admin';
    if (role !== 'admin' && !isSuperAdmin) { res.status(403).json({ error: 'forbidden' }); return; }
    if (!isSuperAdmin && !orgId) { res.status(403).json({ error: 'no_organization' }); return; }

    const { op, userId, payload, page = 1, perPage = 50 } = req.body || {};

    // Scope org pour les créations :
    // - admin standard : forcé dans SON org, ne peut pas promouvoir super_admin
    // - super_admin   : peut cibler n'importe quel org ; si aucun fourni, défaut = son org
    if (op === 'create' && payload) {
        payload.user_metadata = payload.user_metadata || {};
        if (!isSuperAdmin) {
            payload.user_metadata.organization_id = orgId;
            if (payload.user_metadata.role === 'super_admin') {
                payload.user_metadata.role = 'viewer';
            }
        } else if (!payload.user_metadata.organization_id) {
            payload.user_metadata.organization_id = orgId;
        }
    }
    if (op === 'update' && payload?.user_metadata?.role === 'super_admin' && !isSuperAdmin) {
        return res.status(403).json({ error: 'cannot_promote_super_admin' });
    }

    // Vérification cross-org : un admin ne peut toucher que des users de SON org
    if ((op === 'update' || op === 'delete' || op === 'get') && !isSuperAdmin && userId) {
        const targetRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { headers: ADMIN_HEADERS });
        if (targetRes.ok) {
            const target = await targetRes.json();
            if (target?.user_metadata?.organization_id !== orgId) {
                return res.status(403).json({ error: 'cross_org_forbidden' });
            }
        }
    }

    let url, method;
    let body;

    switch (op) {
        case 'list':
            url = `${SUPABASE_URL}/auth/v1/admin/users?page=${parseInt(page, 10)}&per_page=${parseInt(perPage, 10)}`;
            method = 'GET';
            break;
        case 'create':
            url = `${SUPABASE_URL}/auth/v1/admin/users`;
            method = 'POST';
            body = JSON.stringify(payload);
            break;
        case 'update':
            if (!userId) return res.status(400).json({ error: 'missing_userId' });
            url = `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`;
            method = 'PUT';
            body = JSON.stringify(payload);
            break;
        case 'delete':
            if (!userId) return res.status(400).json({ error: 'missing_userId' });
            url = `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`;
            method = 'DELETE';
            break;
        case 'get':
            if (!userId) return res.status(400).json({ error: 'missing_userId' });
            url = `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`;
            method = 'GET';
            break;
        default:
            return res.status(400).json({ error: 'invalid_op' });
    }

    try {
        const up = await fetch(url, { method, headers: ADMIN_HEADERS, body });
        const text = await up.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch { json = text; }

        // Pour un admin non-super, on ne montre que les users de son org
        if (op === 'list' && !isSuperAdmin && json?.users) {
            json.users = json.users.filter(u => u.user_metadata?.organization_id === orgId);
        }
        res.status(up.status).json(json);
    } catch (e) {
        res.status(500).json({ error: 'proxy_failed', message: String(e?.message || e) });
    }
}
