const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function normalizeRole(role) {
    const normalized = String(role || 'viewer').toLowerCase().replace(/-/g, '_');
    return normalized === 'superadmin' ? 'super_admin' : normalized;
}

async function verifyAuthToken(token) {
    if (!token) return null;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`
        }
    });
    if (!res.ok) return null;
    return res.json();
}

async function countTable(table, orgId, isSuperAdmin) {
    const params = new URLSearchParams();
    params.set('select', 'id');
    if (!isSuperAdmin && orgId) {
        params.set('organization_id', `eq.${orgId}`);
    } else if (isSuperAdmin && orgId) {
        params.set('organization_id', `eq.${orgId}`);
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
        method: 'HEAD',
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            Prefer: 'count=exact'
        }
    });

    return {
        ok: res.ok,
        status: res.status,
        contentRange: res.headers.get('content-range')
    };
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'method_not_allowed' });
        return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const user = await verifyAuthToken(token);
    if (!user) {
        res.status(401).json({ error: 'unauthorized' });
        return;
    }

    const rawRole = user?.user_metadata?.role || 'viewer';
    const role = normalizeRole(rawRole);
    const orgId = user?.user_metadata?.organization_id || null;
    const isSuperAdmin = role === 'super_admin';

    const tables = {};
    for (const table of ['vas', 'creators', 'twitter_accounts', 'instagram_accounts', 'gmail_accounts']) {
        tables[table] = await countTable(table, orgId, isSuperAdmin);
    }

    res.status(200).json({
        userId: user.id,
        email: user.email,
        rawRole,
        role,
        orgId,
        isSuperAdmin,
        tables
    });
}
