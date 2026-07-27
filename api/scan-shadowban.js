// Cron job: scan the queue gently. Defaults target ~60 accounts/hour.

import { escapeHtml, formatStatus, sendTelegramMessage } from './_telegram.js';

function cleanEnv(value) {
    return String(value || '').replace(/^\uFEFF/, '').trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const CRON_SECRET = cleanEnv(process.env.CRON_SECRET);
const DEFAULT_SCAN_LIMIT = Math.max(1, Math.min(parseInt(cleanEnv(process.env.SCAN_BATCH_LIMIT) || '10', 10), 2000));
const SCAN_DELAY_MS = Math.max(1000, Math.min(parseInt(cleanEnv(process.env.SCAN_DELAY_MS) || '10000', 10), 30000));
const MAX_CONSECUTIVE_SCAN_ERRORS = Math.max(1, Math.min(parseInt(cleanEnv(process.env.SCAN_MAX_CONSECUTIVE_ERRORS) || '10', 10), 100));
const DAILY_RESCAN_AFTER_HOURS = Math.max(1, Math.min(parseInt(cleanEnv(process.env.SCAN_RESCAN_AFTER_HOURS) || '20', 10), 24));

function hasSupabaseConfig() {
    return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY && CRON_SECRET);
}

function getCronToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return (req.headers['x-cron-secret'] || req.query?.secret || '').toString();
}

const sbHeaders = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
};

const readHeaders = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
};

async function rest(path, options = {}) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...options,
        headers: { ...(options.method ? sbHeaders : readHeaders), ...(options.headers || {}) }
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
    return data;
}

function interpretShadowban(data) {
    const p = data.profile || {};
    const tests = data.tests || {};
    const notFound = p.exists === false || p.suspended === true;

    const flags = [];
    if (tests.search === false || tests.search_ban === true) flags.push('Search');
    if (tests.typeahead === false || tests.search_suggestion_ban === true) flags.push('Suggestion');
    if (tests.ghost?.ban === true || tests.ghost_ban === true) flags.push('Ghost');
    if (tests.more_replies?.ban === true || tests.reply_deboosting === true) flags.push('Reply');

    if (notFound) return { status: 'banned', flags: 'not_found' };
    if (flags.length > 0) return { status: 'shadowban', flags: flags.join(',') };
    return { status: 'active', flags: null };
}

async function fetchShadowban(username) {
    const res = await fetch(`https://shadowban-api.yuzurisa.com:444/${encodeURIComponent(username)}`, {
        headers: {
            Origin: 'https://shadowban.yuzurisa.com',
            Referer: 'https://shadowban.yuzurisa.com/',
            'User-Agent': 'Mozilla/5.0 (compatible; va-manager-pro/1.0)',
            Accept: 'application/json'
        },
        signal: AbortSignal.timeout(12000)
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return null; }
}

async function fetchFollowers(username) {
    try {
        const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(username)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; va-manager-pro/1.0)' },
            signal: AbortSignal.timeout(8000)
        });
        const data = await res.json();
        if (data?.code === 200 && typeof data?.user?.followers === 'number') return data.user.followers;
    } catch {}
    return null;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function normalizeName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getStockBucketFromName(name) {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    if (normalized.includes('shadow') && !normalized.includes('unshadow')) return 'shadowban';
    if (normalized.includes('unshadow') || normalized.includes('un shadow')) return 'unshadow';
    if (normalized.includes('vider')) return 'active';
    if (normalized.includes('actif') || normalized.includes('active')) return 'active';
    if (normalized.includes('dispo') || normalized.includes('available') || normalized.includes('disponible')) return 'available';
    return null;
}

function mergeStockTag(notes, stockCategory) {
    const cleanNotes = String(notes || '')
        .replace(/\s*\[STOCK:(available|active|shadowban|unshadow)\]/g, '')
        .trim();
    if (!stockCategory) return cleanNotes || null;
    return `[STOCK:${stockCategory}]${cleanNotes ? ' ' + cleanNotes : ''}`;
}

async function loadStockVAsByOrg() {
    const rows = await rest('vas?select=id,name,organization_id');
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(va => {
        const bucket = getStockBucketFromName(va.name);
        if (!bucket || !va.organization_id) return;
        if (!map.has(va.organization_id)) map.set(va.organization_id, {});
        const orgBuckets = map.get(va.organization_id);
        if (!orgBuckets[bucket]) orgBuckets[bucket] = va.id;
    });
    return map;
}

function getStockVaIds(orgBuckets = {}) {
    return new Set(Object.values(orgBuckets).filter(Boolean));
}

function getAutoStockCategory(oldStatus, newStatus) {
    if (newStatus === 'shadowban') return 'shadowban';
    if (newStatus === 'active' && oldStatus === 'shadowban') return 'unshadow';
    return null;
}

function getRetryDelayMinutes(errorCount) {
    if (errorCount <= 0) return 5;
    if (errorCount === 1) return 15;
    if (errorCount === 2) return 60;
    return 180;
}

