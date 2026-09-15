/** KPI definitions, assignments, measurements, and performance-view logic. */
const HrpKpi = (() => {
  async function initDefinitionsPage() {
    await loadCategories();
    await loadDefinitions();
    document.getElementById('hrp-kpi-def-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await HrpApi.post('/kpi/definitions', {
          code: document.getElementById('hrp-def-code').value.toUpperCase().replace(/\s+/g, '_'),
          name: document.getElementById('hrp-def-name').value,
          category_id: Number(document.getElementById('hrp-def-category').value),
          measurement_unit: document.getElementById('hrp-def-unit').value,
          direction: document.getElementById('hrp-def-direction').value,
          target_value: Number(document.getElementById('hrp-def-target').value),
          weight: Number(document.getElementById('hrp-def-weight').value),
          frequency: document.getElementById('hrp-def-frequency').value,
          data_source: document.getElementById('hrp-def-source').value,
          level: document.getElementById('hrp-def-level').value,
        });
        HrpUtils.showToast('KPI definition created');
        document.getElementById('hrp-kpi-def-form').reset();
        loadDefinitions();
      } catch (err) { HrpUtils.showError(err); }
    });
  }

  async function loadCategories() {
    const res = await HrpApi.get('/kpi/categories');
    document.getElementById('hrp-def-category').innerHTML = res.data.map((c) => `<option value="${c.id}">${HrpUtils.escapeHtml(c.name)}</option>`).join('');
  }

  async function loadDefinitions() {
    const res = await HrpApi.get('/kpi/definitions', { pageSize: 100 });
    document.getElementById('hrp-def-table').innerHTML = res.data
      .map(
        (d) => `<tr>
      <td>${HrpUtils.escapeHtml(d.code)}</td>
      <td>${HrpUtils.escapeHtml(d.name)}</td>
      <td>${HrpUtils.escapeHtml(d.category?.name || '')}</td>
      <td>${d.direction === 'HIGHER_IS_BETTER' ? 'Higher is better' : 'Lower is better'}</td>
      <td>${d.target_value} ${HrpUtils.escapeHtml(d.measurement_unit)}</td>
      <td>${HrpUtils.escapeHtml(d.data_source)}</td>
      <td>${d.is_active ? '<span class="badge badge-status badge-ACTIVE">Active</span>' : '<span class="badge badge-status badge-TERMINATED">Inactive</span>'}</td>
    </tr>`
      )
      .join('');

    // also populate the assignment page's KPI select if present
    const assignSelect = document.getElementById('hrp-assign-kpi');
    if (assignSelect) assignSelect.innerHTML = res.data.filter((d) => d.is_active).map((d) => `<option value="${d.id}">${HrpUtils.escapeHtml(d.name)} (${d.code})</option>`).join('');
  }

  async function initAssignmentsPage() {
    await loadDefinitions();
    const employeesRes = await HrpApi.get('/employees', { pageSize: 100 });
    document.getElementById('hrp-assign-employee').innerHTML = employeesRes.data.map((e) => `<option value="${e.id}">${HrpUtils.escapeHtml(e.first_name)} ${HrpUtils.escapeHtml(e.last_name)}</option>`).join('');

    document.getElementById('hrp-assign-kpi-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await HrpApi.post('/kpi/assignments', {
          kpi_definition_id: Number(document.getElementById('hrp-assign-kpi').value),
          employee_id: Number(document.getElementById('hrp-assign-employee').value),
          weight: document.getElementById('hrp-assign-weight').value ? Number(document.getElementById('hrp-assign-weight').value) : null,
          effective_from: document.getElementById('hrp-assign-date').value,
        });
        HrpUtils.showToast('KPI assigned');
        loadAssignments();
      } catch (err) { HrpUtils.showError(err); }
    });

    loadAssignments();
  }

  async function loadAssignments() {
    const res = await HrpApi.get('/kpi/assignments');
    document.getElementById('hrp-assignment-table').innerHTML = res.data.length
      ? res.data
          .map(
            (a) => `<tr>
        <td>${HrpUtils.escapeHtml(a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : '')}</td>
        <td>${HrpUtils.escapeHtml(a.kpiDefinition?.name || '')}</td>
        <td>${a.weight ?? a.kpiDefinition?.weight ?? '-'}%</td>
        <td>${HrpUtils.formatDate(a.effective_from)}</td>
        <td>${a.is_active ? 'Active' : 'Inactive'}</td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="5" class="text-center text-muted-sm py-3">No assignments</td></tr>';
  }

  async function initMeasurementsPage() {
    await loadAssignmentOptions();
    document.getElementById('hrp-measurement-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await HrpApi.post('/kpi/measurements', {
          kpi_assignment_id: Number(document.getElementById('hrp-meas-assignment').value),
          period_start: document.getElementById('hrp-meas-start').value,
          period_end: document.getElementById('hrp-meas-end').value,
          actual_value: Number(document.getElementById('hrp-meas-actual').value),
        });
        HrpUtils.showToast('Measurement recorded');
        loadMeasurements();
      } catch (err) { HrpUtils.showError(err); }
    });
    loadMeasurements();
  }

  async function loadAssignmentOptions() {
    const res = await HrpApi.get('/kpi/assignments');
    const select = document.getElementById('hrp-meas-assignment');
    select.innerHTML = res.data.map((a) => `<option value="${a.id}">${HrpUtils.escapeHtml(a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : '')} - ${HrpUtils.escapeHtml(a.kpiDefinition?.name || '')}</option>`).join('');
  }

  async function loadMeasurements() {
    const assignmentId = document.getElementById('hrp-meas-assignment')?.value;
    const res = await HrpApi.get('/kpi/measurements', { kpi_assignment_id: assignmentId });
    document.getElementById('hrp-measurement-table').innerHTML = res.data.length
      ? res.data
          .map(
            (m) => `<tr>
        <td>${HrpUtils.formatDate(m.period_start)} - ${HrpUtils.formatDate(m.period_end)}</td>
        <td>${m.actual_value}</td>
        <td>${m.achievement_percentage}%</td>
        <td>${m.weighted_score}</td>
        <td>${HrpUtils.escapeHtml(m.source)}</td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="5" class="text-center text-muted-sm py-3">No measurements yet</td></tr>';
  }

  async function initPerformanceViewPage() {
    const employeesRes = await HrpApi.get('/employees', { pageSize: 100 });
    const select = document.getElementById('hrp-perf-employee');
    select.innerHTML = employeesRes.data.map((e) => `<option value="${e.id}">${HrpUtils.escapeHtml(e.first_name)} ${HrpUtils.escapeHtml(e.last_name)}</option>`).join('');

    const today = new Date();
    document.getElementById('hrp-perf-start').value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    document.getElementById('hrp-perf-end').value = today.toISOString().slice(0, 10);

    document.getElementById('hrp-perf-filter-form').addEventListener('submit', (e) => { e.preventDefault(); loadPerformanceView(); });
    loadPerformanceView();
  }

  async function loadPerformanceView() {
    const res = await HrpApi.get('/kpi/employee-score', {
      employee_id: document.getElementById('hrp-perf-employee').value,
      period_start: document.getElementById('hrp-perf-start').value,
      period_end: document.getElementById('hrp-perf-end').value,
    });
    const d = res.data;
    document.getElementById('hrp-perf-overall').textContent = `${d.overallKpiScore}%`;
    document.getElementById('hrp-perf-weight-check').innerHTML = d.weightsValid
      ? '<span class="text-success">Weights sum to 100% ✓</span>'
      : `<span class="text-danger">Warning: weights sum to ${d.totalWeight}%, not 100%</span>`;
    document.getElementById('hrp-perf-detail-table').innerHTML = d.details
      .map((k) => `<tr><td>${HrpUtils.escapeHtml(k.kpiName)}</td><td>${HrpUtils.escapeHtml(k.category || '')}</td><td>${k.target}</td><td>${k.actual}</td><td>${k.achievementPercentage}%</td><td>${k.weight}%</td><td>${k.weightedScore}</td></tr>`)
      .join('') || '<tr><td colspan="7" class="text-center text-muted-sm py-3">No KPI data for this period</td></tr>';
  }

  return { initDefinitionsPage, initAssignmentsPage, initMeasurementsPage, loadMeasurements, initPerformanceViewPage };
})();
