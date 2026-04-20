// Proxy sécurisé pour les opérations Supabase côté serveur
// Permet au client de faire des écritures sans exposer la clé service_role
//
// POST body: { table, action, data?, filters?, options? }
// action: 'select' | 'insert' | 'update' | 'upsert' | 'delete'
// filters: [[col, op, val], ...]  op = 'eq' | 'in' | 'is' | 'neq'
// options: { columns, onConflict, order, limit, single }

const SUPABASE_URL = 'https://vjsovnhmjgehqawjmqxn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyNDg5OCwiZXhwIjoyMDc2MDAwODk4fQ.NQtRBw8KSlPFrpvINev80X4A17BIMFnbQ2r_8FLRdYM';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjQ4OTgsImV4cCI6MjA3NjAwMDg5OH0.uLqNP1Xb6uhrVBH_ESW7eemMdJ08cTrYZ9C0QHvAsDk';

// Tables et actions autorisées (whitelist)
const ALLOWED_TABLES = new Set([
    'vas', 'creators', 'twitter_accounts', 'instagram_accounts',
    'gmail_accounts', 'subscriptions', 'revenues', 'warmup_progress',
    'status_changes'
]);
const ALLOWED_ACTIONS = new Set(['select', 'insert', 'update', 'upsert', 'delete']);
const ALLOWED_OPS = new Set(['eq', 'in', 'is', 'neq']);

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

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

    // Auth : requiert un utilisateur Supabase Auth valide
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const user = await verifyAuthToken(token);
    if (!user) { res.status(401).json({ error: 'unauthorized' }); return; }

    const role = user?.user_metadata?.role || 'viewer';

    const { table, action, data, filters, options = {} } = req.body || {};

    if (!ALLOWED_TABLES.has(table)) { res.status(400).json({ error: 'invalid_table' }); return; }
    if (!ALLOWED_ACTIONS.has(action)) { res.status(400).json({ error: 'invalid_action' }); return; }

    // Rôle : viewer ne peut que lire
    if (role !== 'admin' && action !== 'select') {
        res.status(403).json({ error: 'forbidden', hint: 'viewer role is read-only' });
        return;
    }

    const filterQs = buildFilterQuery(filters);
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
    if (action === 'insert') { method = 'POST'; body = JSON.stringify(data); }
    else if (action === 'upsert') {
        method = 'POST'; body = JSON.stringify(data);
        if (options.onConflict) headers['Prefer'] += ',resolution=merge-duplicates';
        url += (url.includes('?') ? '&' : '?') + `on_conflict=${encodeURIComponent(options.onConflict || 'id')}`;
    }
    else if (action === 'update') { method = 'PATCH'; body = JSON.stringify(data); }
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
