function cleanEnv(value) {
    return String(value || '').replace(/^\uFEFF/, '').trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'method_not_allowed' });
        return;
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        res.status(500).json({ error: 'server_misconfigured' });
        return;
    }

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/scan_runs?select=started_at,finished_at,status,checked,changed,errors,skipped,batch_limit&order=started_at.desc&limit=1`,
            {
                headers: {
                    apikey: SUPABASE_SERVICE_KEY,
                    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
                }
            }
        );
        const rows = await response.json().catch(() => []);
        if (!response.ok) {
            res.status(502).json({ error: 'scan_health_unavailable' });
            return;
        }

        const latestRun = Array.isArray(rows) ? rows[0] || null : null;
        const startedAt = latestRun?.started_at || null;
        const ageMs = startedAt ? Date.now() - new Date(startedAt).getTime() : null;
        res.status(200).json({
            ok: true,
            healthy: ageMs !== null && ageMs <= 25 * 60 * 1000,
            latestRun: latestRun ? {
                startedAt,
                finishedAt: latestRun.finished_at || null,
                status: latestRun.status,
                checked: latestRun.checked || 0,
                changed: latestRun.changed || 0,
                errors: latestRun.errors || 0,
                skipped: latestRun.skipped || 0,
                batchLimit: latestRun.batch_limit || 0,
                ageSeconds: Math.max(0, Math.round(ageMs / 1000))
            } : null
        });
    } catch {
        res.status(502).json({ error: 'scan_health_unavailable' });
    }
}
