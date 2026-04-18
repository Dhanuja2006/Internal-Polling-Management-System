/* ============================================================
   reset-password.js — Password Reset Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-password-form');
    const submitBtn = document.getElementById('submit-btn');
    const errorEl = document.getElementById('status-error');
    const successEl = document.getElementById('status-success');

    if (!form || !submitBtn) return;

    // Extract token from URL hash fragment (#token=xxx)
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    let token = hashParams.get('token');

    if (token) {
        sessionStorage.setItem('reset_token', token);
    } else {
        token = sessionStorage.getItem('reset_token');
    }

    if (!token) {
        if (errorEl) {
            errorEl.textContent = 'Invalid or missing reset token. Please request a new link.';
            errorEl.classList.remove('hidden');
        }
        submitBtn.disabled = true;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!password || !confirmPassword) return;

        if (password !== confirmPassword) {
            errorEl.textContent = 'Passwords do not match';
            errorEl.classList.remove('hidden');
            return;
        }

        if (password.length < 6) {
            errorEl.textContent = 'Password must be at least 6 characters';
            errorEl.classList.remove('hidden');
            return;
        }

        // Reset UI
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');
        submitBtn.disabled = true;
        const spinner = submitBtn.querySelector('.btn-spinner');
        const text = submitBtn.querySelector('.btn-text');
        if (spinner) spinner.classList.remove('hidden');
        if (text) text.textContent = 'Resetting...';

        try {
            const data = await AuthAPI.resetPassword(token, { password });

            if (data.success) {
                sessionStorage.removeItem('reset_token');
                successEl.textContent = data.message + '. Redirecting...';
                successEl.classList.remove('hidden');
                form.reset();
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                throw new Error(data.message || 'Error occurred');
            }
        } catch (err) {
            console.error('Reset password error:', err);
            errorEl.textContent = err.message || 'Server error. Please try again.';
            errorEl.classList.remove('hidden');
            submitBtn.disabled = false;
            if (spinner) spinner.classList.add('hidden');
            if (text) text.textContent = 'Reset Password';
        }
    });
});
