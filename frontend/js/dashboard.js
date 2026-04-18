/* ============================================================
   dashboard.js — Main dashboard page logic
   ============================================================ */

let _polls = [];
let _votes = [];

(async () => {
    const user = await initPage();
    if (!user) return;

    loadDashboard(user);

    // AI Global Listener
    document.getElementById('btn-ai-global-open')?.addEventListener('click', () => {
        window.location.href = 'admin-polls.html?ai=open';
    });
})();

async function loadDashboard(user) {
    try {
        // Load active polls
        const pollsRes = await PollAPI.getActive();
        _polls = pollsRes.polls || [];

        // Load my votes
        const votesRes = await VoteAPI.myVotes();
        _votes = votesRes.votes || [];

        // Update stat cards – basic ones
        document.getElementById('stat-polls-count').textContent = _polls.length;
        document.getElementById('stat-votes-count').textContent = _votes.length;

        // Admin extras
        if (user.role === 'admin') {
            loadAdminStats();
        }

        // Render recent polls (first 3) 
        renderRecentPolls(_polls.slice(0, 3));
        // Render recent votes (first 3)
        renderRecentVotes(_votes.slice(0, 3));

    } catch (err) {
        showToast('Failed to load dashboard data. ' + err.message, 'error');
    }
}

async function loadAdminStats() {
    try {
        const [allPollsRes, allUsersRes] = await Promise.allSettled([
            PollAPI.getAll(),
            AuthAPI.getAllUsers()
        ]);

        if (allPollsRes.status === 'fulfilled') {
            document.getElementById('stat-total-count').textContent = allPollsRes.value.count ?? '–';
        }
        if (allUsersRes.status === 'fulfilled') {
            document.getElementById('stat-users-count').textContent = allUsersRes.value.count ?? '–';
        }
    } catch (_) {}
}

function renderRecentPolls(polls) {
    const grid = document.getElementById('recent-polls-grid');
    if (!grid) return;

    if (!polls.length) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
                <h3>No active polls</h3>
                <p>Check back later or ask an admin to create polls.</p>
            </div>`;
        return;
    }

    grid.innerHTML = polls.map(poll => `
        <div class="poll-card">
            <div class="poll-card-header">
                <h3 class="poll-title">${escapeHtml(poll.title)}</h3>
                <span class="badge badge-active">Active</span>
            </div>
            ${poll.description ? `<p class="poll-description">${escapeHtml(poll.description)}</p>` : ''}
            <span class="poll-options-count">${poll.options.length} options</span>
            <div class="poll-card-footer">
                <a href="polls.html" class="btn btn-primary btn-sm">Vote Now</a>
            </div>
        </div>
    `).join('');
}

function renderRecentVotes(votes) {
    const list = document.getElementById('recent-votes-list');
    if (!list) return;

    if (!votes.length) {
        list.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                <h3>No votes yet</h3>
                <p>You haven't voted in any polls yet. Start voting!</p>
            </div>`;
        return;
    }

    list.innerHTML = votes.map(v => `
        <div class="vote-item">
            <div class="vote-item-left">
                <h3>${escapeHtml(v.pollTitle)}</h3>
                <p class="vote-item-choice">✓ ${escapeHtml(v.optionText)}</p>
            </div>
            <span class="vote-item-date">${formatDate(v.votedAt)}</span>
        </div>
    `).join('');
}

function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
