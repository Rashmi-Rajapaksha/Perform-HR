/** Shift management: list/create shifts, list/create shift assignments. */
const HrpShifts = (() => {
  async function loadShifts() {
    const res = await HrpApi.get('/shifts');
    document.getElementById('hrp-shift-table').innerHTML = res.data
      .map(
        (s) => `<tr>
      <td>${HrpUtils.escapeHtml(s.name)}</td>
      <td>${HrpUtils.escapeHtml(s.code)}</td>
      <td>${s.start_time}</td>
      <td>${s.end_time}</td>
      <td>${s.is_night_shift ? 'Yes' : 'No'}</td>
    </tr>`
      )
      .join('');
    return res.data;
  }

  async function loadAssignments() {
    const res = await HrpApi.get('/shifts/assignments');
    document.getElementById('hrp-assignment-table').innerHTML = res.data.length
      ? res.data
          .map(
            (a) => `<tr>
        <td>${HrpUtils.escapeHtml(a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : '')}</td>
        <td>${HrpUtils.escapeHtml(a.shift?.name || '')}</td>
        <td>${HrpUtils.formatDate(a.effective_date)}</td>
        <td>${a.end_date ? HrpUtils.formatDate(a.end_date) : 'Ongoing'}</td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="4" class="text-center text-muted-sm py-3">No assignments</td></tr>';
  }

  async function init() {
    const shifts = await loadShifts();
    loadAssignments();

    document.getElementById('hrp-shift-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await HrpApi.post('/shifts', {
          name: document.getElementById('hrp-shift-name').value,
          code: document.getElementById('hrp-shift-code').value,
          start_time: document.getElementById('hrp-shift-start').value,
          end_time: document.getElementById('hrp-shift-end').value,
          is_night_shift: document.getElementById('hrp-shift-night').checked,
        });
        HrpUtils.showToast('Shift created');
        document.getElementById('hrp-shift-form').reset();
        loadShifts();
      } catch (err) { HrpUtils.showError(err); }
    });

    const shiftSelect = document.getElementById('hrp-assign-shift');
    shiftSelect.innerHTML = shifts.map((s) => `<option value="${s.id}">${HrpUtils.escapeHtml(s.name)}</option>`).join('');
    const employeesRes = await HrpApi.get('/employees', { pageSize: 100 });
    document.getElementById('hrp-assign-employee').innerHTML = employeesRes.data.map((e) => `<option value="${e.id}">${HrpUtils.escapeHtml(e.first_name)} ${HrpUtils.escapeHtml(e.last_name)}</option>`).join('');

    document.getElementById('hrp-assign-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await HrpApi.post('/shifts/assignments', {
          employee_id: Number(document.getElementById('hrp-assign-employee').value),
          shift_id: Number(document.getElementById('hrp-assign-shift').value),
          effective_date: document.getElementById('hrp-assign-date').value,
        });
        HrpUtils.showToast('Shift assigned');
        loadAssignments();
      } catch (err) { HrpUtils.showError(err); }
    });
  }

  return { init };
})();