// Proxy sécurisé pour les opérations Supabase côté serveur
// Permet au client de faire des écritures sans exposer la clé service_role
//
// POST body: { table, action, data?, filters?, options? }
// action: 'select' | 'insert' | 'update' | 'upsert' | 'delete'
// filters: [[col, op, val], ...]  op = 'eq' | 'in' | 'is' | 'neq'
// options: { columns, onConflict, order, limit, single }

function cleanEnv(value) {
    return String(value || '').replace(/^\uFEFF/, '').trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_ANON_KEY = cleanEnv(process.env.SUPABASE_ANON_KEY);

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

// Tables et actions autorisées (whitelist)
const ALLOWED_TABLES = new Set([
    'vas', 'creators', 'twitter_accounts', 'instagram_accounts',
    'gmail_accounts', 'subscriptions', 'revenues', 'warmup_progress',
    'status_changes', 'twitter_stats'
]);
const ALLOWED_ACTIONS = new Set(['select', 'insert', 'update', 'upsert', 'delete']);
const ALLOWED_OPS = new Set(['eq', 'in', 'is', 'neq']);

function normalizeRole(role) {
    const normalized = String(role || 'viewer').toLowerCase().replace(/-/g, '_');
    return normalized === 'superadmin' ? 'super_admin' : normalized;
}

async function verifyAuthToken(token) {
    if (!token) return null;
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

function buildFilterQuery(filters) {
    if (!Array.isArray(filters) || filters.length === 0) return '';
    const parts = filters.map(([col, op, val]) => {
        if (!ALLOWED_OPS.has(op)) return null;
        if (typeof col !== 'string' || col.length > 64 || !/^[a-zA-Z0-9_]+$/.test(col)) return null;
        if (op === 'in' && Array.isArray(val)) {
            return `${col}=in.(${val.map(v => encodeURIComponent(v)).join(',')})`;
        }
        if (op === 'is') return `${col}=is.${encodeURIComponent(val)}`;
        if (op === 'neq') return `${col}=neq.${encodeURIComponent(val)}`;
        return `${col}=eq.${encodeURIComponent(val)}`;
    }).filter(Boolean);
    return parts.join('&');
}

function extractTwoFa(notes) {
    const match = String(notes || '').match(/\[2FA:([^\]]+)\]/);
    return match ? match[1] : '';
}

function mergeTwoFaIntoNotes(incomingNotes, existingNotes) {
    const existingTwoFa = extractTwoFa(existingNotes);
    if (extractTwoFa(incomingNotes) || !existingTwoFa) return incomingNotes;
    const cleanIncoming = String(incomingNotes || '').replace(/\s*\[2FA:[^\]]*\]/g, '').trim();
    return `[2FA:${existingTwoFa}]${cleanIncoming ? ' ' + cleanIncoming : ''}`;
}

function getEqFilterValue(filters, column) {
    const filter = (Array.isArray(filters) ? filters : []).find(f => Array.isArray(f) && f[0] === column && f[1] === 'eq');
    return filter ? filter[2] : null;
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

async function preserveTwitterTwoFa(payload, filters = []) {
    const rows = Array.isArray(payload) ? payload : [payload];
    let ids = rows
        .filter(row => row && typeof row === 'object' && row.id && Object.prototype.hasOwnProperty.call(row, 'notes'))
        .map(row => row.id);
    const filteredId = getEqFilterValue(filters, 'id');
    if (!ids.length && filteredId && rows.some(row => row && typeof row === 'object' && Object.prototype.hasOwnProperty.call(row, 'notes'))) {
        ids = [filteredId];
    }
    if (!ids.length) return payload;

    const query = ids.map(id => encodeURIComponent(id)).join(',');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/twitter_accounts?select=id,notes&id=in.(${query})`, {
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
        }
    });
    if (!response.ok) return payload;

    const existingRows = await response.json().catch(() => []);
    const existingById = new Map((Array.isArray(existingRows) ? existingRows : []).map(row => [row.id, row.notes]));
    const mergeRow = (row) => {
        if (!row || typeof row !== 'object' || !Object.prototype.hasOwnProperty.call(row, 'notes')) return row;
        const rowId = row.id || filteredId;
        if (!rowId) return row;
        return { ...row, notes: mergeTwoFaIntoNotes(row.notes, existingById.get(rowId)) };
    };

    return Array.isArray(payload) ? payload.map(mergeRow) : mergeRow(payload);
}

async function removeCrossOrgUpserts(table, payload, targetOrg) {
    const rows = Array.isArray(payload) ? payload : [payload];
    const ids = rows
        .filter(row => row && typeof row === 'object' && row.id)
        .map(row => row.id);
    if (!targetOrg || ids.length === 0) return payload;

    const query = ids.map(id => encodeURIComponent(id)).join(',');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id,organization_id&id=in.(${query})`, {
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
        }
    });
    if (!response.ok) return payload;

    const existingRows = await response.json().catch(() => []);
    const existingOrgById = new Map((Array.isArray(existingRows) ? existingRows : []).map(row => [row.id, row.organization_id]));
    const filtered = rows.filter(row => {
        if (!row || typeof row !== 'object' || !row.id) return true;
        const existingOrg = existingOrgById.get(row.id);
        return !existingOrg || existingOrg === targetOrg;
    });

    return Array.isArray(payload) ? filtered : (filtered[0] || null);
}

function isEmptyPayload(payload) {
    return !payload || (Array.isArray(payload) && payload.length === 0);
}

