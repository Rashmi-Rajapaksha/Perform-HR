/**
 * Login/logout/session helpers, shared by login.html and every
 * authenticated page (via navigation.js's guardPage()).
 */
const HrpAuth = (() => {
  function saveSession({ user, accessToken }) {
    localStorage.setItem('hrp_access_token', accessToken);
    localStorage.setItem('hrp_user', JSON.stringify(user));
  }

  function getCurrentUser() {
    const raw = localStorage.getItem('hrp_user');
    return raw ? JSON.parse(raw) : null;
  }

  function isLoggedIn() {
    return !!localStorage.getItem('hrp_access_token');
  }

  function hasRole(...roles) {
    const user = getCurrentUser();
    return !!user?.role && roles.includes(user.role.name);
  }

  async function login(username, password) {
    const res = await HrpApi.post('/auth/login', { username, password });
    saveSession(res.data);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('hrp_access_token');
    localStorage.removeItem('hrp_user');
    const depth = window.location.pathname.split('/pages/').length > 1 ? '../../' : './';
    window.location.href = `${depth}login.html`;
  }

  /** Call at the top of every authenticated page to bounce guests back to login. */
  function guardPage() {
    if (!isLoggedIn()) {
      const depth = window.location.pathname.split('/pages/').length > 1 ? '../../' : './';
      window.location.href = `${depth}login.html`;
    }
  }

  return { login, logout, saveSession, getCurrentUser, isLoggedIn, hasRole, guardPage };
})();
