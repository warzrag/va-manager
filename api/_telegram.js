function cleanEnv(value) {
    return String(value || '').replace(/^\uFEFF/, '').trim().replace(/^["']|["']$/g, '');
}

const TELEGRAM_BOT_TOKEN = cleanEnv(process.env.TELEGRAM_BOT_TOKEN);
const TELEGRAM_CHAT_ID = cleanEnv(process.env.TELEGRAM_CHAT_ID);
const TELEGRAM_DISABLED = true;

export function hasTelegramConfig() {
    return !TELEGRAM_DISABLED && Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function formatStatus(status) {
    const labels = {
        active: 'Actif',
        shadowban: 'Shadowban',
        banned: 'Banni'
    };
    return labels[status] || status || 'Inconnu';
}

export async function sendTelegramMessage(text) {
    if (TELEGRAM_DISABLED) {
        return { skipped: true, reason: 'telegram_disabled' };
    }

    if (!hasTelegramConfig()) {
        return { skipped: true, reason: 'telegram_not_configured' };
    }

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.description || `telegram_http_${response.status}`);
    }
    return payload;
}
