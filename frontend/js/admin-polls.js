/* ============================================================
   admin-polls.js — Manage Polls (Admin only)
   ============================================================ */

let _adminPolls    = [];
let _deletePollId  = null;

let _userOrganizations = [];

/* ── Init ──────────────────────────── */
(async () => {
    const user = await initPage({ adminOnly: true });
    if (!user) return;
    
    // Static Listeners
    document.getElementById('admin-poll-search')?.addEventListener('input', filterAdminPolls);
    document.getElementById('btn-open-create-poll')?.addEventListener('click', openCreatePollModal);
    document.getElementById('btn-add-option')?.addEventListener('click', addOption);
    document.getElementById('save-poll-btn')?.addEventListener('click', savePoll);
    document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDeletePoll);

    // AI Listeners
    document.getElementById('btn-ai-open')?.addEventListener('click', toggleAiContainer);
    document.getElementById('btn-ai-cancel')?.addEventListener('click', () => toggleAiContainer(false));
    document.getElementById('btn-ai-submit')?.addEventListener('click', generateWithAI);
    document.getElementById('btn-ai-dashboard-open')?.addEventListener('click', () => {
        openCreatePollModal();
        toggleAiContainer(true);
    });

    // Modal close buttons (consistent classes)
    document.querySelectorAll('.btn-close-poll').forEach(b => b.addEventListener('click', closePollModal));
    document.querySelectorAll('.btn-close-delete').forEach(b => b.addEventListener('click', closeDeleteModal));

    // Table Delegation (Edit, Toggle, Delete)
    document.getElementById('admin-polls-tbody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const pollId = btn.getAttribute('data-poll-id');
        const title = btn.getAttribute('data-title');
        
        if (btn.classList.contains('btn-edit')) openEditPollModal(pollId);
        else if (btn.classList.contains('btn-toggle')) togglePoll(pollId);
        else if (btn.classList.contains('btn-delete')) openDeleteModal(pollId, title);
    });

    // Options Container Delegation (Remove buttons)
    document.getElementById('options-container')?.addEventListener('click', (e) => {
        if (e.target.closest('.remove-option-btn')) {
            removeOption(e.target.closest('.remove-option-btn'));
        }
    });

    await Promise.all([
        loadAdminPolls(),
        loadOrganizations()
    ]);

    // Check for auto-open AI
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ai') === 'open') {
        openCreatePollModal();
        toggleAiContainer(true);
    }
})();

