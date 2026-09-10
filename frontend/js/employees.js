/** Employee list, create, edit, and view page logic. */
const HrpEmployees = (() => {
  let currentPage = 1;

  async function loadFilters() {
    const [depts, desigs, empTypes] = await Promise.all([
      HrpApi.get('/departments'),
      HrpApi.get('/designations'),
      HrpApi.get('/employees').catch(() => ({ data: [] })), // placeholder; employment types fetched below
    ]);
    const deptSelect = document.getElementById('hrp-filter-department');
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">All Departments</option>' + depts.data.map((d) => `<option value="${d.id}">${HrpUtils.escapeHtml(d.name)}</option>`).join('');
    }
    const desigSelect = document.getElementById('hrp-filter-designation');
    if (desigSelect) {
      desigSelect.innerHTML = '<option value="">All Designations</option>' + desigs.data.map((d) => `<option value="${d.id}">${HrpUtils.escapeHtml(d.name)}</option>`).join('');
    }
    return { departments: depts.data, designations: desigs.data };
  }

  async function loadList(page = 1) {
    currentPage = page;
    const query = {
      page,
      search: document.getElementById('hrp-filter-search')?.value || undefined,
      department_id: document.getElementById('hrp-filter-department')?.value || undefined,
      designation_id: document.getElementById('hrp-filter-designation')?.value || undefined,
      employment_status: document.getElementById('hrp-filter-status')?.value || undefined,
    };
    const res = await HrpApi.get('/employees', query);
    const tbody = document.getElementById('hrp-employee-table-body');
    tbody.innerHTML = res.data.length
      ? res.data
          .map(
            (e) => `
      <tr>
        <td>${HrpUtils.escapeHtml(e.employee_code)}</td>
        <td>${HrpUtils.escapeHtml(e.first_name)} ${HrpUtils.escapeHtml(e.last_name)}</td>
        <td>${HrpUtils.escapeHtml(e.department?.name || '-')}</td>
        <td>${HrpUtils.escapeHtml(e.designation?.name || '-')}</td>
        <td>${HrpUtils.escapeHtml(e.manager ? `${e.manager.first_name} ${e.manager.last_name}` : '-')}</td>
        <td>${HrpUtils.statusBadge(e.employment_status)}</td>
        <td class="hrp-row-actions">
          <a class="btn btn-outline-secondary" href="view.html?id=${e.id}"><i class="bi bi-eye"></i></a>
          <a class="btn btn-outline-primary" href="edit.html?id=${e.id}"><i class="bi bi-pencil"></i></a>
        </td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="7" class="text-center text-muted-sm py-4">No employees found</td></tr>';

    renderPagination(res.meta);
  }

  function renderPagination(meta) {
    const el = document.getElementById('hrp-pagination');
    if (!el || !meta) return;
    let html = '';
    for (let i = 1; i <= meta.totalPages; i += 1) {
      html += `<li class="page-item ${i === meta.page ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    el.innerHTML = html;
    el.querySelectorAll('[data-page]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        loadList(Number(link.dataset.page));
      });
    });
  }

  function bindFilters() {
    const searchInput = document.getElementById('hrp-filter-search');
    if (searchInput) searchInput.addEventListener('input', HrpUtils.debounce(() => loadList(1)));
    ['hrp-filter-department', 'hrp-filter-designation', 'hrp-filter-status'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => loadList(1));
    });
  }

  async function initListPage() {
    await loadFilters();
    bindFilters();
    await loadList(1);
  }

  // ----- Create / Edit form -----
  async function populateFormLookups() {
    const [depts, desigs, types, employeesRes] = await Promise.all([
      HrpApi.get('/departments'),
      HrpApi.get('/designations'),
      HrpApi.get('/payroll/components').catch(() => ({ data: [] })), // not used, placeholder guard
      HrpApi.get('/employees', { pageSize: 100 }),
    ]);
    const deptSelect = document.getElementById('hrp-form-department');
    deptSelect.innerHTML = depts.data.map((d) => `<option value="${d.id}">${HrpUtils.escapeHtml(d.name)}</option>`).join('');

    const desigSelect = document.getElementById('hrp-form-designation');
    desigSelect.innerHTML = desigs.data.map((d) => `<option value="${d.id}">${HrpUtils.escapeHtml(d.name)}</option>`).join('');

    const mgrSelect = document.getElementById('hrp-form-manager');
    mgrSelect.innerHTML = '<option value="">None</option>' + employeesRes.data.map((e) => `<option value="${e.id}">${HrpUtils.escapeHtml(e.first_name)} ${HrpUtils.escapeHtml(e.last_name)} (${e.employee_code})</option>`).join('');

    // Employment types have no dedicated list endpoint in the router; sourced from a fixed set matching the seeded master data.
    const typeSelect = document.getElementById('hrp-form-employment-type');
    typeSelect.innerHTML = ['PERMANENT', 'CONTRACT', 'PROBATION', 'INTERN']
      .map((name, idx) => `<option value="${idx + 1}">${name}</option>`)
      .join('');
  }

  function readForm() {
    return {
      employee_code: document.getElementById('hrp-form-code').value.trim(),
      first_name: document.getElementById('hrp-form-first-name').value.trim(),
      last_name: document.getElementById('hrp-form-last-name').value.trim(),
      gender: document.getElementById('hrp-form-gender').value || null,
      email: document.getElementById('hrp-form-email').value.trim() || null,
      phone: document.getElementById('hrp-form-phone').value.trim() || null,
      department_id: Number(document.getElementById('hrp-form-department').value),
      designation_id: Number(document.getElementById('hrp-form-designation').value),
      reporting_manager_id: document.getElementById('hrp-form-manager').value || null,
      employment_type_id: Number(document.getElementById('hrp-form-employment-type').value),
      join_date: document.getElementById('hrp-form-join-date').value,
      basic_salary: Number(document.getElementById('hrp-form-salary').value),
      work_schedule_type: document.getElementById('hrp-form-schedule').value,
    };
  }

  async function initCreatePage() {
    await populateFormLookups();
    document.getElementById('hrp-employee-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await HrpApi.post('/employees', readForm());
        HrpUtils.showToast('Employee created successfully');
        window.location.href = `view.html?id=${res.data.id}`;
      } catch (err) {
        HrpUtils.showError(err);
      }
    });
  }

  async function initEditPage() {
    const id = HrpUtils.qs('id');
    await populateFormLookups();
    const res = await HrpApi.get(`/employees/${id}`);
    const e = res.data;
    document.getElementById('hrp-form-code').value = e.employee_code;
    document.getElementById('hrp-form-code').disabled = true;
    document.getElementById('hrp-form-first-name').value = e.first_name;
    document.getElementById('hrp-form-last-name').value = e.last_name;
    document.getElementById('hrp-form-gender').value = e.gender || '';
    document.getElementById('hrp-form-email').value = e.email || '';
    document.getElementById('hrp-form-phone').value = e.phone || '';
    document.getElementById('hrp-form-department').value = e.department_id;
    document.getElementById('hrp-form-designation').value = e.designation_id;
    document.getElementById('hrp-form-manager').value = e.reporting_manager_id || '';
    document.getElementById('hrp-form-employment-type').value = e.employment_type_id;
    document.getElementById('hrp-form-join-date').value = e.join_date;
    document.getElementById('hrp-form-salary').value = e.basic_salary;
    document.getElementById('hrp-form-schedule').value = e.work_schedule_type;

    document.getElementById('hrp-employee-form').addEventListener('submit', async (evt) => {
      evt.preventDefault();
      try {
        const payload = readForm();
        delete payload.employee_code;
        await HrpApi.put(`/employees/${id}`, payload);
        HrpUtils.showToast('Employee updated successfully');
        window.location.href = `view.html?id=${id}`;
      } catch (err) {
        HrpUtils.showError(err);
      }
    });
  }

  async function initViewPage() {
    const id = HrpUtils.qs('id');
    const res = await HrpApi.get(`/employees/${id}`);
    const e = res.data;

    document.getElementById('hrp-view-name').textContent = `${e.first_name} ${e.last_name}`;
    document.getElementById('hrp-view-code').textContent = e.employee_code;
    document.getElementById('hrp-view-status').innerHTML = HrpUtils.statusBadge(e.employment_status);
    document.getElementById('hrp-view-department').textContent = e.department?.name || '-';
    document.getElementById('hrp-view-designation').textContent = e.designation?.name || '-';
    document.getElementById('hrp-view-manager').textContent = e.manager ? `${e.manager.first_name} ${e.manager.last_name}` : '-';
    document.getElementById('hrp-view-employment-type').textContent = e.employmentType?.name || '-';
    document.getElementById('hrp-view-join-date').textContent = HrpUtils.formatDate(e.join_date);
    document.getElementById('hrp-view-salary').textContent = HrpUtils.formatCurrency(e.basic_salary);
    document.getElementById('hrp-view-email').textContent = e.email || '-';
    document.getElementById('hrp-view-phone').textContent = e.phone || '-';
    document.getElementById('hrp-view-schedule').textContent = e.work_schedule_type;
    document.getElementById('hrp-edit-link').href = `edit.html?id=${id}`;

    try {
      const reports = await HrpApi.get(`/employees/${id}/direct-reports`);
      const list = document.getElementById('hrp-direct-reports');
      list.innerHTML = reports.data.length
        ? reports.data.map((r) => `<li><a href="view.html?id=${r.id}">${HrpUtils.escapeHtml(r.first_name)} ${HrpUtils.escapeHtml(r.last_name)}</a></li>`).join('')
        : '<li class="text-muted-sm">No direct reports</li>';
    } catch (e2) { /* non-fatal */ }
  }

  return { initListPage, initCreatePage, initEditPage, initViewPage };
})();