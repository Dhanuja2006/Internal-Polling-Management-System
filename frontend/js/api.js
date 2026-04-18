/* ============================================================
   api.js - Centralized fetch wrapper for the backend API
   ============================================================ */

const resolveApiBase = () => {
    const configuredBase = window.APP_CONFIG?.apiBase || localStorage.getItem('api_base_override');
    if (configuredBase) {
        return configuredBase.replace(/\/$/, '');
    }

    if (window.location.protocol === 'file:') {
        return 'http://localhost:8080/api/v1';
    }

    return `${window.location.origin.replace(/\/$/, '')}/api/v1`;
};

const API_BASE = resolveApiBase();

function saveToken(token) {
    if (token) {
        localStorage.setItem('jwt_token', token);
    }
}

function getToken() {
    return localStorage.getItem('jwt_token');
}

function clearToken() {
    localStorage.removeItem('jwt_token');
}

async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = getToken();

    const headers = {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const details = Array.isArray(data.details) ? ` ${data.details.join(', ')}` : '';
            const error = new Error((data.message || `HTTP ${response.status}`) + details);
            error.status = response.status;
            error.data = data;
            if (response.status === 401) clearToken();
            throw error;
        }

        if (data.token) saveToken(data.token);
        return data;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection.');
        }
        throw err;
    }
}

const AuthAPI = {
    login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    registerUser: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    registerAdmin: (body) => apiFetch('/auth/register-admin', { method: 'POST', body: JSON.stringify(body) }),
    logout: async () => {
        const data = await apiFetch('/auth/logout');
        clearToken();
        return data;
    },
    me: () => apiFetch('/auth/me'),
    verifyEmail: (token) => apiFetch(`/auth/verify-email/${token}`),
    resendVerification: (body) => apiFetch('/auth/resend-verification', { method: 'POST', body: JSON.stringify(body) }),
    forgotPassword: (body) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
    resetPassword: (token, body) => apiFetch(`/auth/reset-password/${token}`, { method: 'POST', body: JSON.stringify(body) }),
    getAllUsers: () => apiFetch('/auth/all-users'),
    getAllAdmins: () => apiFetch('/auth/get-all-admin'),
    updateRole: (id, role) => apiFetch(`/auth/update-role/${id}`, { method: 'PUT', body: JSON.stringify({ role }) }),
    deleteUser: (id) => apiFetch(`/auth/delete-user/${id}`, { method: 'DELETE' })
};

const AdminAPI = {
    createUser: (body) => apiFetch('/admin/create-user', { method: 'POST', body: JSON.stringify(body) })
};

const PollAPI = {
    getActive: () => apiFetch('/polls/active'),
    getById: (id) => apiFetch(`/polls/${id}`),
    getResults: (id) => apiFetch(`/polls/${id}/results`),
    getAll: () => apiFetch('/polls'),
    create: (body) => apiFetch('/polls', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => apiFetch(`/polls/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => apiFetch(`/polls/${id}`, { method: 'DELETE' }),
    toggleStatus: (id) => apiFetch(`/polls/${id}/toggle`, { method: 'PUT' })
};

const VoteAPI = {
    cast: (body) => apiFetch('/votes', { method: 'POST', body: JSON.stringify(body) }),
    myVotes: () => apiFetch('/votes/my-votes'),
    checkStatus: (pollId) => apiFetch(`/votes/status/${pollId}`),
    getPollVotes: (pollId) => apiFetch(`/votes/poll/${pollId}`)
};

const OrgAPI = {
    create: (body) => apiFetch('/organizations', { method: 'POST', body: JSON.stringify(body) }),
    join: (inviteCode) => apiFetch('/organizations/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
    getMyOrgs: () => apiFetch('/organizations/my'),
    getMembers: (orgId) => apiFetch(`/organizations/${orgId}/members`),
    updateMemberRole: (orgId, userId, role) => apiFetch(`/organizations/${orgId}/members/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    leave: (orgId) => apiFetch(`/organizations/${orgId}/leave`, { method: 'DELETE' }),
    getLogs: (orgId) => apiFetch(`/organizations/${orgId}/logs`)
};

const AI_API = {
    generatePoll: (body) => apiFetch('/ai/generate-poll', { method: 'POST', body: JSON.stringify(body) })
};

window.AuthAPI = AuthAPI;
window.AdminAPI = AdminAPI;
window.PollAPI = PollAPI;
window.VoteAPI = VoteAPI;
window.OrgAPI = OrgAPI;
window.AI_API = AI_API;
window.clearToken = clearToken;
window.getToken = getToken;
window.API_BASE = API_BASE;
