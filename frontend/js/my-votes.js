/* ============================================================
   my-votes.js — User's full voting history
   ============================================================ */

(async () => {
    const user = await initPage();
    if (!user) return;
    loadMyVotes();
})();

async function loadMyVotes() {
    const list = document.getElementById('votes-page-list');
    try {
        const res   = await VoteAPI.myVotes();
        const votes = res.votes || [];

        if (!votes.length) {
            list.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    <h3>No votes yet</h3>
                    <p>You haven't voted in any polls yet. <a href="polls.html" style="color:var(--clr-primary)">Browse active polls →</a></p>
                </div>`;
            return;
        }

        list.innerHTML = votes.map(v => `
            <div class="vote-item">
                <div class="vote-item-left">
                    <h3>${escapeHtml(v.pollTitle)}</h3>
                    <p class="vote-item-choice">
                        <svg style="display:inline;width:12px;height:12px;color:var(--clr-success);vertical-align:middle;margin-right:4px" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        ${escapeHtml(v.optionText)}
                    </p>
                </div>
                <span class="vote-item-date">${formatDateTime(v.votedAt)}</span>
            </div>
        `).join('');

    } catch (err) {
        showToast('Failed to load votes. ' + err.message, 'error');
        list.innerHTML = `<div class="empty-state"><h3>Could not load votes</h3><p>${err.message}</p></div>`;
    }
}

function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
