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

    document.getElementById('hrp-leave-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await HrpApi.post('/leaves', {
          employee_id: user.employee?.id,
          leave_type_id: Number(document.getElementById('hrp-leave-type').value),
          start_date: document.getElementById('hrp-leave-start').value,
          end_date: document.getElementById('hrp-leave-end').value,
          days: Number(document.getElementById('hrp-leave-days').value) || 1,
          reason: document.getElementById('hrp-leave-reason').value,
        });
        HrpUtils.showToast('Leave application submitted');
        document.getElementById('hrp-leave-form').reset();
        loadLeaveApplications();
      } catch (err) { HrpUtils.showError(err); }
    });

    const leaveTypesRes = await HrpApi.get('/leaves/types');
    document.getElementById('hrp-leave-type').innerHTML = leaveTypesRes.data.map((t) => `<option value="${t.id}">${HrpUtils.escapeHtml(t.name)}</option>`).join('');

    loadLeaveApplications();
    loadRecentSummary(user.employee?.id);
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
  async function initDailyPage() {
    const dateInput = document.getElementById('hrp-daily-date');
    dateInput.value = new Date().toISOString().slice(0, 10);
    dateInput.addEventListener('change', loadDaily);
    document.getElementById('hrp-mark-attendance-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await HrpApi.post('/attendance/manual', {
          employee_id: Number(document.getElementById('hrp-mark-employee').value),
          date: dateInput.value,
          status: document.getElementById('hrp-mark-status').value,
        });
        HrpUtils.showToast('Attendance recorded');
        loadDaily();
      } catch (err) { HrpUtils.showError(err); }
    });

    const employeesRes = await HrpApi.get('/employees', { pageSize: 100 });
    document.getElementById('hrp-mark-employee').innerHTML = employeesRes.data.map((e) => `<option value="${e.id}">${HrpUtils.escapeHtml(e.first_name)} ${HrpUtils.escapeHtml(e.last_name)} (${e.employee_code})</option>`).join('');

    loadDaily();
  }

  async function loadDaily() {
    const date = document.getElementById('hrp-daily-date').value;
    const res = await HrpApi.get('/attendance', { date, pageSize: 100 });
    document.getElementById('hrp-daily-table').innerHTML = res.data.length
      ? res.data
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