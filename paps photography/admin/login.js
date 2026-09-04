document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';

    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const loginBtn = document.querySelector('#login-form .btn-primary');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            loginError.textContent = 'Please enter your username and password.';
            return;
        }

        loginError.textContent = '';
        if (loginBtn) loginBtn.classList.add('loading');
        loginBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                window.location.href = 'admin.html';
            } else if (response.status === 401) {
                loginError.textContent = 'Invalid username or password. Please try again.';
            } else {
                loginError.textContent = 'Login failed. Please make sure the backend server is running and try again.';
            }
        } catch (error) {
            console.error('Login request failed:', error);
            loginError.textContent = 'Could not reach the server. Please make sure the backend is running on port 5000 and try again.';
        } finally {
            if (loginBtn) loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    });
});