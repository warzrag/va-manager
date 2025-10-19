// ============================================================================
// ULTRA MODERN ACCOUNT STATUS MANAGEMENT SYSTEM
// Système de gestion de statut ultra moderne et professionnel
// ============================================================================

let currentEditAccount = null;

// Initialiser le système
document.addEventListener('DOMContentLoaded', function() {
    injectStatusModal();
    injectModernStyles();
    console.log('✨ Ultra Modern Account Status System loaded');
});

// Injecter les styles ultra modernes
function injectModernStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(100px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideOutRight {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(100px); }
        }

        @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }

        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }

        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
            50% { box-shadow: 0 0 20px 5px rgba(59, 130, 246, 0.2); }
        }

        /* Tooltip moderne */
        .status-tooltip {
            position: absolute;
            background: rgba(15, 23, 42, 0.98);
            backdrop-filter: blur(20px);
            color: white;
            padding: 0.875rem 1.125rem;
            border-radius: 12px;
            font-size: 0.8125rem;
            z-index: 10002;
            pointer-events: none;
            opacity: 0;
            transform: translateY(-5px);
            transition: opacity 0.2s ease, transform 0.2s ease;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4),
                        0 0 0 1px rgba(255, 255, 255, 0.1);
            max-width: 300px;
            line-height: 1.5;
        }

        .status-tooltip::before {
            content: '';
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 12px;
            height: 12px;
            background: rgba(15, 23, 42, 0.98);
            border-radius: 2px;
            transform: translateX(-50%) rotate(45deg);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-tooltip.show {
            opacity: 1;
            transform: translateY(0);
        }

        .status-tooltip-label {
            font-weight: 600;
            margin-bottom: 0.375rem;
            color: #3b82f6;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .status-tooltip-notes {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.8125rem;
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-tooltip-date {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.75rem;
            margin-top: 0.375rem;
        }
    `;
    document.head.appendChild(style);
}

// Injecter le modal ultra moderne
function injectStatusModal() {
    const modalHTML = `
        <div id="status-modal" class="status-modal">
            <div class="status-modal-content" style="animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="status-modal-header">
                    <div>
                        <h3 class="status-modal-title" style="display: flex; align-items: center; gap: 0.625rem;">
                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                                        border-radius: 10px; display: flex; align-items: center; justify-content: center;
                                        box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                                <i class="fas fa-chart-line" style="color: white; font-size: 1.125rem;"></i>
                            </div>
                            <div>
                                <div style="font-size: 1.375rem; font-weight: 700; letter-spacing: -0.02em;">Gérer le statut</div>
                                <div style="font-size: 0.8125rem; color: #6b7280; font-weight: 500; margin-top: 0.125rem;">
                                    Modifier l'état et les notes du compte
                                </div>
                            </div>
                        </h3>
                    </div>
                    <button class="status-modal-close" onclick="closeStatusModal()"
                            style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
                                   background: rgba(239, 68, 68, 0.1); border-radius: 8px; transition: all 0.2s;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div id="status-account-info" style="margin: 1.75rem 0; padding: 1.25rem;
                                                      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.08) 100%);
                                                      border-radius: 14px;
                                                      border: 1.5px solid rgba(59, 130, 246, 0.2);
                                                      position: relative;
                                                      overflow: hidden;">
                    <div style="position: absolute; top: -50%; right: -10%; width: 150px; height: 150px;
                                background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
                                border-radius: 50%;"></div>
                    <div style="position: relative; z-index: 1;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                            <div id="status-account-icon" style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                                                                border-radius: 12px; display: flex; align-items: center; justify-content: center;
                                                                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);"></div>
                            <div style="flex: 1;">
                                <div id="status-account-name" style="font-weight: 700; font-size: 1.125rem; margin-bottom: 0.125rem; letter-spacing: -0.01em;"></div>
                                <div id="status-account-type" style="font-size: 0.875rem; color: #6b7280; font-weight: 500;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="status-form-group">
                    <label class="status-form-label" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <i class="fas fa-traffic-light" style="color: #3b82f6;"></i>
                        <span>Statut du compte</span>
                    </label>
                    <select id="status-select" class="status-select" style="font-weight: 600;">
                        <option value="active">🟢 Actif — Compte en fonctionnement normal</option>
                        <option value="banned">🔴 Banni — Compte banni définitivement</option>
                        <option value="suspended">🟠 Suspendu — Compte temporairement suspendu</option>
                        <option value="warning">⚠️ Attention — Shadowban ou compte sous surveillance</option>
                        <option value="paused">⏸️ En pause — Compte mis en pause volontairement</option>
                    </select>
                </div>

                <div class="status-form-group">
                    <label class="status-form-label" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <i class="fas fa-file-alt" style="color: #3b82f6;"></i>
                        <span>Notes & observations</span>
                        <span style="color: #9ca3af; font-size: 0.75rem; font-weight: 400; margin-left: auto;">(optionnel)</span>
                    </label>
                    <textarea id="status-notes" class="status-textarea"
                              placeholder="Ex: Compte banni le 18/10 pour spam. En attente de réactivation. Contact support effectué."
                              style="font-size: 0.9375rem; line-height: 1.6;"></textarea>
                </div>

                <div class="status-modal-actions" style="margin-top: 2rem;">
                    <button class="status-btn status-btn-cancel" onclick="closeStatusModal()">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                    <button class="status-btn status-btn-save" onclick="saveAccountStatus()"
                            style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                                   box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
                                   position: relative;
                                   overflow: hidden;">
                        <span style="position: relative; z-index: 1;">
                            <i class="fas fa-check"></i> Enregistrer les modifications
                        </span>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('status-modal').addEventListener('click', function(e) {
        if (e.target.id === 'status-modal') {
            closeStatusModal();
        }
    });
}