export default async function handler(req, res) {
    applyCors(req, res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
    if (!hasSupabaseConfig()) { res.status(500).json({ error: 'server_misconfigured' }); return; }

    // Auth : requiert un utilisateur Supabase Auth valide
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const user = await verifyAuthToken(token);
    if (!user) { res.status(401).json({ error: 'unauthorized' }); return; }

    const role = normalizeRole(user?.user_metadata?.role);
    const orgId = user?.user_metadata?.organization_id;
    const userId = user?.id;
    const isSuperAdmin = role === 'super_admin';

    // Tous les comptes non super-admin doivent avoir un organization_id
    if (!isSuperAdmin && !orgId) {
        res.status(403).json({ error: 'no_organization', hint: 'user has no organization_id assigned' });
        return;
    }

    const { table, action, data, filters, options = {} } = req.body || {};

    if (!ALLOWED_TABLES.has(table)) { res.status(400).json({ error: 'invalid_table' }); return; }
    if (!ALLOWED_ACTIONS.has(action)) { res.status(400).json({ error: 'invalid_action' }); return; }

    // Rôle : viewer ne peut que lire
    if (role === 'viewer' && action !== 'select') {
        res.status(403).json({ error: 'forbidden', hint: 'viewer role is read-only' });
        return;
    }

    // SCOPE ORG :
    // - user standard : on ignore le filtre org du client, on force son org
    // - super_admin   : on respecte le filtre du client ; s'il n'en fournit PAS,
    //   on applique son propre org (pour qu'il voit son dashboard comme un admin normal).
    //   Pour voir d'autres orgs, il doit passer un filtre explicite côté client.
    // On filtre les filtres "organization_id" dont la valeur est vide/null (stale token)
    const clientFilters = (Array.isArray(filters) ? filters : [])
        .filter(f => !(Array.isArray(f) && f[0] === 'organization_id' && (f[2] === null || f[2] === undefined || f[2] === '')));
    const hasOrgFilter = clientFilters.some(f => Array.isArray(f) && f[0] === 'organization_id');
    const requestedOrg = hasOrgFilter ? clientFilters.find(f => Array.isArray(f) && f[0] === 'organization_id')?.[2] : null;
    const targetOrg = requestedOrg && await userCanAccessOrg(userId, orgId, requestedOrg, isSuperAdmin) ? requestedOrg : orgId;

    let scopedFilters;
    if (isSuperAdmin) {
        scopedFilters = hasOrgFilter || orgId
            ? (hasOrgFilter ? clientFilters : [...clientFilters, ['organization_id', 'eq', orgId]])
            : clientFilters;
    } else {
        const stripped = clientFilters.filter(f => !(Array.isArray(f) && f[0] === 'organization_id'));
        scopedFilters = [...stripped, ['organization_id', 'eq', targetOrg]];
    }

    // Pour INSERT/UPSERT : force org_id dans les données (sauf super_admin)
    const applyOrgToData = (payload) => {
        if (isSuperAdmin) return payload;
        if (Array.isArray(payload)) return payload.map(r => ({ ...r, organization_id: targetOrg }));
        if (payload && typeof payload === 'object') return { ...payload, organization_id: targetOrg };
        return payload;
    };
    let scopedData = (action === 'insert' || action === 'upsert') ? applyOrgToData(data) : data;
    // Pour UPDATE : empêcher le client de changer organization_id
    let safeUpdateData = (action === 'update' && data && typeof data === 'object' && !isSuperAdmin)
        ? Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'organization_id'))
        : data;

    if (table === 'twitter_accounts' && action === 'upsert') {
        scopedData = await preserveTwitterTwoFa(scopedData);
    }
    if (action === 'upsert' && ['twitter_accounts', 'gmail_accounts', 'instagram_accounts', 'creators', 'vas'].includes(table)) {
        scopedData = await removeCrossOrgUpserts(table, scopedData, targetOrg);
        if (isEmptyPayload(scopedData)) {
            res.status(200).json({ ok: true, data: [], skipped: 'cross_org_upsert' });
            return;
        }
    }
    if (table === 'twitter_accounts' && action === 'update') {
        safeUpdateData = await preserveTwitterTwoFa(safeUpdateData, scopedFilters);
    }

    const filterQs = buildFilterQuery(scopedFilters);
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    const qsParts = [];

    if (action === 'select') {
        qsParts.push(`select=${encodeURIComponent(options.columns || '*')}`);
        if (options.order) qsParts.push(`order=${encodeURIComponent(options.order)}`);
        if (options.limit) qsParts.push(`limit=${parseInt(options.limit, 10)}`);
        if (filterQs) qsParts.push(filterQs);
    } else if (action === 'delete' || action === 'update') {
        if (filterQs) qsParts.push(filterQs);
    }
    if (qsParts.length) url += '?' + qsParts.join('&');

    const headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': options.single ? 'return=representation' : 'return=representation'
    };

    let method = 'GET';
    let body;
    if (action === 'insert') { method = 'POST'; body = JSON.stringify(scopedData); }
    else if (action === 'upsert') {
        method = 'POST'; body = JSON.stringify(scopedData);
        if (options.onConflict) headers['Prefer'] += ',resolution=merge-duplicates';
        url += (url.includes('?') ? '&' : '?') + `on_conflict=${encodeURIComponent(options.onConflict || 'id')}`;
    }
    else if (action === 'update') { method = 'PATCH'; body = JSON.stringify(safeUpdateData); }
    else if (action === 'delete') { method = 'DELETE'; }

    try {
        const upstream = await fetch(url, { method, headers, body });
        const text = await upstream.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch { json = text; }
        if (!upstream.ok) {
            res.status(upstream.status).json({ error: 'supabase_error', status: upstream.status, details: json });
            return;
        }
        res.status(200).json({ ok: true, data: json });
    } catch (err) {
        res.status(500).json({ error: 'proxy_failed', message: String(err?.message || err) });
    }
}
