// Proxy sécurisé pour la gestion des utilisateurs admin Supabase
// Nécessite un utilisateur authentifié avec role=admin dans user_metadata

const SUPABASE_URL = 'https://vjsovnhmjgehqawjmqxn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyNDg5OCwiZXhwIjoyMDc2MDAwODk4fQ.NQtRBw8KSlPFrpvINev80X4A17BIMFnbQ2r_8FLRdYM';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc292bmhtamdlaHFhd2ptcXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjQ4OTgsImV4cCI6MjA3NjAwMDg5OH0.uLqNP1Xb6uhrVBH_ESW7eemMdJ08cTrYZ9C0QHvAsDk';

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const user = await verifyAuthToken(token);
    if (!user) { res.status(401).json({ error: 'unauthorized' }); return; }

    const role = user?.user_metadata?.role || 'viewer';
    if (role !== 'admin') { res.status(403).json({ error: 'forbidden' }); return; }

    const { op, userId, payload, page = 1, perPage = 50 } = req.body || {};

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
        res.status(up.status).json(json);
    } catch (e) {
        res.status(500).json({ error: 'proxy_failed', message: String(e?.message || e) });
    }
}
