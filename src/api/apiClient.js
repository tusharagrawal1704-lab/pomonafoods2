// Central API client
// All requests go to our Express backend

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

// ─── Token helpers ─────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('epicurean_token');
}

export function setToken(token) {
  localStorage.setItem('epicurean_token', token);
}

export function clearToken() {
  localStorage.removeItem('epicurean_token');
}

// ─── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(err.error || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return res.json();
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const auth = {
  async register({ email, password, full_name }) {
    return apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
  },

  async verifyOtp({ email, otpCode }) {
    const data = await apiFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode }),
    });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  async resendOtp(email) {
    return apiFetch('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async login(email, password) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  async me() {
    return apiFetch('/api/auth/me');
  },

  async resetPasswordRequest(email) {
    return apiFetch('/api/auth/reset-password-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword({ resetToken, newPassword }) {
    return apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword }),
    });
  },

  loginWithProvider(provider) {
    window.location.href = `${API_BASE}/api/auth/${provider}`;
  },

  logout() {
    clearToken();
    window.location.href = '/login';
  },
};

// ─── Entity builder ────────────────────────────────────────────────────────────
function makeEntity(entityName) {
  return {
    async filter(filters = {}, sort = '-created_date', limit = 200) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null) params.set(k, v);
      }
      if (sort) params.set('_sort', sort);
      if (limit) params.set('_limit', limit);
      return apiFetch(`/api/entities/${entityName}?${params.toString()}`);
    },

    async get(id) {
      return apiFetch(`/api/entities/${entityName}/${id}`);
    },

    async create(data) {
      return apiFetch(`/api/entities/${entityName}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id, data) {
      return apiFetch(`/api/entities/${entityName}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async delete(id) {
      return apiFetch(`/api/entities/${entityName}/${id}`, { method: 'DELETE' });
    },
  };
}

// ─── Entities ─────────────────────────────────────────────────────────────────
export const entities = {
  MenuItem: makeEntity('MenuItem'),
  Order: makeEntity('Order'),
  Coupon: makeEntity('Coupon'),
  CustomerSubscription: makeEntity('CustomerSubscription'),
  SubscriptionPlan: makeEntity('SubscriptionPlan'),
};

// Default export for drop-in usage
const apiClient = { auth, entities, setToken, clearToken, getToken };
export default apiClient;
