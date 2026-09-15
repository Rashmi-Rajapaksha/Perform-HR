/** User management, roles/permissions viewer, and system settings logic. */
const HrpAdmin = (() => {
  async function initUsersPage() {
    await loadRolesIntoSelect();
    await loadUsers();
  }

  async function loadRolesIntoSelect() {
    const res = await HrpApi.get('/users/roles');
    const select = document.getElementById('hrp-register-role');
    if (select) select.innerHTML = res.data.map((r) => `<option value="${r.id}">${HrpUtils.escapeHtml(r.name)}</option>`).join('');
    return res.data;
  }

  async function loadUsers() {
    const res = await HrpApi.get('/users', { pageSize: 100 });
    document.getElementById('hrp-user-table').innerHTML = res.data
      .map(
        (u) => `<tr>
      <td>${HrpUtils.escapeHtml(u.username)}</td>
      <td>${HrpUtils.escapeHtml(u.email)}</td>
      <td>${HrpUtils.escapeHtml(u.role?.name || '')}</td>
      <td>${HrpUtils.escapeHtml(u.employee ? `${u.employee.first_name} ${u.employee.last_name}` : '-')}</td>
      <td>${u.is_active ? '<span class="badge badge-status badge-ACTIVE">Active</span>' : '<span class="badge badge-status badge-TERMINATED">Inactive</span>'}</td>
      <td>${u.is_active ? `<button class="btn btn-sm btn-outline-danger" data-deactivate="${u.id}">Deactivate</button>` : ''}</td>
    </tr>`
      )
      .join('');

    document.querySelectorAll('[data-deactivate]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await HrpApi.patch(`/users/${btn.dataset.deactivate}/deactivate`);
          HrpUtils.showToast('User deactivated');
          loadUsers();
        } catch (err) { HrpUtils.showError(err); }
      });
    });
  }

  function bindCreateUserForm() {
    document.getElementById('hrp-register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await HrpApi.post('/auth/register', {
          username: document.getElementById('hrp-register-username').value,
          email: document.getElementById('hrp-register-email').value,
          password: document.getElementById('hrp-register-password').value,
          role_id: Number(document.getElementById('hrp-register-role').value),
        });
        HrpUtils.showToast('User account created');
        document.getElementById('hrp-register-form').reset();
        loadUsers();
      } catch (err) { HrpUtils.showError(err); }
    });
  }

  async function initRolesPage() {
    const res = await HrpApi.get('/users/roles');
    document.getElementById('hrp-roles-container').innerHTML = res.data
      .map(
        (r) => `<div class="hrp-card mb-3">
      <h6>${HrpUtils.escapeHtml(r.name)}</h6>
      <p class="text-muted-sm">${HrpUtils.escapeHtml(r.description || '')}</p>
      <div class="d-flex flex-wrap gap-1">
        ${r.permissions.map((p) => `<span class="badge bg-light text-dark border">${HrpUtils.escapeHtml(p.code)}</span>`).join('')}
      </div>
    </div>`
      )
      .join('');
  }

  async function initSettingsPage() {
    try {
      const res = await HrpApi.get('/reports/employees/master');
      document.getElementById('hrp-settings-employee-count').textContent = res.data.length;
    } catch (e) { /* non-fatal */ }
    document.getElementById('hrp-settings-note').textContent =
      'System-wide configuration (rate limits, pagination defaults, dashboard poll interval) is managed via backend/.env and applied at server startup.';
  }

  return { initUsersPage, bindCreateUserForm, initRolesPage, initSettingsPage };
})();
