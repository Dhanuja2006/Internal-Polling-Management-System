/* ============================================================
   admin-users.js — Manage Users (Admin only)
   ============================================================ */

let _users       = [];
let _admins      = [];
let _activeTab   = 'users';
let _deleteUserId = null;

/* ── Init ──────────────────────────── */
(async () => {
    const user = await initPage({ adminOnly: true });
    if (!user) return;
    
    // Static Listeners
    document.getElementById('user-search')?.addEventListener('input', filterUsers);
    document.getElementById('btn-open-create-user')?.addEventListener('click', openCreateUserModal);
    document.getElementById('btn-submit-create-user')?.addEventListener('click', createUser);
    document.getElementById('btn-confirm-delete-user')?.addEventListener('click', confirmDeleteUser);

    document.querySelectorAll('.btn-close-create-user').forEach(b => b.addEventListener('click', closeCreateUserModal));
    document.querySelectorAll('.btn-close-delete-user').forEach(b => b.addEventListener('click', closeDeleteUserModal));

    // Tabs Delegation
    document.querySelector('.admin-tabs')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('admin-tab')) {
            showUserTab(e.target.dataset.tab);
        }
    });

    // Table Delegation (Delete, Role Change)
    document.getElementById('users-tbody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.classList.contains('btn-delete-user')) {
            openDeleteUserModal(btn.dataset.user_id, btn.dataset.name);
        }
    });

    document.getElementById('users-tbody')?.addEventListener('change', (e) => {
        if (e.target.classList.contains('role-select')) {
            const userId = e.target.closest('tr').id.replace('user-row-', '');
            changeRole(userId, e.target.value);
        }
    });

    loadAllUsers();
})();

async function loadAllUsers() {
    try {
        const [usersRes, adminsRes] = await Promise.all([
            AuthAPI.getAllUsers(),
            AuthAPI.getAllAdmins()
        ]);
        _users  = usersRes.users  || [];
        _admins = adminsRes.admins || [];

        renderTable(_activeTab === 'users' ? _users : _admins);
    } catch (err) {
        showToast('Failed to load users. ' + err.message, 'error');
    }
}

/* ── Tab switching ──────────────── */
function showUserTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.getElementById('user-table-title').textContent =
        tab === 'users' ? 'All Users' : 'All Admins';
    document.getElementById('user-search').value = '';
    renderTable(tab === 'users' ? _users : _admins);
}

/* ── Render table ─────────────────── */
function renderTable(list) {
    const tbody = document.getElementById('users-tbody');
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-loading">No ${_activeTab} found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(u => `
        <tr id="user-row-${u._id}">
            <td style="font-weight:600;color:var(--clr-text)">${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${escapeHtml(u.phone || '–')}</td>
            <td>
                <select class="role-select">
                    <option value="user"  ${u.role === 'user'  ? 'selected' : ''}>User</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </td>
            <td>
                <span class="badge ${u.isrRoleAccepted ? 'badge-active' : 'badge-inactive'}">
                    ${u.isrRoleAccepted ? 'Accepted' : 'Pending'}
                </span>
            </td>
            <td class="actions-col">
                <div class="table-actions">
                    <button class="action-btn danger btn-delete-user" data-user_id="${u._id}" data-name="${escapeHtml(u.name)}">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

/* ── Search ─────────────────────── */
function filterUsers() {
    const q = document.getElementById('user-search').value.toLowerCase();
    const source = _activeTab === 'users' ? _users : _admins;
    const filtered = source.filter(u =>
        u.name.toLowerCase().includes(q)  ||
        u.email.toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
    );
    renderTable(filtered);
}

/* ── Change Role ─────────────────── */
async function changeRole(userId, newRole) {
    try {
        await AuthAPI.updateRole(userId, newRole);
        showToast(`Role updated to ${newRole}.`, 'success');
        loadAllUsers();
    } catch (err) {
        showToast(err.message, 'error');
        loadAllUsers(); // Reset the select to previous value
    }
}

/* ── Create User Modal ──────────── */
function openCreateUserModal() {
    document.getElementById('cu-name').value  = '';
    document.getElementById('cu-email').value = '';
    document.getElementById('cu-phone').value = '';
    document.getElementById('cu-role').value  = 'user';
    document.getElementById('create-user-error').classList.add('hidden');
    document.getElementById('create-user-success').classList.add('hidden');
    document.getElementById('create-user-modal-overlay').classList.remove('hidden');
}

function closeCreateUserModal() {
    document.getElementById('create-user-modal-overlay').classList.add('hidden');
}

async function createUser() {
    const btn     = document.getElementById('btn-submit-create-user');
    const errEl   = document.getElementById('create-user-error');
    const succEl  = document.getElementById('create-user-success');
    const name    = document.getElementById('cu-name').value.trim();
    const email   = document.getElementById('cu-email').value.trim();
    const phone   = document.getElementById('cu-phone').value.trim();
    const role    = document.getElementById('cu-role').value;

    errEl.classList.add('hidden');
    succEl.classList.add('hidden');

    if (!name || !email) {
        errEl.textContent = 'Name and email are required.';
        errEl.classList.remove('hidden');
        return;
    }

    setLoading(btn, true);
    try {
        await AdminAPI.createUser({ name, email, phone, role });
        succEl.textContent = `Invitation sent to ${email}!`;
        succEl.classList.remove('hidden');
        setLoading(btn, false);
        loadAllUsers();
        setTimeout(closeCreateUserModal, 2000);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
        setLoading(btn, false);
    }
}

/* ── Delete User ─────────────────── */
function openDeleteUserModal(userId, name) {
    _deleteUserId = userId;
    document.getElementById('delete-user-name').textContent = name;
    document.getElementById('delete-user-modal-overlay').classList.remove('hidden');
}

function closeDeleteUserModal() {
    document.getElementById('delete-user-modal-overlay').classList.add('hidden');
    _deleteUserId = null;
}

async function confirmDeleteUser() {
    if (!_deleteUserId) return;
    const btn = document.getElementById('btn-confirm-delete-user');
    btn.disabled = true;
    try {
        await AuthAPI.deleteUser(_deleteUserId);
        closeDeleteUserModal();
        showToast('User deleted.', 'success');
        loadAllUsers();
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
    }
}

// Overlay click closes modals
document.getElementById('create-user-modal-overlay')?.addEventListener('click', function(e) { if (e.target === this) closeCreateUserModal(); });
document.getElementById('delete-user-modal-overlay')?.addEventListener('click', function(e) { if (e.target === this) closeDeleteUserModal(); });

function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