// Ouvrir le modal
window.openStatusModal = function(accountId, accountType, username) {
    currentEditAccount = { id: accountId, type: accountType, username: username };

    const iconHTML = accountType === 'instagram'
        ? '<i class="fab fa-instagram" style="color: white; font-size: 1.5rem;"></i>'
        : '<i class="fab fa-twitter" style="color: white; font-size: 1.5rem;"></i>';

    document.getElementById('status-account-icon').innerHTML = iconHTML;
    document.getElementById('status-account-name').textContent = username;
    document.getElementById('status-account-type').innerHTML = `
        <i class="fab fa-${accountType === 'instagram' ? 'instagram' : 'twitter'}"></i>
        Compte ${accountType === 'instagram' ? 'Instagram' : 'Twitter'}
    `;

    loadAccountStatus(accountId, accountType);
    document.getElementById('status-modal').style.display = 'flex';
};

// Fermer le modal
window.closeStatusModal = function() {
    document.getElementById('status-modal').style.display = 'none';
    currentEditAccount = null;
};

// Charger le statut
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

        document.getElementById('status-select').value = data.status || 'active';
        document.getElementById('status-notes').value = data.notes || '';

    } catch (error) {
        console.error('Error loading account status:', error);
    }
}

// Sauvegarder le statut
window.saveAccountStatus = async function() {
    if (!currentEditAccount) return;

    const status = document.getElementById('status-select').value;
    const notes = document.getElementById('status-notes').value.trim();
    const saveBtn = document.querySelector('.status-btn-save');

    // Animation du bouton
    saveBtn.style.transform = 'scale(0.95)';
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

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
            saveBtn.innerHTML = '<i class="fas fa-times"></i> Erreur';
            setTimeout(() => {
                saveBtn.innerHTML = '<i class="fas fa-check"></i> Enregistrer les modifications';
                saveBtn.style.transform = 'scale(1)';
            }, 2000);
            return;
        }

        console.log(`✅ Status updated for ${currentEditAccount.username}`);

        // Sauvegarder les infos avant de fermer le modal
        const accountInfo = {
            id: currentEditAccount.id,
            type: currentEditAccount.type,
            username: currentEditAccount.username
        };

        // Animation de succès
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Enregistré!';
        saveBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

        setTimeout(() => {
            closeStatusModal();
            showSuccessNotification('Statut mis à jour avec succès!');

            // Mettre à jour le badge instantanément sans recharger
            updateBadgeInDOM(accountInfo.id, accountInfo.type, accountInfo.username, status, notes);
        }, 800);

    } catch (error) {
        console.error('Error saving status:', error);
        saveBtn.innerHTML = '<i class="fas fa-times"></i> Erreur';
        setTimeout(() => {
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Enregistrer les modifications';
            saveBtn.style.transform = 'scale(1)';
        }, 2000);
    }
};

