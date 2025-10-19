// ============================================================================
// ACCOUNT STATUS MANAGEMENT SYSTEM
// Système de gestion de statut pour les comptes Instagram et Twitter
// ============================================================================

// Variables globales pour le système de statut
let currentEditAccount = null;

// Initialiser le système de statut au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter le modal HTML au body
    injectStatusModal();
    console.log('✅ Account Status System loaded');
});

// Injecter le modal dans le DOM
function injectStatusModal() {
    const modalHTML = `
        <div id="status-modal" class="status-modal">
            <div class="status-modal-content">
                <div class="status-modal-header">
                    <h3 class="status-modal-title">
                        <i class="fas fa-info-circle" style="margin-right: 0.5rem; color: #3b82f6;"></i>
                        Gérer le statut du compte
                    </h3>
                    <button class="status-modal-close" onclick="closeStatusModal()">×</button>
                </div>

                <div id="status-account-info" style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.05); border-radius: 10px; border: 1px solid rgba(59, 130, 246, 0.2);">
                    <div style="font-weight: 600; margin-bottom: 0.25rem;" id="status-account-name"></div>
                    <div style="font-size: 0.875rem; color: #6b7280;" id="status-account-type"></div>
                </div>

                <div class="status-form-group">
                    <label class="status-form-label">
                        <i class="fas fa-check-circle" style="margin-right: 0.375rem;"></i>
                        Statut du compte
                    </label>
                    <select id="status-select" class="status-select">
                        <option value="active">🟢 Actif - Compte en fonctionnement normal</option>
                        <option value="banned">🔴 Banni - Compte banni définitivement</option>
                        <option value="suspended">🟠 Suspendu - Compte temporairement suspendu</option>
                        <option value="warning">⚠️ Attention - Compte sous surveillance/shadowban</option>
                        <option value="paused">⏸️ En pause - Compte mis en pause volontairement</option>
                    </select>
                </div>

                <div class="status-form-group">
                    <label class="status-form-label">
                        <i class="fas fa-sticky-note" style="margin-right: 0.375rem;"></i>
                        Notes (optionnel)
                    </label>
                    <textarea id="status-notes" class="status-textarea" placeholder="Ex: Banni le 18/10 pour spam, en attente de réactivation..."></textarea>
                </div>

                <div class="status-modal-actions">
                    <button class="status-btn status-btn-cancel" onclick="closeStatusModal()">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                    <button class="status-btn status-btn-save" onclick="saveAccountStatus()">
                        <i class="fas fa-save"></i> Enregistrer
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Fermer le modal en cliquant sur le fond
    document.getElementById('status-modal').addEventListener('click', function(e) {
        if (e.target.id === 'status-modal') {
            closeStatusModal();
        }
    });
}

// Ouvrir le modal pour éditer le statut d'un compte
window.openStatusModal = function(accountId, accountType, username) {
    currentEditAccount = { id: accountId, type: accountType, username: username };

    // Mettre à jour les infos du compte dans le modal
    document.getElementById('status-account-name').textContent = username;
    document.getElementById('status-account-type').innerHTML = `
        <i class="fab fa-${accountType === 'instagram' ? 'instagram' : 'twitter'}"></i>
        ${accountType === 'instagram' ? 'Instagram' : 'Twitter'}
    `;

    // Charger les données actuelles du compte depuis Supabase
    loadAccountStatus(accountId, accountType);

    // Afficher le modal
    document.getElementById('status-modal').style.display = 'flex';
};

// Fermer le modal
window.closeStatusModal = function() {
    document.getElementById('status-modal').style.display = 'none';
    currentEditAccount = null;
};

// Charger le statut actuel du compte
async function loadAccountStatus(accountId, accountType) {
    try {
        const tableName = accountType === 'instagram' ? 'instagram_accounts' : 'twitter_accounts';

        const { data, error } = await supabase
            .from(tableName)
            .select('status, notes')
            .eq('id', accountId)
            .single();

        if (error) {
            console.error('Error loading account status:', error);
            return;
        }

        // Remplir le formulaire
        document.getElementById('status-select').value = data.status || 'active';
        document.getElementById('status-notes').value = data.notes || '';

    } catch (error) {
        console.error('Error loading account status:', error);
    }
}

// Sauvegarder le statut du compte
window.saveAccountStatus = async function() {
    if (!currentEditAccount) return;

    const status = document.getElementById('status-select').value;
    const notes = document.getElementById('status-notes').value.trim();

    try {
        const tableName = currentEditAccount.type === 'instagram' ? 'instagram_accounts' : 'twitter_accounts';

        const { error } = await supabase
            .from(tableName)
            .update({
                status: status,
                notes: notes || null,
                last_status_update: new Date().toISOString()
            })
            .eq('id', currentEditAccount.id);

        if (error) {
            console.error('Error saving status:', error);
            alert('Erreur lors de la sauvegarde du statut');
            return;
        }

        console.log(`✅ Status updated for ${currentEditAccount.username}`);

        // Fermer le modal
        closeStatusModal();

        // Recharger les données pour rafraîchir l'affichage
        await loadAllData();
        updateDisplay();

        // Message de succès
        showSuccessMessage('Statut mis à jour avec succès!');

    } catch (error) {
        console.error('Error saving status:', error);
        alert('Erreur lors de la sauvegarde');
    }
};

// Afficher un message de succès temporaire
function showSuccessMessage(message) {
    const existingMsg = document.getElementById('status-success-message');
    if (existingMsg) existingMsg.remove();

    const messageDiv = document.createElement('div');
    messageDiv.id = 'status-success-message';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        z-index: 10001;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 2.7s;
    `;
    messageDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Ajouter les animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// Fonction helper pour obtenir l'emoji et le texte du statut
window.getStatusBadge = function(status) {
    const statusMap = {
        active: { emoji: '🟢', text: 'Actif', class: 'status-active' },
        banned: { emoji: '🔴', text: 'Banni', class: 'status-banned' },
        suspended: { emoji: '🟠', text: 'Suspendu', class: 'status-suspended' },
        warning: { emoji: '⚠️', text: 'Attention', class: 'status-warning' },
        paused: { emoji: '⏸️', text: 'En pause', class: 'status-paused' }
    };

    return statusMap[status] || statusMap.active;
};

// Fonction pour générer le HTML du badge de statut
window.generateStatusBadgeHTML = function(accountId, accountType, username, status, notes) {
    status = status || 'active';
    const badge = getStatusBadge(status);

    const notesPreview = notes ? `\nNotes: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}` : '';

    return `
        <span class="status-badge ${badge.class}" title="Statut: ${badge.text}${notesPreview}">
            ${badge.emoji} ${badge.text}
        </span>
        <button class="status-edit-btn"
                onclick="event.preventDefault(); event.stopPropagation(); openStatusModal('${accountId}', '${accountType}', '${username}')"
                title="Modifier le statut">
            <i class="fas fa-edit"></i>
        </button>
    `;
};

console.log('✅ Account Status System functions loaded');
