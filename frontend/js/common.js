/* ============================================================
   common.js — Shared helpers used on every authenticated page
   ============================================================ */

/* ── Toast notifications ─────────────── */
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: '<svg viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px;flex-shrink:0"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>',
        error:   '<svg viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px;flex-shrink:0"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
        info:    '<svg viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px;flex-shrink:0"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>',
        warning: '<svg viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px;flex-shrink:0"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type] || ''} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 350);
    }, duration);
}

/* ── Button loading state ─────────────── */
function setLoading(btn, loading) {
    const text    = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');
    if (loading) {
        btn.disabled = true;
        text?.classList.add('hidden');
        spinner?.classList.remove('hidden');
    } else {
        btn.disabled = false;
        text?.classList.remove('hidden');
        spinner?.classList.add('hidden');
    }
}

/* ── Date formatting ─────────────────── */
function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}
function formatDateTime(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

/* ── Nav mobile helpers ──────────────── */
function openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('open');
}
function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
}

/* ── Password visibility toggle ───────── */
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<svg class="eye-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/></svg>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<svg class="eye-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>';
    }
}

/* ── Logout ──────────────────────────── */
async function handleLogout() {
    try {
        await AuthAPI.logout();  // clears localStorage token + cookie
    } catch (_) {
        clearToken(); // ensure token cleared even if network fails
    }
    window.location.href = 'index.html';
}

/* ── Auth guard + sidebar population ─── */
let _currentUser = null;

async function initPage({ adminOnly = false } = {}) {
    try {
        const { user } = await AuthAPI.me();
        _currentUser = user;

        populateSidebar(user);
        applyRoleVisibility(user.role);

        if (adminOnly && user.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return null;
        }

        return user;
    } catch (err) {
        // Not authenticated → back to login
        window.location.href = 'index.html';
        return null;
    } finally {
        attachCommonListeners();
    }
}

function attachCommonListeners() {
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    
    // Sidebar
    document.getElementById('mobile-menu-btn')?.addEventListener('click', openSidebar);
    document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
    
    // Any password toggles (if they have data-toggle-for attribute)
    document.querySelectorAll('[data-toggle-password]').forEach(btn => {
        const inputId = btn.getAttribute('data-toggle-password');
        btn.addEventListener('click', () => togglePassword(inputId, btn));
    });
}

function populateSidebar(user) {
    const nameEl   = document.getElementById('sidebar-name');
    const roleEl   = document.getElementById('sidebar-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    const badgeEl  = document.getElementById('header-role-badge');

    if (nameEl)   nameEl.textContent   = user.name || user.email;
    if (roleEl)   roleEl.textContent   = user.role === 'admin' ? 'System Administrator' : 'Workspace Member';
    if (avatarEl) avatarEl.textContent = (user.name || user.email || '?')[0].toUpperCase();

    if (badgeEl) {
        badgeEl.textContent = user.role;
        badgeEl.className = `badge-role badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`;
    }
}

function applyRoleVisibility(role) {
    const isAdmin = role === 'admin';
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? 'flex' : 'none';
        // If it's a link in sidebar, we might want it to stay block/flex
    });
}

function getCurrentUser() { return _currentUser; }