// Mettre à jour le badge dans le DOM sans recharger
function updateBadgeInDOM(accountId, accountType, username, newStatus, newNotes) {
    console.log('🔄 Mise à jour du badge:', { accountId, accountType, username, newStatus });

    // Trouver tous les badges pour ce compte
    const badges = document.querySelectorAll(`.status-badge-modern[data-account-id="${accountId}"][data-account-type="${accountType}"]`);

    console.log('   Badges trouvés:', badges.length);

    badges.forEach(badge => {
        // Mettre à jour les data attributes
        badge.dataset.status = newStatus;
        badge.dataset.notes = newNotes || '';

        // Obtenir le nouveau style
        const newBadge = getStatusBadge(newStatus);

        // Mettre à jour le style
        badge.style.background = newBadge.gradient;
        badge.style.color = newBadge.color;
        badge.style.boxShadow = `0 3px 12px ${newBadge.shadow}, 0 1px 3px rgba(0, 0, 0, 0.2)`;

        // Mettre à jour le contenu (emoji + texte)
        badge.innerHTML = `
            <span style="font-size: 1rem;">${newBadge.emoji}</span>
            <span style="letter-spacing: 0.02em;">${newBadge.text}</span>
        `;

        // Animation de mise à jour
        badge.style.transform = 'scale(1.1)';
        setTimeout(() => {
            badge.style.transform = 'scale(1)';
        }, 200);
    });

    console.log(`✅ Badge mis à jour dans le DOM pour ${username}`);
}

