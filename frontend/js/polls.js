/* ============================================================
   polls.js — Active polls page: listing, voting, results
   ============================================================ */

let _allPolls = [];
let _activePollId  = null;
let _activeOptionId = null;

/* ── Init ──────────────────────────── */
(async () => {
    const user = await initPage();
    if (!user) return;
    
    // Attach Static Listeners
    document.getElementById('poll-search')?.addEventListener('input', filterPolls);
    document.querySelectorAll('.btn-close-vote').forEach(b => b.addEventListener('click', closeVoteModal));
    document.querySelectorAll('.btn-close-results').forEach(b => b.addEventListener('click', closeResultsModal));
    document.getElementById('submit-vote-btn')?.addEventListener('click', submitVote);

    // Grid Delegation (Vote, Results, Delete)
    document.getElementById('polls-grid')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const pollId = btn.getAttribute('data-poll-id');
        if (btn.classList.contains('btn-open-vote')) openVoteModal(pollId);
        else if (btn.classList.contains('btn-open-results')) showResults(pollId);
        else if (btn.classList.contains('btn-delete')) deletePoll(pollId);
    });

    // Modal Body Delegation (Radio buttons)
    document.getElementById('vote-modal-body')?.addEventListener('change', (e) => {
        if (e.target.name === 'vote-option') {
            _activeOptionId = e.target.value;
        }
    });

    loadPolls();
})();

async function loadPolls() {
    const grid = document.getElementById('polls-grid');
    try {
        const res  = await PollAPI.getActive();
        _allPolls  = res.polls || [];
        renderPolls(_allPolls);
    } catch (err) {
        showToast('Failed to load polls. ' + err.message, 'error');
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Could not load polls</h3><p>${err.message}</p></div>`;
    }
}

function renderPolls(polls) {
    const grid = document.getElementById('polls-grid');
    if (!polls.length) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
                <h3>No active polls</h3>
                <p>There are no active polls at the moment. Check back later.</p>
            </div>`;
        return;
    }

    grid.innerHTML = polls.map(poll => buildPollCard(poll)).join('');
}

function buildPollCard(poll) {
    const user = getCurrentUser();
    const isCreator = user && poll.createdBy && (poll.createdBy._id === user._id || poll.createdBy === user._id);
    const isAdmin = user && user.role === 'admin';
    const showDelete = isCreator || isAdmin;

    return `
        <div class="poll-card" id="poll-card-${poll._id}">
            <div class="poll-card-header">
                <h2 class="poll-title">${escapeHtml(poll.title)}</h2>
                <span class="badge badge-active">Active</span>
            </div>
            ${poll.description ? `<p class="poll-description">${escapeHtml(poll.description)}</p>` : ''}
            <span class="poll-options-count">
                ${poll.options.length} options · Created by ${escapeHtml(poll.createdBy?.name || 'Admin')}
            </span>
            <div class="poll-card-footer">
                <button class="btn btn-primary btn-sm btn-open-vote" data-poll-id="${poll._id}">Vote</button>
                <button class="btn btn-secondary btn-sm btn-open-results" data-poll-id="${poll._id}">Results</button>
                ${showDelete ? `
                    <button class="btn btn-danger btn-sm btn-delete" style="margin-left:auto" data-poll-id="${poll._id}">
                        <svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                ` : ''}
            </div>
        </div>`;
}

async function deletePoll(pollId) {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
        return;
    }

    try {
        await PollAPI.delete(pollId);
        showToast('Poll deleted successfully', 'success');
        // Refresh the list
        _allPolls = _allPolls.filter(p => p._id !== pollId);
        renderPolls(_allPolls);
    } catch (err) {
        showToast('Failed to delete poll: ' + err.message, 'error');
    }
}

/* ── Search ─────────────────────── */
function filterPolls() {
    const q = document.getElementById('poll-search').value.trim().toLowerCase();
    const filtered = _allPolls.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
    renderPolls(filtered);
}

