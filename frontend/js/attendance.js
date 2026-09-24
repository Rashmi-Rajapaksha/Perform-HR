/** Attendance index, daily, and monthly page logic + check-in/out and leave workflows. */
const HrpAttendance = (() => {
  async function initIndexPage() {
    const user = HrpAuth.getCurrentUser();
    document.getElementById('hrp-checkin-btn').addEventListener('click', async () => {
      try {
        await HrpApi.post('/attendance/check-in', { employee_id: user.employee?.id });
        HrpUtils.showToast('Checked in successfully');
      } catch (err) { HrpUtils.showError(err); }
    });
    document.getElementById('hrp-checkout-btn').addEventListener('click', async () => {
      try {
        await HrpApi.post('/attendance/check-out', {});
        HrpUtils.showToast('Checked out successfully');
      } catch (err) { HrpUtils.showError(err); }
    });

    await initLeaveForm(user);

    loadLeaveApplications();
    loadRecentSummary(user.employee?.id);
  }

  // ----- Apply for Leave -----
  const $ = (id) => document.getElementById(id);

  /** Shows the Leave fields or the Half Day fields and makes only the visible ones required. */
  function toggleLeaveMode() {
    const halfDay = $('hrp-leave-mode').value === 'HALF_DAY';
    $('hrp-leave-fields').hidden = halfDay;
    $('hrp-half-day-fields').hidden = !halfDay;
    ['hrp-leave-type', 'hrp-leave-start', 'hrp-leave-end', 'hrp-leave-days'].forEach((id) => { $(id).required = !halfDay; });
    $('hrp-half-day-date').required = halfDay;
  }

  /** Fills No of Days with the inclusive span between start and end date (still editable, e.g. to skip weekends). */
  function updateLeaveDays() {
    const start = $('hrp-leave-start').value;
    const end = $('hrp-leave-end').value;
    if (!start || !end) return;
    const span = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
    if (span > 0) $('hrp-leave-days').value = span;
  }

  async function initLeaveForm(user) {
    const ownEmployeeId = user?.employee_id || user?.employee?.id || null;

    // HR / managers can pick any active employee; others can only apply for themselves.
    let employees = [];
    try {
      employees = await fetchAllPages('/employees', { employment_status: 'ACTIVE' });
      employees.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
    } catch (err) { /* no permission to list employees */ }

    const employeeSelect = $('hrp-leave-employee');
    if (employees.length) {
      employeeSelect.innerHTML = '<option value="">Select employee</option>'
        + employees.map((e) => `<option value="${e.id}">${HrpUtils.escapeHtml(e.first_name)} ${HrpUtils.escapeHtml(e.last_name)} (${HrpUtils.escapeHtml(e.employee_code)})</option>`).join('');
      if (ownEmployeeId) employeeSelect.value = String(ownEmployeeId);
    } else if (ownEmployeeId) {
      employeeSelect.innerHTML = `<option value="${ownEmployeeId}">Myself</option>`;
    } else {
      employeeSelect.innerHTML = '<option value="">No employees available</option>';
    }

    const typesRes = await HrpApi.get('/leaves/types');
    $('hrp-leave-type').innerHTML = '<option value="">Select leave type</option>'
      + typesRes.data.map((t) => `<option value="${t.id}">${HrpUtils.escapeHtml(t.name)}</option>`).join('');

    const today = localToday();
    $('hrp-leave-start').value = today;
    $('hrp-leave-end').value = today;
    $('hrp-half-day-date').value = today;

    $('hrp-leave-mode').addEventListener('change', toggleLeaveMode);
    $('hrp-leave-start').addEventListener('change', () => {
      if ($('hrp-leave-end').value < $('hrp-leave-start').value) $('hrp-leave-end').value = $('hrp-leave-start').value;
      updateLeaveDays();
    });
    $('hrp-leave-end').addEventListener('change', updateLeaveDays);
    toggleLeaveMode();

    const form = $('hrp-leave-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mode = $('hrp-leave-mode').value;
      const payload = {
        employee_id: Number(employeeSelect.value),
        leave_mode: mode,
        reason: $('hrp-leave-reason').value.trim(),
      };
      if (mode === 'HALF_DAY') {
        payload.date = $('hrp-half-day-date').value;
      } else {
        payload.leave_type_id = Number($('hrp-leave-type').value);
        payload.start_date = $('hrp-leave-start').value;
        payload.end_date = $('hrp-leave-end').value;
        payload.days = Number($('hrp-leave-days').value);
      }
      try {
        const res = await HrpApi.post('/leaves', payload);
        HrpUtils.showToast(res.message);
        // Keep the selected employee and mode; clear the rest for the next application.
        $('hrp-leave-type').value = '';
        $('hrp-leave-reason').value = '';
        $('hrp-leave-start').value = today;
        $('hrp-leave-end').value = today;
        $('hrp-leave-days').value = 1;
        $('hrp-half-day-date').value = today;
        loadLeaveApplications();
      } catch (err) {
        if (err.errors?.length) err.message = err.errors.map((x) => x.message).join(', ');
        HrpUtils.showError(err);
      }
    });
  }

  async function loadRecentSummary(employeeId) {
    if (!employeeId) return;
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const to = today.toISOString().slice(0, 10);
    const res = await HrpApi.get('/attendance/summary', { employee_id: employeeId, from, to });
    const d = res.data;
    document.getElementById('hrp-summary-tiles').innerHTML = `
      <div class="hrp-card hrp-stat-tile"><div class="stat-label">Present Days</div><div class="stat-value">${d.presentDays}</div></div>
      <div class="hrp-card hrp-stat-tile"><div class="stat-label">Absent Days</div><div class="stat-value">${d.absentDays}</div></div>
      <div class="hrp-card hrp-stat-tile"><div class="stat-label">Attendance Rate</div><div class="stat-value">${d.attendanceRate}%</div></div>
      <div class="hrp-card hrp-stat-tile"><div class="stat-label">Punctuality</div><div class="stat-value">${d.punctualityRate}%</div></div>`;
  }

  async function loadLeaveApplications() {
    const res = await HrpApi.get('/leaves');
    const canApprove = HrpAuth.hasRole('ADMIN', 'HR_MANAGER', 'MANAGER');
    document.getElementById('hrp-leave-table').innerHTML = res.data.length
      ? res.data
          .map(
            (l) => `<tr>
        <td>${HrpUtils.escapeHtml(l.employee ? `${l.employee.first_name} ${l.employee.last_name}` : '')}</td>
        <td>${HrpUtils.escapeHtml(l.leaveType?.name || '')}</td>
        <td>${HrpUtils.formatDate(l.start_date)} - ${HrpUtils.formatDate(l.end_date)}</td>
        <td>${l.days}</td>
        <td>${HrpUtils.statusBadge(l.status)}</td>
        <td>${canApprove && l.status === 'PENDING' ? `<button class="btn btn-sm btn-success me-1" data-decide="${l.id}:APPROVED">Approve</button><button class="btn btn-sm btn-outline-danger" data-decide="${l.id}:REJECTED">Reject</button>` : ''}</td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="6" class="text-center text-muted-sm py-3">No leave applications</td></tr>';

    document.querySelectorAll('[data-decide]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const [id, decision] = btn.dataset.decide.split(':');
        try {
          await HrpApi.patch(`/leaves/${id}/decision`, { decision });
          HrpUtils.showToast(`Leave ${decision.toLowerCase()}`);
          loadLeaveApplications();
        } catch (err) { HrpUtils.showError(err); }
      });
    });
  }

  // ----- Daily attendance -----
  /** The API caps pageSize at 100, so walk every page. */
  async function fetchAllPages(path, query = {}) {
    const first = await HrpApi.get(path, { ...query, page: 1, pageSize: 100 });
    const rows = [...first.data];
    for (let page = 2; page <= (first.meta?.totalPages || 1); page += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await HrpApi.get(path, { ...query, page, pageSize: 100 });
      rows.push(...res.data);
    }
    return rows;
  }

  function localToday() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  /** Check In / Check Out are required only for PRESENT and HALF_DAY. */
  function toggleTimeFields() {
    const worked = ['PRESENT', 'HALF_DAY'].includes(document.getElementById('hrp-mark-status').value);
    document.getElementById('hrp-mark-time-fields').hidden = !worked;
    document.getElementById('hrp-mark-check-in').required = worked;
    document.getElementById('hrp-mark-check-out').required = worked;
  }

  async function initDailyPage() {
    const dateInput = document.getElementById('hrp-daily-date');
    const markDateInput = document.getElementById('hrp-mark-date');
    dateInput.value = localToday();
    markDateInput.value = dateInput.value;
    dateInput.addEventListener('change', () => {
      markDateInput.value = dateInput.value;
      loadDaily();
    });

    const statusSelect = document.getElementById('hrp-mark-status');
    statusSelect.addEventListener('change', toggleTimeFields);
    toggleTimeFields();

    const form = document.getElementById('hrp-mark-attendance-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const worked = ['PRESENT', 'HALF_DAY'].includes(statusSelect.value);
      const payload = {
        employee_id: Number(document.getElementById('hrp-mark-employee').value),
        date: markDateInput.value,
        status: statusSelect.value,
      };
      if (worked) {
        payload.shift_id = Number(document.getElementById('hrp-mark-shift').value) || null;
        payload.check_in = document.getElementById('hrp-mark-check-in').value || null;
        payload.check_out = document.getElementById('hrp-mark-check-out').value || null;
      }
      try {
        const res = await HrpApi.post('/attendance/manual', payload);
        HrpUtils.showToast(res.message);
        document.getElementById('hrp-mark-check-in').value = '';
        document.getElementById('hrp-mark-check-out').value = '';
        // Show the day that was just saved.
        dateInput.value = payload.date;
        loadDaily();
      } catch (err) {
        if (err.errors?.length) err.message = err.errors.map((x) => x.message).join(', ');
        HrpUtils.showError(err);
      }
    });

    const [employees, shiftsRes] = await Promise.all([
      fetchAllPages('/employees', { employment_status: 'ACTIVE' }),
      HrpApi.get('/shifts').catch(() => ({ data: [] })),
    ]);
    employees.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
    document.getElementById('hrp-mark-employee').innerHTML = employees.map((e) => `<option value="${e.id}">${HrpUtils.escapeHtml(e.first_name)} ${HrpUtils.escapeHtml(e.last_name)} (${HrpUtils.escapeHtml(e.employee_code)})</option>`).join('');
    document.getElementById('hrp-mark-shift').innerHTML = '<option value="">Employee\'s assigned shift</option>'
      + (shiftsRes.data || []).map((s) => `<option value="${s.id}">${HrpUtils.escapeHtml(s.name)} (${String(s.start_time).slice(0, 5)} - ${String(s.end_time).slice(0, 5)})</option>`).join('');

    loadDaily();
  }

  async function loadDaily() {
    const date = document.getElementById('hrp-daily-date').value;
    const rows = await fetchAllPages('/attendance', { date });
    document.getElementById('hrp-daily-table').innerHTML = rows.length
      ? rows
          .map(
            (a) => `<tr>
        <td>${HrpUtils.escapeHtml(a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : '')}</td>
        <td>${HrpUtils.escapeHtml(a.shift?.name || '-')}</td>
        <td>${a.check_in ? HrpUtils.formatDateTime(a.check_in) : '-'}</td>
        <td>${a.check_out ? HrpUtils.formatDateTime(a.check_out) : '-'}</td>
        <td>${a.late_minutes}</td>
        <td>${a.overtime_minutes}</td>
        <td>${HrpUtils.statusBadge(a.status)}</td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="7" class="text-center text-muted-sm py-3">No records for this date</td></tr>';
  }

  // ----- Monthly attendance -----
  async function initMonthlyPage() {
    const monthInput = document.getElementById('hrp-monthly-month');
    monthInput.value = new Date().toISOString().slice(0, 7);
    monthInput.addEventListener('change', loadMonthly);
    loadMonthly();
  }

  async function loadMonthly() {
    const month = document.getElementById('hrp-monthly-month').value;
    const res = await HrpApi.get('/reports/attendance/monthly', { month });
    const rows = res.data || [];
    document.getElementById('hrp-monthly-table').innerHTML = rows.length
      ? rows
          .map(
            (r) => `<tr>
        <td>${HrpUtils.escapeHtml(r.employee_code)}</td>
        <td>${HrpUtils.escapeHtml(r.name)}</td>
        <td>${r.present_days}</td>
        <td>${r.absent_days}</td>
        <td>${r.leave_days}</td>
        <td>${r.attendance_rate}%</td>
        <td>${r.total_overtime_minutes}</td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="7" class="text-center text-muted-sm py-3">No data for this month</td></tr>';
  }

  return { initIndexPage, initDailyPage, initMonthlyPage };
})();
