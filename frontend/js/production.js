/** Production records list + entry logic. */
const HrpProduction = (() => {
  async function init() {
    const employeesRes = await HrpApi.get('/employees', { department_id: 1, pageSize: 100 });
    document.getElementById('hrp-prod-employee').innerHTML = employeesRes.data.map((e) => `<option value="${e.id}">${HrpUtils.escapeHtml(e.first_name)} ${HrpUtils.escapeHtml(e.last_name)}</option>`).join('');
    document.getElementById('hrp-prod-date').value = new Date().toISOString().slice(0, 10);

    document.getElementById('hrp-prod-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await HrpApi.post('/production', {
          employee_id: Number(document.getElementById('hrp-prod-employee').value),
          date: document.getElementById('hrp-prod-date').value,
          target_units: Number(document.getElementById('hrp-prod-target').value),
          produced_units: Number(document.getElementById('hrp-prod-produced').value),
          defective_units: Number(document.getElementById('hrp-prod-defective').value) || 0,
          rework_units: Number(document.getElementById('hrp-prod-rework').value) || 0,
          downtime_minutes: Number(document.getElementById('hrp-prod-downtime').value) || 0,
          safety_incidents: Number(document.getElementById('hrp-prod-safety').value) || 0,
        });
        HrpUtils.showToast('Production record saved');
        document.getElementById('hrp-prod-form').reset();
        document.getElementById('hrp-prod-date').value = new Date().toISOString().slice(0, 10);
        loadRecords();
      } catch (err) { HrpUtils.showError(err); }
    });

    document.getElementById('hrp-prod-date-filter').value = new Date().toISOString().slice(0, 10);
    document.getElementById('hrp-prod-date-filter').addEventListener('change', loadRecords);
    loadRecords();
  }

  async function loadRecords() {
    const date = document.getElementById('hrp-prod-date-filter').value;
    const res = await HrpApi.get('/production', { from: date, to: date, pageSize: 100 });
    document.getElementById('hrp-prod-table').innerHTML = res.data.length
      ? res.data
          .map(
            (r) => `<tr>
        <td>${HrpUtils.escapeHtml(r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : '')}</td>
        <td>${r.target_units}</td>
        <td>${r.produced_units}</td>
        <td>${r.defective_units}</td>
        <td>${r.target_units > 0 ? Math.round((r.produced_units / r.target_units) * 10000) / 100 : 0}%</td>
        <td>${r.downtime_minutes}</td>
        <td>${r.safety_incidents}</td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="7" class="text-center text-muted-sm py-3">No production records for this date</td></tr>';
  }

  return { init };
})();
