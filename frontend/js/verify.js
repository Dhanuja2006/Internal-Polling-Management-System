/* ============================================================
   verify.js — Email Verification Logic
   ============================================================ */

function show(stateId) {
    ['state-loading', 'state-success', 'state-error'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === stateId ? 'block' : 'none';
    });
}

async function verifyEmail() {
    // Read token from URL query string (?token=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        console.error('[VERIFY] No token found in URL');
        show('state-error');
        const errEl = document.getElementById('error-message');
        if (errEl) errEl.textContent = 'No verification token found. Please use the link from your email.';
        return;
    }

    console.log('[VERIFY] Starting verification for token:', token.substring(0, 8) + '...');

    try {
        // Ensure API_BASE/AuthAPI is ready (initialized by api.js)
        if (typeof AuthAPI === 'undefined') {
            console.warn('[VERIFY] AuthAPI undefined, waiting 500ms...');
            await new Promise(r => setTimeout(r, 500));
            if (typeof AuthAPI === 'undefined') {
                throw new Error('System initialization failed. Please refresh the page.');
            }
        }

        const res = await AuthAPI.verifyEmail(token);
        console.log('[VERIFY] Response:', res);

        if (res.success) {
            show('state-success');
            // Countdown redirect
            let count = 3;
            const countEl = document.getElementById('redirect-countdown');
            const interval = setInterval(() => {
                count--;
                if (countEl) countEl.textContent = `Redirecting in ${count} second${count !== 1 ? 's' : ''}…`;
                if (count <= 0) {
                    clearInterval(interval);
                    window.location.href = 'index.html';
                }
            }, 1000);
        } else {
            throw new Error(res.message || 'Verification failed.');
        }
    } catch (err) {
        console.error('[VERIFY] Error:', err);
        show('state-error');
        const errEl = document.getElementById('error-message');
        if (errEl) errEl.textContent = err.message || 'Could not connect to the server. Please check your connection.';
    }
}

// Execute on load
document.addEventListener('DOMContentLoaded', verifyEmail);