function getNextRetryAt(errorCount) {
    return new Date(Date.now() + getRetryDelayMinutes(errorCount) * 60 * 1000).toISOString();
}

function buildStatusAlert({ username, oldStatus, newStatus, flags }) {
    const cleanUsername = String(username || '').replace(/^@/, '');
    const statusAction = {
        active: 'Le compte semble revenu normal.',
        shadowban: 'Le compte demande une verification shadowban.',
        banned: 'Le compte semble banni ou introuvable.'
    };
    const lines = [
        '<b>VA Manager - Changement detecte</b>',
        `Compte : @${escapeHtml(cleanUsername)}`,
        `Avant : ${escapeHtml(formatStatus(oldStatus))}`,
        `Maintenant : ${escapeHtml(formatStatus(newStatus))}`,
        '',
        escapeHtml(statusAction[newStatus] || 'Le statut du compte a change.')
    ];
    if (flags) lines.push(`Details : ${escapeHtml(flags)}`);
    lines.push('', `Verifier : https://shadowban.yuzurisa.com/${encodeURIComponent(cleanUsername)}`);
    return lines.join('\n');
}

async function createScanRun(scanLimit) {
    try {
        const rows = await rest('scan_runs', {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({ batch_limit: scanLimit, status: 'running' })
        });
        return Array.isArray(rows) ? rows[0] : null;
    } catch {
        return null;
    }
}

async function finishScanRun(runId, payload) {
    if (!runId) return;
    try {
        await rest(`scan_runs?id=eq.${encodeURIComponent(runId)}`, {
            method: 'PATCH',
            body: JSON.stringify({
                ...payload,
                finished_at: new Date().toISOString()
            })
        });
    } catch {}
}

async function updateRunOrganization(runId, organizationId) {
    if (!runId || !organizationId) return;
    try {
        await rest(`scan_runs?id=eq.${encodeURIComponent(runId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ organization_id: organizationId })
        });
    } catch {}
}

async function updateRunProgress(runId, details) {
    if (!runId) return;
    try {
        await rest(`scan_runs?id=eq.${encodeURIComponent(runId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ details })
        });
    } catch {}
}