async function loadOrganizations() {
    try {
        const res = await OrgAPI.getMyOrgs();
        _userOrganizations = res.organizations || [];
        
        const select = document.getElementById('poll-org');
        if (select) {
            // Keep the "Global" option
            select.innerHTML = '<option value="global">System-wide (Public)</option>';
            _userOrganizations.forEach(org => {
                const opt = document.createElement('option');
                opt.value = org._id;
                opt.textContent = org.name;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Failed to load organizations:', err);
    }
}

async function loadAdminPolls() {
    const tbody = document.getElementById('admin-polls-tbody');
    try {
        const res   = await PollAPI.getAll();
        _adminPolls = res.polls || [];
        renderPollsTable(_adminPolls);
    } catch (err) {
        showToast('Failed to load polls. ' + err.message, 'error');
        tbody.innerHTML = `<tr><td colspan="6" class="table-loading">Error: ${err.message}</td></tr>`;
    }
}

function renderPollsTable(polls) {
    const tbody = document.getElementById('admin-polls-tbody');
    if (!polls.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-loading">No polls found.</td></tr>`;
        return;
    }

    tbody.innerHTML = polls.map(p => `
        <tr id="poll-row-${p._id}">
            <td>
                <div class="cell-poll-title">${escapeHtml(p.title)}</div>
                ${p.description ? `<div class="cell-poll-desc">${escapeHtml(p.description)}</div>` : ''}
            </td>
            <td>${p.options.length}</td>
            <td>
                <span class="badge ${p.orgId ? 'badge-org' : 'badge-global'}">
                    ${p.orgId?.name || p.orgId || 'System-wide'}
                </span>
            </td>
            <td>
                <div class="cell-creator">
                    <span class="cell-creator-name">${escapeHtml(p.createdBy?.name || '–')}</span>
                    <span class="cell-creator-email">${escapeHtml(p.createdBy?.email || '')}</span>
                </div>
            </td>
            <td>${formatDate(p.createdAt)}</td>
            <td>
                <span class="badge ${p.isActive ? 'badge-active' : 'badge-inactive'}">
                    ${p.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="actions-col">
                <div class="table-actions">
                    <button class="action-btn primary btn-edit" data-poll-id="${p._id}">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                        Edit
                    </button>
                    <button class="action-btn ${p.isActive ? 'danger' : 'success'} btn-toggle" data-poll-id="${p._id}">
                        ${p.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="action-btn danger btn-delete" data-poll-id="${p._id}" data-title="${escapeHtml(p.title)}">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

/* ── Search ─────────────────────── */
function filterAdminPolls() {
    const q = document.getElementById('admin-poll-search').value.toLowerCase();
    const filtered = _adminPolls.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
    renderPollsTable(filtered);
}

/* ── Create Poll Modal ──────────── */
function openCreatePollModal() {
    document.getElementById('poll-modal-title').textContent = 'Create Poll';
    document.getElementById('save-poll-btn').querySelector('.btn-text').textContent = 'Create Poll';
    document.getElementById('edit-poll-id').value = '';
    document.getElementById('poll-title').value = '';
    document.getElementById('poll-description').value = '';
    document.getElementById('poll-org').value = 'global';
    
    // Set default end time to 24 hours from now
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    document.getElementById('poll-end-time').value = tomorrow.toISOString().slice(0, 16);
    
    document.getElementById('poll-form-error').classList.add('hidden');

    // Reset options to 2
    const container = document.getElementById('options-container');
    container.innerHTML = `
        <div class="option-row"><input type="text" class="form-input option-input" placeholder="Option 1" /><button type="button" class="remove-option-btn hidden">✕</button></div>
        <div class="option-row"><input type="text" class="form-input option-input" placeholder="Option 2" /><button type="button" class="remove-option-btn hidden">✕</button></div>
    `;
    document.getElementById('poll-modal-overlay').classList.remove('hidden');
    toggleAiContainer(false); // Ensure AI box is closed for new/edit
}

/* ── AI Generation ──────────────── */
function toggleAiContainer(show) {
    const container = document.getElementById('ai-gen-container');
    const btnOpen = document.getElementById('btn-ai-open');
    const input = document.getElementById('ai-prompt-input');
    
    const isVisible = show !== undefined ? !show : !container.classList.contains('hidden');
    
    if (isVisible) {
        container.classList.add('hidden');
        btnOpen.classList.remove('active');
    } else {
        container.classList.remove('hidden');
        btnOpen.classList.add('active');
        input.focus();
    }
}

async function generateWithAI() {
    const prompt = document.getElementById('ai-prompt-input').value.trim();
    const btn = document.getElementById('btn-ai-submit');
    const errorEl = document.getElementById('ai-gen-error');
    
    if (!prompt) {
        errorEl.textContent = 'Please enter a prompt for the AI.';
        errorEl.classList.remove('hidden');
        return;
    }

    errorEl.classList.add('hidden');
    setLoading(btn, true);

    try {
        const res = await AI_API.generatePoll({ prompt });
        
        // Populate fields
        document.getElementById('poll-title').value = res.question || '';
        
        const container = document.getElementById('options-container');
        container.innerHTML = '';
        
        if (Array.isArray(res.options)) {
            res.options.forEach((opt, idx) => {
                const row = document.createElement('div');
                row.className = 'option-row';
                row.innerHTML = `<input type="text" class="form-input option-input" value="${escapeHtml(opt)}" placeholder="Option ${idx + 1}" /><button type="button" class="remove-option-btn">✕</button>`;
                container.appendChild(row);
            });
        }
        
        updateRemoveButtons();
        showToast('Poll content generated!', 'success');
        toggleAiContainer(false);
        btn.querySelector('.btn-text').textContent = 'Regenerate';
    } catch (err) {
        console.error('AI Gen failed:', err);
        errorEl.textContent = err.message || 'Failed to generate poll. Please try again.';
        errorEl.classList.remove('hidden');
    } finally {
        setLoading(btn, false);
    }
}

function openEditPollModal(pollId) {
    const poll = _adminPolls.find(p => p._id === pollId);
    if (!poll) return;

    document.getElementById('poll-modal-title').textContent = 'Edit Poll';
    document.getElementById('save-poll-btn').querySelector('.btn-text').textContent = 'Save Changes';
    document.getElementById('edit-poll-id').value = pollId;
    document.getElementById('poll-title').value = poll.title;
    document.getElementById('poll-description').value = poll.description || '';
    document.getElementById('poll-org').value = poll.orgId?._id || poll.orgId || 'global';
    
    if (poll.endTime) {
        const d = new Date(poll.endTime);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        document.getElementById('poll-end-time').value = d.toISOString().slice(0, 16);
    }

    document.getElementById('poll-form-error').classList.add('hidden');

    const container = document.getElementById('options-container');
    container.innerHTML = poll.options.map((opt, i) => `
        <div class="option-row">
            <input type="text" class="form-input option-input" value="${escapeHtml(opt.optionText)}" placeholder="Option ${i + 1}" />
            <button type="button" class="remove-option-btn ${poll.options.length <= 2 ? 'hidden' : ''}">✕</button>
        </div>
    `).join('');

    document.getElementById('poll-modal-overlay').classList.remove('hidden');
}

function closePollModal() {
    document.getElementById('poll-modal-overlay').classList.add('hidden');
}

function addOption() {
    const container = document.getElementById('options-container');
    const count = container.querySelectorAll('.option-row').length + 1;
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `<input type="text" class="form-input option-input" placeholder="Option ${count}" /><button type="button" class="remove-option-btn">✕</button>`;
    container.appendChild(row);
    updateRemoveButtons();
}

function removeOption(btn) {
    btn.closest('.option-row').remove();
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const rows = document.querySelectorAll('#options-container .option-row');
    rows.forEach(row => {
        const btn = row.querySelector('.remove-option-btn');
        if (btn) btn.classList.toggle('hidden', rows.length <= 2);
    });
}

async function savePoll() {
    const btn   = document.getElementById('save-poll-btn');
    const errEl = document.getElementById('poll-form-error');
    const id    = document.getElementById('edit-poll-id').value;
    const title = document.getElementById('poll-title').value.trim();
    const desc  = document.getElementById('poll-description').value.trim();
    const orgId   = document.getElementById('poll-org').value;
    const endTime = document.getElementById('poll-end-time').value;
    const optionInputs = document.querySelectorAll('#options-container .option-input');
    const options = [...optionInputs].map(i => i.value.trim()).filter(Boolean);

    errEl.classList.add('hidden');

    if (!title) { errEl.textContent = 'Poll title is required.'; errEl.classList.remove('hidden'); return; }
    if (!endTime) { errEl.textContent = 'End time is required.'; errEl.classList.remove('hidden'); return; }
    if (options.length < 2) { errEl.textContent = 'Please provide at least 2 options.'; errEl.classList.remove('hidden'); return; }

    setLoading(btn, true);
    try {
        const payload = { 
            title, 
            description: desc, 
            orgId: orgId === 'global' ? '' : orgId, 
            endTime 
        };
        
        if (id) {
            await PollAPI.update(id, payload);
        } else {
            payload.options = options;
            await PollAPI.create(payload);
        }
        closePollModal();
        showToast(id ? 'Poll updated!' : 'Poll created!', 'success');
        loadAdminPolls();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    } finally {
        setLoading(btn, false);
    }
}

/* ── Toggle Status ──────────────── */
async function togglePoll(pollId) {
    try {
        const res = await PollAPI.toggleStatus(pollId);
        showToast(res.message, 'success');
        loadAdminPolls();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/* ── Delete Poll ────────────────── */
function openDeleteModal(pollId, title) {
    _deletePollId = pollId;
    document.getElementById('delete-poll-name').textContent = title;
    document.getElementById('delete-modal-overlay').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('delete-modal-overlay').classList.add('hidden');
    _deletePollId = null;
}

async function confirmDeletePoll() {
    if (!_deletePollId) return;
    const btn = document.getElementById('confirm-delete-btn');
    btn.disabled = true;
    try {
        await PollAPI.delete(_deletePollId);
        closeDeleteModal();
        showToast('Poll deleted successfully.', 'success');
        loadAdminPolls();
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
    }
}

// Overlay click closes modals
document.getElementById('poll-modal-overlay')?.addEventListener('click', function(e) { if (e.target === this) closePollModal(); });
document.getElementById('delete-modal-overlay')?.addEventListener('click', function(e) { if (e.target === this) closeDeleteModal(); });

function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
