/* ============================================================
   organizations.js — Organization management logic
   ============================================================ */

(async () => {
    const user = await initPage();
    if (!user) return;

    // Only admins can create organizations
    if (user.role !== 'admin') {
        const createBtn = document.getElementById('btn-open-create');
        if (createBtn) createBtn.style.display = 'none';
    }
    
    // Attach Listeners
    document.getElementById('btn-open-create')?.addEventListener('click', openCreateModal);
    document.getElementById('btn-open-join')?.addEventListener('click', openJoinModal);
    document.querySelectorAll('.modal-cancel').forEach(btn => btn.addEventListener('click', closeModals));
    document.getElementById('create-org-submit')?.addEventListener('click', handleCreateOrg);
    document.getElementById('join-org-submit')?.addEventListener('click', handleJoinOrg);
    
    // Event delegation for dynamically created org cards
    document.getElementById('org-grid')?.addEventListener('click', (e) => {
        const target = e.target;
        const orgId = target.getAttribute('data-org-id');
        const code = target.getAttribute('data-code');
        
        if (target.classList.contains('btn-copy')) {
            copyToClipboard(code);
        } else if (target.classList.contains('btn-members')) {
            viewMembers(orgId);
        } else if (target.classList.contains('btn-leave')) {
            handleLeave(orgId);
        }
    });

    loadOrganizations();

    // Check for inviteCode in URL
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('inviteCode');
    if (inviteCode) {
        if (confirm(`Do you want to join organization with code ${inviteCode}?`)) {
            try {
                await OrgAPI.join(inviteCode);
                showToast('Joined organization successfully!', 'success');
                loadOrganizations();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    }
})();

async function loadOrganizations() {
    const grid = document.getElementById('org-grid');
    try {
        const res = await OrgAPI.getMyOrgs();
        renderOrganizations(res.organizations || []);
    } catch (err) {
        showToast('Failed to load organizations. ' + err.message, 'error');
        grid.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    }
}

function renderOrganizations(orgs) {
    const grid = document.getElementById('org-grid');
    if (!orgs.length) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <h3>No organizations found</h3>
                <p>You haven't joined or created any organizations yet. Use the buttons above to get started.</p>
            </div>`;
        return;
    }

    grid.innerHTML = orgs.map(org => `
        <div class="org-card">
            <h3 class="org-name">${escapeHtml(org.name)}</h3>
            ${org.description ? `<p class="org-desc">${escapeHtml(org.description)}</p>` : ''}
            
            <div class="org-meta">
                <span class="org-role-badge role-${org.role}">${org.role}</span>
                <span style="font-size:0.8rem;color:var(--clr-text-3)">Since ${formatDate(org.createdAt)}</span>
            </div>

            ${org.role === 'admin' ? `
                <div class="invite-code-box">
                    <span>Code: <strong>${org.inviteCode}</strong></span>
                    <button class="btn btn-sm btn-copy" data-code="${org.inviteCode}" style="padding:4px 8px">Copy</button>
                </div>
            ` : ''}

            <div style="margin-top:20px; display:flex; gap:8px">
                <button class="btn btn-secondary btn-sm btn-members" data-org-id="${org._id}">Members</button>
                ${org.role !== 'admin' ? `<button class="btn btn-danger btn-sm btn-leave" data-org-id="${org._id}">Leave</button>` : ''}
            </div>
        </div>
    `).join('');
}

/* ── Actions ───────────────────── */

function openCreateModal() {
    document.getElementById('create-org-modal').classList.remove('hidden');
}

function openJoinModal() {
    document.getElementById('join-org-modal').classList.remove('hidden');
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

async function handleCreateOrg() {
    const name = document.getElementById('new-org-name').value.trim();
    const description = document.getElementById('new-org-desc').value.trim();

    if (!name) {
        showToast('Organization name is required', 'warning');
        return;
    }

    const btn = document.getElementById('create-org-submit');
    setLoading(btn, true);

    try {
        await OrgAPI.create({ name, description });
        showToast('Organization created!', 'success');
        closeModals();
        loadOrganizations();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(btn, false);
    }
}

async function handleJoinOrg() {
    const code = document.getElementById('join-invite-code').value.trim().toUpperCase();

    if (!code) {
        showToast('Invite code is required', 'warning');
        return;
    }

    const btn = document.getElementById('join-org-submit');
    setLoading(btn, true);

    try {
        await OrgAPI.join(code);
        showToast('Welcome to the organization!', 'success');
        closeModals();
        loadOrganizations();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(btn, false);
    }
}

async function handleLeave(orgId) {
    if (!confirm('Are you sure you want to leave this organization?')) return;

    try {
        await OrgAPI.leave(orgId);
        showToast('Left organization successfully', 'success');
        loadOrganizations();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Invite code copied to clipboard', 'info');
}

async function viewMembers(orgId) {
    // For now, just show a toast or a simple alert. 
    // In a real app, we'd open a modal with the member list.
    try {
        const res = await OrgAPI.getMembers(orgId);
        const names = res.members.map(m => m.userId.name).join(', ');
        alert(`Members: ${names}`);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