export default async function handler(req, res) {
    if (!hasSupabaseConfig()) { res.status(500).json({ error: 'server_misconfigured' }); return; }
    if (getCronToken(req) !== CRON_SECRET) { res.status(401).json({ error: 'unauthorized' }); return; }

    const startedAt = Date.now();
    const scanLimit = Math.max(1, Math.min(parseInt(req.query?.limit || DEFAULT_SCAN_LIMIT, 10), 2000));
    const dueBefore = new Date(Date.now() - DAILY_RESCAN_AFTER_HOURS * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();
    const run = await createScanRun(scanLimit);
    const results = { checked: 0, changed: 0, errors: 0, skipped: 0, changes: [], scannedAccounts: [] };
    let consecutiveErrors = 0;
    let stoppedReason = null;

    try {
        const allAccounts = await rest(
            'twitter_accounts?select=id,username,status,organization_id,notes,va_id,assigned_va_id,last_scanned_at,scan_error_count,next_retry_at,last_scan_error,created_at&order=next_retry_at.asc.nullsfirst,last_scanned_at.asc.nullsfirst,created_at.asc&limit=2000'
        );
        if (!Array.isArray(allAccounts)) throw new Error('supabase_list_failed');
        const accounts = allAccounts.filter(acc => {
            if (acc.next_retry_at) return new Date(acc.next_retry_at).getTime() <= Date.now();
            if (!acc.last_scanned_at) return true;
            return new Date(acc.last_scanned_at).getTime() <= new Date(dueBefore).getTime();
        }).slice(0, scanLimit);
        const stockVAsByOrg = await loadStockVAsByOrg();
        if (accounts[0]?.organization_id) await updateRunOrganization(run?.id, accounts[0].organization_id);

        for (const acc of accounts) {
            if (Date.now() - startedAt > 270000) {
                stoppedReason = 'time_limit_safety';
                break;
            }
            if (consecutiveErrors >= MAX_CONSECUTIVE_SCAN_ERRORS) {
                stoppedReason = 'too_many_consecutive_errors';
                break;
            }
            const username = String(acc.username || '').replace(/^@/, '');
            const scannedAt = new Date().toISOString();
            await updateRunProgress(run?.id, {
                currentAccount: {
                    username: acc.username || username,
                    startedAt: scannedAt,
                    position: results.checked + results.errors + results.skipped + 1,
                    total: accounts.length
                },
                scannedAccounts: results.scannedAccounts.slice(-20),
                scanDelayMs: SCAN_DELAY_MS
            });
            if (!username || !/^[A-Za-z0-9_]{1,20}$/.test(username)) {
                results.skipped++;
                results.scannedAccounts.push({
                    username: acc.username || username || '(invalide)',
                    status: 'skipped',
                    followers: null,
                    error: 'invalid_username',
                    scannedAt
                });
                await rest(`twitter_accounts?id=eq.${encodeURIComponent(acc.id)}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ last_scanned_at: scannedAt })
                });
                continue;
            }

            try {
                const [shadowData, followers] = await Promise.all([
                    fetchShadowban(username),
                    fetchFollowers(username)
                ]);
                if (!shadowData) throw new Error('shadowban_empty_response');
                const { status: newStatus, flags } = interpretShadowban(shadowData);
                const oldStatus = acc.status || 'active';
                results.checked++;
                consecutiveErrors = 0;

                if (typeof followers === 'number') {
                    const today = new Date().toISOString().slice(0, 10);
                    await rest('twitter_stats', {
                        method: 'POST',
                        body: JSON.stringify({
                            twitter_account_id: acc.id,
                            username: acc.username,
                            followers,
                            date: today,
                            organization_id: acc.organization_id
                        })
                    });
                }
                results.scannedAccounts.push({
                    username: acc.username,
                    status: newStatus,
                    previousStatus: oldStatus,
                    followers: typeof followers === 'number' ? followers : null,
                    flags,
                    changed: newStatus !== oldStatus,
                    scannedAt
                });

                const accountPatch = {
                    status: newStatus,
                    last_scanned_at: scannedAt,
                    scan_error_count: 0,
                    next_retry_at: null,
                    last_scan_error: null
                };
                const autoStockCategory = getAutoStockCategory(oldStatus, newStatus);
                const orgStockBuckets = stockVAsByOrg.get(acc.organization_id) || {};
                const stockVaId = autoStockCategory ? orgStockBuckets[autoStockCategory] : null;
                const currentVaId = acc.assigned_va_id || acc.va_id || null;
                const currentIsStock = currentVaId ? getStockVaIds(orgStockBuckets).has(currentVaId) : true;
                if (autoStockCategory) {
                    accountPatch.notes = mergeStockTag(acc.notes, autoStockCategory);
                }
                if (stockVaId && currentIsStock) {
                    accountPatch.va_id = stockVaId;
                    accountPatch.assigned_va_id = stockVaId;
                }
                await rest(`twitter_accounts?id=eq.${encodeURIComponent(acc.id)}`, {
                    method: 'PATCH',
                    body: JSON.stringify(accountPatch)
                });

                if (newStatus !== oldStatus) {
                    try {
                        await rest('status_changes', {
                            method: 'POST',
                            body: JSON.stringify({
                                account_id: acc.id,
                                username: acc.username,
                                old_status: oldStatus,
                                new_status: newStatus,
                                flags
                            })
                        });
                    } catch {}
                    try {
                        await sendTelegramMessage(buildStatusAlert({ username: acc.username, oldStatus, newStatus, flags }));
                    } catch (telegramError) {
                        results.telegramError = String(telegramError?.message || telegramError);
                    }
                    results.changed++;
                    results.changes.push({
                        username: acc.username,
                        from: oldStatus,
                        to: newStatus,
                        flags,
                        movedTo: autoStockCategory || null
                    });
                }
            } catch (error) {
                results.errors++;
                consecutiveErrors++;
                results.scannedAccounts.push({
                    username: acc.username || username,
                    status: 'error',
                    followers: null,
                    error: String(error?.message || error).slice(0, 160),
                    scannedAt
                });
                const nextErrorCount = Number(acc.scan_error_count || 0) + 1;
                await rest(`twitter_accounts?id=eq.${encodeURIComponent(acc.id)}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        scan_error_count: nextErrorCount,
                        next_retry_at: getNextRetryAt(nextErrorCount),
                        last_scan_error: String(error?.message || error).slice(0, 240)
                    })
                }).catch(() => {});
            }
            await sleep(SCAN_DELAY_MS);
        }

        await finishScanRun(run?.id, {
            status: stoppedReason ? 'partial' : 'completed',
            checked: results.checked,
            changed: results.changed,
            errors: results.errors,
            skipped: results.skipped,
            details: {
                durationMs: Date.now() - startedAt,
                changes: results.changes.slice(0, 50),
                scannedAccounts: results.scannedAccounts.slice(-50),
                stoppedReason,
                scanDelayMs: SCAN_DELAY_MS,
                maxConsecutiveErrors: MAX_CONSECUTIVE_SCAN_ERRORS
            }
        });
        res.status(200).json({
            ok: true,
            runId: run?.id || null,
            durationMs: Date.now() - startedAt,
            batchLimit: scanLimit,
            scanDelayMs: SCAN_DELAY_MS,
            stoppedReason,
            ...results
        });
    } catch (err) {
        await finishScanRun(run?.id, {
            status: 'failed',
            checked: results.checked,
            changed: results.changed,
            errors: results.errors + 1,
            skipped: results.skipped,
            details: { error: String(err?.message || err), durationMs: Date.now() - startedAt }
        });
        res.status(500).json({ error: String(err?.message || err), ...results });
    }
}
