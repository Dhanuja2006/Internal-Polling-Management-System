/* ============================================================
   auth.js — Authentication Logic
   ============================================================ */

function switchTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const panels = document.querySelectorAll('.auth-panel');

    tabs.forEach(t => {
        const isActive = t.id === `tab-${tab}`;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive);
    });
    panels.forEach(p => {
        p.classList.toggle('hidden', p.id !== `panel-${tab}`);
    });
}

// Tab Listeners
document.getElementById('tab-login')?.addEventListener('click', () => switchTab('login'));
document.getElementById('tab-register-user')?.addEventListener('click', () => switchTab('register-user'));
document.getElementById('tab-register-admin')?.addEventListener('click', () => switchTab('register-admin'));

/* ── Login ─────────────────────── */
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');

    errEl.classList.add('hidden');
    setLoading(btn, true);

    try {
        await AuthAPI.login({ email, password });
        window.location.href = 'dashboard.html';
    } catch (err) {
        console.error('[LOGIN ERROR]', err);
        
        // Check for verification errors
        const isUnverified = (err.status === 403 || err.status === 401) && 
                           (err.message.toLowerCase().includes('verify') || 
                            err.message.toLowerCase().includes('email') || 
                            err.message.toLowerCase().includes('role'));

        if (isUnverified) {
            // Store email for resend
            window._lastLoginEmail = email;
            
            errEl.innerHTML = `
                <div style="margin-bottom: 12px;">${err.message}</div>
                <div style="padding: 12px; background: rgba(99, 102, 241, 0.1); border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.2);">
                    <p style="font-size: 13px; margin: 0 0 10px 0; color: var(--clr-text-muted);">Didn't get the email?</p>
                    <button type="button" id="resend-link-btn" class="btn btn-primary btn-sm" style="width: 100%; height: 36px;">
                        Resend Verification Link
                    </button>
                </div>
            `;

            // Use event delegation or a fresh listener
            // Removing old listeners isn't strictly necessary for a single button we just added
            // but we'll use a fresh listener for simplicity since we just overwrote innerHTML
            setTimeout(() => {
                document.getElementById('resend-link-btn')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleResend(window._lastLoginEmail);
                });
            }, 0);
        } else {
            errEl.textContent = err.message || 'Authentication failed.';
        }

        errEl.classList.remove('hidden');
    } finally {
        setLoading(btn, false);
    }
});

async function handleResend(email) {
    if (!email) {
        showToast('No email found to resend to.', 'error');
        return;
    }

    showToast('Requesting new link...', 'info');
    
    const errEl = document.getElementById('login-error');
    const btn = errEl?.querySelector('button');
    const originalText = btn ? btn.textContent : 'Resend';
    
    try {
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Sending...';
        }

        const res = await AuthAPI.resendVerification({ email });
        console.log('[RESEND SUCCESS]', res);
        
        let html = `<div class="form-success" style="margin:0; background:none; border:none; color:var(--clr-success); font-weight:600;">${res.message}</div>`;
        
        if (!res.emailSent && res.verifyUrl) {
            html += `
                <div style="margin-top:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:4px; border:1px dashed var(--clr-success);">
                    <p style="font-size:11px; margin-bottom:5px; opacity:0.8;">Development Link:</p>
                    <a href="${res.verifyUrl}" style="color:var(--clr-primary); word-break:break-all; font-size:12px; font-weight:700;">${res.verifyUrl}</a>
                </div>
            `;
        }
        
        errEl.innerHTML = html;
        showToast('Link request processed.', 'success');
    } catch (err) {
        console.error('[RESEND ERROR]', err);
        showToast(err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

/* ── User Register ──────────────── */
document.getElementById('register-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('user-name').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const password = document.getElementById('user-password').value;
    const btn = document.getElementById('register-user-btn');
    const errEl = document.getElementById('register-user-error');
    const successEl = document.getElementById('register-user-success');

    errEl.classList.add('hidden');
    successEl.classList.add('hidden');
    setLoading(btn, true);

    try {
        await AuthAPI.registerUser({ name, email, password });
        successEl.textContent = 'Awesome! Please check your email to verify your account.';
        successEl.classList.remove('hidden');
        document.getElementById('register-user-form').reset();
    } catch (err) {
        errEl.textContent = err.message || 'Could not join workspace.';
        errEl.classList.remove('hidden');
    } finally {
        setLoading(btn, false);
    }
});

/* ── Admin Register ─────────────── */
document.getElementById('register-admin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('admin-name').value.trim();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const adminCode = document.getElementById('admin-code').value.trim();
    const btn = document.getElementById('register-admin-btn');
    const errEl = document.getElementById('register-admin-error');
    const successEl = document.getElementById('register-admin-success');

    errEl.classList.add('hidden');
    successEl.classList.add('hidden');
    setLoading(btn, true);

    try {
        await AuthAPI.registerAdmin({ name, email, password, adminCode });
        successEl.textContent = 'Admin profile established! Redirecting...';
        successEl.classList.remove('hidden');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
    } catch (err) {
        errEl.textContent = err.message || 'Admin setup failed.';
        errEl.classList.remove('hidden');
    } finally {
        setLoading(btn, false);
    }
});

function setLoading(btn, loading) {
    const text = btn.querySelector('.btn-text');
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