// Notification moderne
function showSuccessNotification(message) {
    const existingNotif = document.getElementById('status-success-notification');
    if (existingNotif) existingNotif.remove();

    const notif = document.createElement('div');
    notif.id = 'status-success-notification';
    notif.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1.125rem 1.5rem;
        border-radius: 14px;
        box-shadow: 0 10px 40px rgba(16, 185, 129, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.1);
        z-index: 10001;
        font-weight: 600;
        font-size: 0.9375rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                   slideOutRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) 2.7s;
        backdrop-filter: blur(10px);
    `;
    notif.innerHTML = `
        <div style="width: 32px; height: 32px; background: rgba(255, 255, 255, 0.2);
                    border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-check" style="font-size: 1rem;"></i>
        </div>
        <span>${message}</span>
    `;

    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// Obtenir le badge de statut moderne - VERSION VISIBLE
window.getStatusBadge = function(status) {
    const statusMap = {
        active: {
            emoji: '🟢',
            text: 'Actif',
            class: 'status-active',
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: '#059669',
            color: '#ffffff',
            shadow: 'rgba(16, 185, 129, 0.5)'
        },
        banned: {
            emoji: '🔴',
            text: 'Banni',
            class: 'status-banned',
            gradient: 'linear-gradient(135deg, #ff0844 0%, #f7022a 100%)',
            border: '#f7022a',
            color: '#ffffff',
            shadow: 'rgba(255, 8, 68, 0.6)'
        },
        suspended: {
            emoji: '🟠',
            text: 'Suspendu',
            class: 'status-suspended',
            gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            border: '#ea580c',
            color: '#ffffff',
            shadow: 'rgba(249, 115, 22, 0.5)'
        },
        warning: {
            emoji: '⚠️',
            text: 'Attention',
            class: 'status-warning',
            gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            border: '#ca8a04',
            color: '#ffffff',
            shadow: 'rgba(234, 179, 8, 0.5)'
        },
        paused: {
            emoji: '⏸️',
            text: 'En pause',
            class: 'status-paused',
            gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
            border: '#4b5563',
            color: '#ffffff',
            shadow: 'rgba(107, 114, 128, 0.5)'
        }
    };

    return statusMap[status] || statusMap.active;
};

// Générer le HTML moderne du badge
window.generateStatusBadgeHTML = function(accountId, accountType, username, status, notes) {
    status = status || 'active';
    const badge = getStatusBadge(status);

    return `
        <span class="status-badge-modern"
              data-account-id="${accountId}"
              data-account-type="${accountType}"
              data-status="${status}"
              data-notes="${notes || ''}"
              onmouseenter="showStatusTooltip(this)"
              onmouseleave="hideStatusTooltip()"
              style="display: inline-flex;
                     align-items: center;
                     gap: 0.25rem;
                     padding: 0.25rem 0.5rem;
                     background: ${badge.gradient};
                     border: none;
                     border-radius: 6px;
                     font-size: 0.7rem;
                     font-weight: 700;
                     color: ${badge.color};
                     margin-left: 0.25rem;
                     cursor: help;
                     transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                     box-shadow: 0 2px 8px ${badge.shadow}, 0 1px 2px rgba(0, 0, 0, 0.2);
                     text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                     vertical-align: middle;"
              onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 16px ${badge.shadow}, 0 2px 4px rgba(0, 0, 0, 0.3)'"
              onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px ${badge.shadow}, 0 1px 2px rgba(0, 0, 0, 0.2)'">
            <span style="font-size: 0.75rem;">${badge.emoji}</span>
            <span style="letter-spacing: 0.01em;">${badge.text}</span>
        </span>
        <button class="status-edit-btn-modern"
                onclick="event.preventDefault(); event.stopPropagation(); openStatusModal('${accountId}', '${accountType}', '${username}')"
                style="display: inline-flex;
                       align-items: center;
                       justify-content: center;
                       background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                       border: none;
                       border-radius: 6px;
                       padding: 0.25rem 0.5rem;
                       cursor: pointer;
                       font-size: 0.7rem;
                       color: #ffffff;
                       margin-left: 0.25rem;
                       transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                       font-weight: 600;
                       box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2);
                       text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                       vertical-align: middle;
                       pointer-events: auto;
                       z-index: 10;"
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 16px rgba(59, 130, 246, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(59, 130, 246, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2)'"
                title="Modifier le statut">
            <i class="fas fa-edit"></i>
        </button>
    `;
};

// Tooltip moderne avec preview
let tooltipElement = null;

window.showStatusTooltip = function(element) {
    const status = element.dataset.status;
    const notes = element.dataset.notes;
    const badge = getStatusBadge(status);

    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'status-tooltip';
        document.body.appendChild(tooltipElement);
    }

    let content = `<div class="status-tooltip-label">Statut: ${badge.emoji} ${badge.text}</div>`;

    if (notes) {
        content += `<div class="status-tooltip-notes">${notes.substring(0, 150)}${notes.length > 150 ? '...' : ''}</div>`;
    } else {
        content += `<div style="color: rgba(255, 255, 255, 0.5); font-size: 0.8125rem; font-style: italic;">Aucune note</div>`;
    }

    tooltipElement.innerHTML = content;

    const rect = element.getBoundingClientRect();
    tooltipElement.style.left = rect.left + rect.width / 2 + 'px';
    tooltipElement.style.top = rect.top - 10 + 'px';
    tooltipElement.style.transform = 'translate(-50%, -100%)';

    setTimeout(() => tooltipElement.classList.add('show'), 10);
};

window.hideStatusTooltip = function() {
    if (tooltipElement) {
        tooltipElement.classList.remove('show');
    }
};

console.log('✨ Ultra Modern Account Status System ready');
