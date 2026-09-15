/**
 * Mounts the shared sidebar + topbar components into every authenticated
 * page, computes the correct relative BASE path for the current page
 * depth, filters sidebar links by the logged-in user's role, and wires
 * up logout / mobile sidebar toggle / notification bell.
 *
 * Usage (bottom of every authenticated page):
 *   <script src="../../js/api.js"></script>
 *   <script src="../../js/auth.js"></script>
 *   <script src="../../js/utils.js"></script>
 *   <script src="../../js/navigation.js"></script>
 *   <script>HrpLayout.init({ title: 'Employees', match: 'employees/index' });</script>
 */
const HrpLayout = (() => {
  function computeBase() {
    // frontend/index.html & login.html -> depth 0 ("./")
    // frontend/pages/<module>/<page>.html -> depth 2 ("../../")
    const path = window.location.pathname;
    if (path.includes('/pages/')) return '../../';
    return './';
  }

  async function fetchFragment(base, name) {
    const res = await fetch(`${base}components/${name}`);
    return res.text();
  }

  async function mountSidebarAndNavbar(base) {
    const [sidebarHtml, navbarHtml] = await Promise.all([
      fetchFragment(base, 'sidebar.html'),
      fetchFragment(base, 'navbar.html'),
    ]);

    const sidebarMount = document.getElementById('hrp-sidebar-mount');
    const navbarMount = document.getElementById('hrp-topbar-mount');
    if (sidebarMount) sidebarMount.innerHTML = sidebarHtml.replace(/\{\{BASE\}\}/g, base);
    if (navbarMount) navbarMount.innerHTML = navbarHtml;
  }

  function applyRoleFiltering() {
    const user = HrpAuth.getCurrentUser();
    const roleName = user?.role?.name;
    document.querySelectorAll('.hrp-sidebar [data-roles]').forEach((link) => {
      const allowed = link.dataset.roles.split(',');
      if (!roleName || !allowed.includes(roleName)) link.classList.add('d-none');
    });
  }

  function highlightActiveLink(matchKey) {
    if (!matchKey) return;
    document.querySelectorAll('.hrp-sidebar .nav-link').forEach((link) => {
      if (link.dataset.match === matchKey) link.classList.add('active');
    });
  }

  function populateUserMenu() {
    const user = HrpAuth.getCurrentUser();
    const nameEl = document.getElementById('hrp-current-username');
    const roleEl = document.getElementById('hrp-current-role');
    if (nameEl) nameEl.textContent = user ? `${user.username}` : 'User';
    if (roleEl) roleEl.textContent = user?.role?.name?.replace('_', ' ') || '';

    const logoutBtn = document.getElementById('hrp-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); HrpAuth.logout(); });

    const toggleBtn = document.getElementById('hrp-sidebar-toggle');
    const sidebar = document.querySelector('.hrp-sidebar');
    if (toggleBtn && sidebar) toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  async function loadNotifications() {
    try {
      const res = await HrpApi.get('/notifications', { unread: 'true' });
      const countEl = document.getElementById('hrp-notif-count');
      const listEl = document.getElementById('hrp-notif-list');
      const notifications = res.data || [];
      if (countEl) {
        if (notifications.length > 0) {
          countEl.textContent = notifications.length;
          countEl.classList.remove('d-none');
        } else {
          countEl.classList.add('d-none');
        }
      }
      if (listEl) {
        listEl.innerHTML = notifications.length
          ? notifications
              .slice(0, 8)
              .map((n) => `<div class="dropdown-item-text py-2 border-bottom"><strong>${HrpUtils.escapeHtml(n.title)}</strong><br><span class="text-muted-sm">${HrpUtils.escapeHtml(n.message)}</span></div>`)
              .join('')
          : '<div class="text-muted-sm px-2 py-3 text-center">No notifications</div>';
      }
    } catch (e) {
      // Non-fatal - notifications are a convenience, not a hard requirement to view a page.
    }
  }

  async function init({ title, match } = {}) {
    HrpAuth.guardPage();
    const base = computeBase();
    await mountSidebarAndNavbar(base);
    applyRoleFiltering();
    highlightActiveLink(match);
    populateUserMenu();
    const titleEl = document.getElementById('hrp-page-title');
    if (titleEl && title) titleEl.textContent = title;
    loadNotifications();
    return base;
  }

  return { init, computeBase };
})();
