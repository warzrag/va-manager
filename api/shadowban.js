// Proxy vers l'API shadowban tierce (contourne CORS)
// GET /api/shadowban?username=<twitter_handle>

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    const rawUsername = (req.query.username || '').toString().trim().replace(/^@/, '');
    if (!rawUsername || !/^[A-Za-z0-9_]{1,20}$/.test(rawUsername)) {
        res.status(400).json({ error: 'invalid_username' });
        return;
    }

    const upstream = `https://shadowban-api.yuzurisa.com:444/${encodeURIComponent(rawUsername)}`;

    try {
        const upstreamRes = await fetch(upstream, {
            method: 'GET',
            headers: {
                'Origin': 'https://shadowban.yuzurisa.com',
                'Referer': 'https://shadowban.yuzurisa.com/',
                'User-Agent': 'Mozilla/5.0 (compatible; va-manager-pro/1.0)',
                'Accept': 'application/json, text/plain, */*'
            },
            signal: AbortSignal.timeout(15000)
        });

        const text = await upstreamRes.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            res.status(502).json({ error: 'upstream_invalid_json', status: upstreamRes.status });
            return;
        }

        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
        res.status(200).json(data);
    } catch (err) {
        res.status(502).json({ error: 'upstream_failed', message: String(err?.message || err) });
    }
}
