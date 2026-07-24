function cleanEnv(value) {
    return String(value || '').replace(/^\uFEFF/, '').trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_ANON_KEY = cleanEnv(process.env.SUPABASE_ANON_KEY);
const SCAN_BATCH_LIMIT = Math.max(1, Math.min(parseInt(cleanEnv(process.env.SCAN_BATCH_LIMIT) || '1', 10), 2000));

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function normalizeRole(role) {
    const normalized = String(role || 'viewer').toLowerCase().replace(/-/g, '_');
    return normalized === 'superadmin' ? 'super_admin' : normalized;
}

async function verifyAuthToken(token) {
    if (!token) return null;
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${token}`
            }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

async function userCanAccessOrg(userId, primaryOrgId, targetOrgId, isSuperAdmin) {
    if (!targetOrgId) return false;
    if (isSuperAdmin || targetOrgId === primaryOrgId) return true;
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/organization_members?select=id&user_id=eq.${encodeURIComponent(userId)}&organization_id=eq.${encodeURIComponent(targetOrgId)}&limit=1`,
        {
            headers: {
                apikey: SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
            }
        }
    );
    if (!response.ok) return false;
    const rows = await response.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0;
}

async function rest(path) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
        }
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
    return data;
}

function nextMinuteScan() {
    const next = new Date();
    next.setUTCSeconds(0, 0);
    next.setUTCMinutes(next.getUTCMinutes() + 1);
    if (next.getTime() <= Date.now()) {
        next.setUTCMinutes(next.getUTCMinutes() + 1);
    }
    return next.toISOString();
}

export default async function handler(req, res) {
    applyCors(req, res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
        res.status(500).json({ error: 'server_misconfigured' });
        return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const user = await verifyAuthToken(token);
    if (!user) { res.status(401).json({ error: 'unauthorized' }); return; }

    const role = normalizeRole(user?.user_metadata?.role);
    const orgId = user?.user_metadata?.organization_id;
    const requestedOrg = String(req.query?.organizationId || '').trim();
    const targetOrg = requestedOrg || orgId;
    const canAccess = await userCanAccessOrg(user.id, orgId, targetOrg, role === 'super_admin');
    if (!canAccess) { res.status(403).json({ error: 'forbidden' }); return; }

    try {
        const orgFilter = `organization_id=eq.${encodeURIComponent(targetOrg)}`;
        const totalRows = await rest(`twitter_accounts?select=id&${orgFilter}`);
        const latestRows = await rest(`twitter_accounts?select=last_scanned_at&${orgFilter}&last_scanned_at=not.is.null&order=last_scanned_at.desc&limit=1`);
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentRows = await rest(`twitter_accounts?select=id&${orgFilter}&last_scanned_at=gte.${encodeURIComponent(since)}`);
        const queueRows = await rest(`twitter_accounts?select=id,next_retry_at,last_scan_error&${orgFilter}&next_retry_at=not.is.null&order=next_retry_at.asc&limit=2000`);
        const runRows = await rest(`scan_runs?select=started_at,finished_at,checked,changed,errors,skipped,batch_limit,status,details&order=started_at.desc&limit=1`);
        const now = Date.now();
        const retryRows = Array.isArray(queueRows) ? queueRows : [];
        const retryDueRows = retryRows.filter(row => row.next_retry_at && new Date(row.next_retry_at).getTime() <= now);

        res.status(200).json({
            ok: true,
            organizationId: targetOrg,
            totalAccounts: Array.isArray(totalRows) ? totalRows.length : 0,
            scannedRecently: Array.isArray(recentRows) ? recentRows.length : 0,
            lastScannedAt: latestRows?.[0]?.last_scanned_at || null,
            nextScanAt: nextMinuteScan(),
            batchLimit: SCAN_BATCH_LIMIT,
            retryCount: retryRows.length,
            retryDueCount: retryDueRows.length,
            nextRetryAt: retryRows?.[0]?.next_retry_at || null,
            latestRun: runRows?.[0] || null
        });
    } catch (error) {
        res.status(500).json({ error: 'scan_status_failed', message: String(error?.message || error) });
    }
}
