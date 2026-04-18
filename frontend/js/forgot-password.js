/* ============================================================
   forgot-password.js — Forgot Password Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    const submitBtn = document.getElementById('submit-btn');
    const errorEl = document.getElementById('status-error');
    const successEl = document.getElementById('status-success');

    if (!form || !submitBtn) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();

        if (!email) return;

        // Reset UI
        if (errorEl) errorEl.classList.add('hidden');
        if (successEl) successEl.classList.add('hidden');
        
        submitBtn.disabled = true;
        const spinner = submitBtn.querySelector('.btn-spinner');
        const text = submitBtn.querySelector('.btn-text');
        
        if (spinner) spinner.classList.remove('hidden');
        if (text) text.textContent = 'Sending...';

        try {
            const response = await AuthAPI.forgotPassword({ email });
            if (response.success) {
                if (successEl) {
                    successEl.textContent = response.message;
                    successEl.classList.remove('hidden');
                }
                form.reset();
            } else {
                throw new Error(response.message || 'Error occurred');
            }
        } catch (err) {
            console.error('Forgot password error:', err);
            if (errorEl) {
                errorEl.textContent = err.message || 'Server error. Please try again.';
                errorEl.classList.remove('hidden');
            }
        } finally {
            submitBtn.disabled = false;
            if (spinner) spinner.classList.add('hidden');
            if (text) text.textContent = 'Send Reset Link';
        }
    });
});
