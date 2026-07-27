#!/usr/bin/env node

/**
 * Probe Yuzurisa shadowban API pacing safely.
 *
 * This script does not read or write VA Manager data. It only calls the
 * public Yuzurisa endpoint with sample usernames and reports success/error
 * rates by delay tier.
 *
 * Usage examples:
 *   node scripts/probe-yuzurisa-limit.js
 *   node scripts/probe-yuzurisa-limit.js --handles elonmusk,github,vercel --delays 10000,5000,3000 --rounds 2
 */

const DEFAULT_HANDLES = [
    'elonmusk',
    'github',
    'vercel',
    'x',
    'openai',
    'youtube',
    'google',
    'microsoft',
    'instagram',
    'nasa'
];

function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith('--')) continue;
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
            args[key] = true;
        } else {
            args[key] = next;
            i++;
        }
    }
    return args;
}

function toIntList(value, fallback) {
    if (!value) return fallback;
    const list = String(value)
        .split(',')
        .map(v => parseInt(v.trim(), 10))
        .filter(v => Number.isFinite(v) && v > 0);
    return list.length ? list : fallback;
}

function toHandleList(value) {
    if (!value) return DEFAULT_HANDLES;
    const list = String(value)
        .split(',')
        .map(v => v.trim().replace(/^@/, ''))
        .filter(v => /^[A-Za-z0-9_]{1,20}$/.test(v));
    return list.length ? list : DEFAULT_HANDLES;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function classifyBody(data) {
    if (!data) return 'invalid_json';
    if (data.detail === 'Internal error') return 'internal_error';
    if (!data.profile || !data.tests) return 'inconclusive';
    return 'ok';
}

async function checkHandle(handle, timeoutMs) {
    const startedAt = Date.now();
    try {
        const response = await fetch(`https://shadowban-api.yuzurisa.com:444/${encodeURIComponent(handle)}`, {
            headers: {
                Origin: 'https://shadowban.yuzurisa.com',
                Referer: 'https://shadowban.yuzurisa.com/',
                'User-Agent': 'Mozilla/5.0 (compatible; va-manager-limit-probe/1.0)',
                Accept: 'application/json'
            },
            signal: AbortSignal.timeout(timeoutMs)
        });
        const text = await response.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch {}
        const bodyStatus = classifyBody(data);
        return {
            handle,
            ok: response.ok && bodyStatus === 'ok',
            httpStatus: response.status,
            bodyStatus,
            ms: Date.now() - startedAt
        };
    } catch (error) {
        return {
            handle,
            ok: false,
            httpStatus: null,
            bodyStatus: String(error?.name || error?.message || error).slice(0, 80),
            ms: Date.now() - startedAt
        };
    }
}

function summarize(results) {
    const total = results.length;
    const ok = results.filter(r => r.ok).length;
    const errors = total - ok;
    const avgMs = Math.round(results.reduce((sum, r) => sum + r.ms, 0) / Math.max(total, 1));
    const maxMs = Math.max(...results.map(r => r.ms));
    const byStatus = results.reduce((acc, r) => {
        const key = `${r.httpStatus || 'network'}:${r.bodyStatus}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    return {
        total,
        ok,
        errors,
        successRate: total ? Math.round((ok / total) * 1000) / 10 : 0,
        avgMs,
        maxMs,
        byStatus
    };
}

async function runTier({ handles, delayMs, rounds, timeoutMs, stopErrorRate }) {
    const results = [];
    const expanded = [];
    for (let round = 0; round < rounds; round++) {
        for (const handle of handles) expanded.push(handle);
    }

    for (let i = 0; i < expanded.length; i++) {
        const handle = expanded[i];
        const result = await checkHandle(handle, timeoutMs);
        results.push(result);
        const summary = summarize(results);
        console.log(
            `[${delayMs}ms] ${i + 1}/${expanded.length} @${handle} -> ` +
            `${result.ok ? 'OK' : 'ERR'} ${result.httpStatus || '-'} ${result.bodyStatus} ${result.ms}ms ` +
            `(success ${summary.successRate}%)`
        );
        if (results.length >= 10 && (summary.errors / summary.total) >= stopErrorRate) {
            console.log(`[${delayMs}ms] Stop: error rate reached ${Math.round((summary.errors / summary.total) * 100)}%.`);
            break;
        }
        if (i < expanded.length - 1) await sleep(delayMs);
    }
    return summarize(results);
}

async function main() {
    const args = parseArgs(process.argv);
    const handles = toHandleList(args.handles);
    const delays = toIntList(args.delays, [10000, 5000, 3000, 2000, 1000]);
    const rounds = Math.max(1, Math.min(parseInt(args.rounds || '2', 10), 10));
    const timeoutMs = Math.max(3000, Math.min(parseInt(args.timeout || '15000', 10), 30000));
    const pauseBetweenTiersMs = Math.max(0, Math.min(parseInt(args.pause || '120000', 10), 600000));
    const stopErrorRate = Math.max(0.05, Math.min(parseFloat(args.stopErrorRate || '0.2'), 1));

    console.log('Yuzurisa limit probe');
    console.log(`Handles: ${handles.join(', ')}`);
    console.log(`Delays: ${delays.join(', ')} ms`);
    console.log(`Rounds: ${rounds}`);
    console.log(`Timeout: ${timeoutMs} ms`);
    console.log(`Stop tier when error rate >= ${Math.round(stopErrorRate * 100)}% after at least 10 requests`);
    console.log('');

    const tierSummaries = [];
    for (let i = 0; i < delays.length; i++) {
        const delayMs = delays[i];
        console.log(`--- Tier ${i + 1}/${delays.length}: ${delayMs}ms between requests ---`);
        const summary = await runTier({ handles, delayMs, rounds, timeoutMs, stopErrorRate });
        tierSummaries.push({ delayMs, ...summary });
        console.log(`Summary ${delayMs}ms: ${summary.ok}/${summary.total} OK, ${summary.successRate}% success, avg ${summary.avgMs}ms, max ${summary.maxMs}ms`);
        console.log(JSON.stringify(summary.byStatus, null, 2));
        console.log('');
        if (i < delays.length - 1 && pauseBetweenTiersMs > 0) {
            console.log(`Pause ${pauseBetweenTiersMs}ms before next tier...`);
            await sleep(pauseBetweenTiersMs);
        }
    }

    console.log('=== Final summary ===');
    for (const tier of tierSummaries) {
        console.log(`${tier.delayMs}ms: ${tier.ok}/${tier.total} OK (${tier.successRate}%), avg ${tier.avgMs}ms, max ${tier.maxMs}ms`);
    }

    const safe = [...tierSummaries]
        .filter(t => t.successRate >= 95)
        .sort((a, b) => a.delayMs - b.delayMs)[0];
    if (safe) {
        const recommended = Math.max(3000, Math.ceil(safe.delayMs * 1.5 / 1000) * 1000);
        console.log(`Recommended production SCAN_DELAY_MS: ${recommended}`);
    } else {
        console.log('Recommended production SCAN_DELAY_MS: keep 10000+ and investigate errors.');
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