/* ── Vote Modal ─────────────────── */
async function openVoteModal(pollId) {
    _activePollId   = pollId;
    _activeOptionId = null;

    const overlay = document.getElementById('vote-modal-overlay');
    const body    = document.getElementById('vote-modal-body');
    const title   = document.getElementById('vote-modal-title');

    body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--clr-text-3)">Loading poll…</div>';
    overlay.classList.remove('hidden');

    try {
        const res  = await PollAPI.getById(pollId);
        const poll = res.poll;

        title.textContent = 'Cast Your Vote';

        if (res.hasVoted) {
            body.innerHTML = `
                <p class="vote-poll-title">${escapeHtml(poll.title)}</p>
                ${poll.description ? `<p class="vote-poll-desc">${escapeHtml(poll.description)}</p>` : ''}
                <div class="poll-already-voted">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    You have already voted in this poll.
                </div>`;
            document.getElementById('submit-vote-btn').disabled = true;
        } else {
            body.innerHTML = `
                <p class="vote-poll-title">${escapeHtml(poll.title)}</p>
                ${poll.description ? `<p class="vote-poll-desc">${escapeHtml(poll.description)}</p>` : ''}
                <div class="options-list">
                    ${poll.options.map(opt => `
                        <label class="option-item" for="opt-${opt._id}">
                            <input type="radio" id="opt-${opt._id}" name="vote-option" value="${opt._id}" />
                            <span class="option-radio-indicator"></span>
                            <span class="option-label">${escapeHtml(opt.optionText)}</span>
                        </label>
                    `).join('')}
                </div>`;
            document.getElementById('submit-vote-btn').disabled = false;
        }
    } catch (err) {
        body.innerHTML = `<div class="form-error">${err.message}</div>`;
    }
}

function closeVoteModal() {
    document.getElementById('vote-modal-overlay').classList.add('hidden');
    _activePollId = null;
    _activeOptionId = null;
}

async function submitVote() {
    if (!_activePollId || !_activeOptionId) {
        showToast('Please select an option before voting.', 'warning');
        return;
    }

    const btn = document.getElementById('submit-vote-btn');
    setLoading(btn, true);

    try {
        await VoteAPI.cast({ pollId: _activePollId, optionId: _activeOptionId });
        closeVoteModal();
        showToast('Your vote has been cast successfully!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(btn, false);
    }
}

/* ── Results Modal ─────────────── */
async function showResults(pollId) {
    const overlay = document.getElementById('results-modal-overlay');
    const body    = document.getElementById('results-modal-body');
    const title   = document.getElementById('results-modal-title');

    body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--clr-text-3)">Loading results…</div>';
    overlay.classList.remove('hidden');

    try {
        const res = await PollAPI.getResults(pollId);
        title.textContent = res.poll.title;

        const total = res.totalVotes;
        body.innerHTML = `
            <p class="results-total">Total votes: <strong>${total}</strong></p>
            <div class="result-bar-list">
                ${res.results.map(r => {
                    const pct = total > 0 ? Math.round((r.votes / total) * 100) : 0;
                    return `
                        <div class="result-bar-item">
                            <div class="result-bar-header">
                                <span>${escapeHtml(r.optionText)}</span>
                                <span class="result-bar-pct">${r.votes} votes · ${pct}%</span>
                            </div>
                            <div class="result-bar-track">
                                <div class="result-bar-fill" style="width:0%" data-width="${pct}%"></div>
                            </div>
                        </div>`;
                }).join('')}
            </div>`;

        // Animate bars after render
        requestAnimationFrame(() => {
            document.querySelectorAll('.result-bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.width;
            });
        });
    } catch (err) {
        body.innerHTML = `<div class="form-error">${err.message}</div>`;
    }
}

function closeResultsModal() {
    document.getElementById('results-modal-overlay').classList.add('hidden');
}

// Close modals on overlay click
document.getElementById('vote-modal-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeVoteModal();
});
document.getElementById('results-modal-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeResultsModal();
});

function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
