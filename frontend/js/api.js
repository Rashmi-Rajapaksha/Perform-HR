/**
 * Reusable fetch wrapper for the HR Plus REST API.
 * Every call automatically attaches the JWT bearer token, unwraps the
 * standard { success, message, data, meta } response envelope, and
 * redirects to the login page on a 401.
 */
const HRP_API_BASE = (() => {
  // Allow overriding via a <meta name="hrp-api-base" content="..."> tag if the
  // API is hosted on a different origin than the static frontend.
  const meta = document.querySelector('meta[name="hrp-api-base"]');
  return meta ? meta.content : 'http://localhost:5000/api/v1';
})();

const HrpApi = (() => {
  function getToken() {
    return localStorage.getItem('hrp_access_token');
  }

  async function request(method, path, { body, query, isForm } = {}) {
    let url = `${HRP_API_BASE}${path}`;
    if (query) {
      const qs = new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
      ).toString();
      if (qs) url += `?${qs}`;
    }

    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!isForm) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });

    if (res.status === 401) {
      localStorage.removeItem('hrp_access_token');
      localStorage.removeItem('hrp_user');
      if (!window.location.pathname.endsWith('login.html')) {
        const depth = window.location.pathname.split('/pages/').length > 1 ? '../../' : './';
        window.location.href = `${depth}login.html`;
      }
      throw new Error('Session expired. Please log in again.');
    }

    const isCsv = res.headers.get('content-type')?.includes('text/csv');
    if (isCsv) return res.blob();

    let json;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error('Unexpected server response');
    }

    if (!res.ok || json.success === false) {
      const err = new Error(json.message || 'Request failed');
      err.errors = json.errors;
      err.statusCode = res.status;
      throw err;
    }

    return json;
  }

  return {
    get: (path, query) => request('GET', path, { query }),
    post: (path, body) => request('POST', path, { body }),
    put: (path, body) => request('PUT', path, { body }),
    patch: (path, body) => request('PATCH', path, { body }),
    delete: (path) => request('DELETE', path),
    downloadCsv: async (path, query, filename) => {
      const blob = await request('GET', path, { query: { ...query, format: 'csv' } });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  };
})();
