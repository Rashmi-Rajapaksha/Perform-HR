/**
 * Renders the three dashboard levels (organization / department / employee).
 */
const HrpDashboard = (() => {
  let chartInstances = {};
  let dashboardLoader = null;

  function today() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function dateRangeParams() {
    const selectedDate = document.getElementById('hrp-dashboard-date')?.value || today();
    const startDate = selectedDate;
    const endDate = selectedDate;
    return `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  }

  function chartsAvailable() {
    if (typeof Chart === 'undefined') {
      console.error('Chart.js failed to load. Check your internet connection or CDN access.');
      const canvases = document.querySelectorAll('canvas[id^="hrp-"]');
      canvases.forEach((canvas) => {
        const parent = canvas.parentElement;
        if (parent && !parent.querySelector('.hrp-chart-error')) {
          const msg = document.createElement('div');
          msg.className = 'hrp-chart-error text-muted-sm p-2';
          msg.textContent = 'Chart could not be loaded. Please check the Chart.js library connection.';
          parent.appendChild(msg);
        }
      });
      return false;
    }
    return true;
  }

  function destroyChart(key) {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      delete chartInstances[key];
    }
  }

  function renderAlerts(containerEl, alerts) {
    if (!containerEl) return;
    if (!alerts || alerts.length === 0) {
      containerEl.innerHTML = '<p class="text-muted-sm mb-0">No active alerts. Everything looks healthy.</p>';
      return;
    }
    containerEl.innerHTML = alerts
      .slice(0, 12)
      .map((a) => `<div class="hrp-alert-item severity-${a.severity}"><strong>${a.type.replace(/_/g, ' ')}</strong><br>${HrpUtils.escapeHtml(a.message)}</div>`)
      .join('');
  }

  function renderStatTiles(containerEl, tiles) {
    containerEl.innerHTML = tiles
      .map(
        (t) => `
      <div class="hrp-card hrp-stat-tile">
        <div class="stat-label">${t.label}</div>
        <div class="stat-value">${t.value}</div>
      </div>`
      )
      .join('');
  }

  function renderRankingList(containerEl, items, { scoreKey = 'score', nameKey = 'name' } = {}) {
    if (!items || items.length === 0) {
      containerEl.innerHTML = '<p class="text-muted-sm mb-0">No data available.</p>';
      return;
    }
    containerEl.innerHTML = `<ul class="hrp-ranking-list">${items
      .map(
        (item, idx) => `
      <li>
        <span><span class="rank-badge">${idx + 1}</span>${HrpUtils.escapeHtml(item[nameKey] || `${item.first_name || ''} ${item.last_name || ''}`)}</span>
        <span class="hrp-perf-score ${HrpUtils.scoreClass(item[scoreKey])}">${Number(item[scoreKey] || 0).toFixed(1)}%</span>
      </li>`
      )
      .join('')}</ul>`;
  }

  async function loadOrganizationDashboard() {
    if (!chartsAvailable()) return;
    const res = await HrpApi.get(`/dashboard/organization${dateRangeParams()}`);
    const d = res.data;

    const attendanceTitle = document.getElementById('hrp-attendance-title');
    if (attendanceTitle) {
      attendanceTitle.textContent = `Attendance · ${d.attendanceDate || today()}`;
    }

    renderStatTiles(document.getElementById('hrp-stat-grid'), [
      { label: 'Total Employees', value: d.totalEmployees },
      { label: 'Present Today', value: d.presentEmployees },
      { label: 'Absent Today', value: d.absentEmployees },
      { label: 'Attendance %', value: `${d.attendancePercentage}%` },
      { label: 'Avg KPI Score', value: `${d.averageKpiScore}%` },
      { label: 'Payroll Cost (latest period)', value: HrpUtils.formatCurrency(d.payrollCost) },
    ]);

    renderRankingList(document.getElementById('hrp-top-performers'), d.topPerformers, { scoreKey: 'kpiScore' });
    renderRankingList(document.getElementById('hrp-low-performers'), d.lowPerformers, { scoreKey: 'kpiScore' });
    renderAlerts(document.getElementById('hrp-alert-list'), d.managementAlerts);

    const deptCtx = document.getElementById('hrp-dept-chart');
    if (deptCtx) {
      destroyChart('dept');
      chartInstances.dept = new Chart(deptCtx, {
        type: 'bar',
        data: {
          labels: d.departmentPerformance.map((x) => x.departmentName),
          datasets: [{ label: 'Avg KPI Score (%)', data: d.departmentPerformance.map((x) => x.averageKpiScore), backgroundColor: '#2453ff' }],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 120 } } },
      });
    }

    const trendCtx = document.getElementById('hrp-trend-chart');
    if (trendCtx) {
      destroyChart('trend');
      chartInstances.trend = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: d.performanceTrend.map((x) => x.period),
          datasets: [{ label: 'Avg Final Score', data: d.performanceTrend.map((x) => x.averageScore), borderColor: '#16a34a', tension: 0.3, fill: false }],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 150 } } },
      });
    }

    const attendanceCtx = document.getElementById('hrp-attendance-chart');
    if (attendanceCtx) {
      destroyChart('attendance');
      const other = Math.max(0, d.totalEmployees - d.presentEmployees - d.absentEmployees);
      chartInstances.attendance = new Chart(attendanceCtx, {
        type: 'doughnut',
        data: {
          labels: ['Present', 'Absent', 'Other / Not Recorded'],
          datasets: [{ data: [d.presentEmployees, d.absentEmployees, other], backgroundColor: ['#16a34a', '#dc2626', '#e5e7eb'] }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
        },
      });
    }

    const stamp = document.getElementById('hrp-last-updated');
    if (stamp) stamp.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  }

  async function loadDepartmentDashboard(departmentId) {
    if (!chartsAvailable()) return;
    const res = await HrpApi.get(`/dashboard/department/${departmentId}${dateRangeParams()}`);
    const d = res.data;

    renderStatTiles(document.getElementById('hrp-stat-grid'), [
      { label: 'Employees', value: d.numberOfEmployees },
      { label: 'Avg Attendance', value: `${d.averageAttendanceRate}%` },
      { label: 'Avg KPI Score', value: `${d.averageKpiScore}%` },
      { label: 'Total Overtime (min)', value: d.totalOvertimeMinutes },
    ]);

    document.getElementById('hrp-dept-name').textContent = d.departmentName;
    renderRankingList(document.getElementById('hrp-employee-ranking'), d.employeeRanking, { scoreKey: 'score' });

    const rankingCtx = document.getElementById('hrp-ranking-chart');
    if (rankingCtx) {
      destroyChart('ranking');
      const top = d.employeeRanking.slice(0, 10);
      chartInstances.ranking = new Chart(rankingCtx, {
        type: 'bar',
        data: {
          labels: top.map((r) => r.name),
          datasets: [{ label: 'KPI Score (%)', data: top.map((r) => r.score), backgroundColor: '#2453ff' }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { beginAtZero: true, max: 150 } },
          plugins: { legend: { display: false } },
        },
      });
    }

    const trendCtx = document.getElementById('hrp-dept-trend-chart');
    if (trendCtx) {
      destroyChart('deptTrend');
      chartInstances.deptTrend = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: d.monthlyPerformanceTrend.map((x) => x.period),
          datasets: [{ label: 'Avg Final Score', data: d.monthlyPerformanceTrend.map((x) => x.averageScore), borderColor: '#2453ff', tension: 0.3 }],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 150 } } },
      });
    }

    const shiftCtx = document.getElementById('hrp-shift-chart');
    if (shiftCtx && d.shiftPerformance?.length) {
      destroyChart('shift');
      chartInstances.shift = new Chart(shiftCtx, {
        type: 'bar',
        data: {
          labels: d.shiftPerformance.map((s) => `Shift #${s.shiftId}`),
          datasets: [
            { label: 'Achievement %', data: d.shiftPerformance.map((s) => s.achievementPercentage), backgroundColor: '#2453ff' },
            { label: 'Defect Rate %', data: d.shiftPerformance.map((s) => s.defectRate), backgroundColor: '#dc2626' },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }
  }

  async function loadEmployeeDashboard(employeeId) {
    if (!chartsAvailable()) return;
    const path = `${employeeId ? `/dashboard/employee/${employeeId}` : '/dashboard/employee/me'}${dateRangeParams()}`;
    const res = await HrpApi.get(path);
    const d = res.data;

    document.getElementById('hrp-employee-name').textContent = d.employee.name;
    document.getElementById('hrp-employee-meta').textContent = `${d.employee.employeeCode} · ${d.employee.department || ''} · ${d.employee.designation || ''}`;

    renderStatTiles(document.getElementById('hrp-stat-grid'), [
      { label: 'Attendance Rate', value: `${d.attendance.attendanceRate}%` },
      { label: 'Punctuality', value: `${d.attendance.punctualityRate}%` },
      { label: 'Overall KPI Score', value: `${d.kpi.overallKpiScore}%` },
      { label: 'Performance Score', value: d.overallPerformanceScore ?? '-' },
    ]);

    document.getElementById('hrp-current-shift').textContent = d.currentShift ? `${d.currentShift.name} (${d.currentShift.start} - ${d.currentShift.end})` : 'Not assigned';
    document.getElementById('hrp-performance-rating').textContent = d.performanceRating || 'Not yet rated';
    document.getElementById('hrp-manager-feedback').textContent = d.managerFeedback || 'No feedback recorded yet.';

    const kpiTable = document.getElementById('hrp-kpi-detail-table');
    if (kpiTable) {
      kpiTable.innerHTML = d.kpi.details
        .map(
          (k) => `<tr><td>${HrpUtils.escapeHtml(k.kpiName)}</td><td>${k.target}</td><td>${k.actual}</td><td>${k.achievementPercentage}%</td><td>${k.weight}%</td></tr>`
        )
        .join('') || '<tr><td colspan="5" class="text-center text-muted-sm">No KPIs assigned</td></tr>';
    }

    const kpiCtx = document.getElementById('hrp-kpi-chart');
    if (kpiCtx) {
      destroyChart('kpi');
      const details = d.kpi.details || [];
      chartInstances.kpi = new Chart(kpiCtx, {
        type: 'bar',
        data: {
          labels: details.map((k) => k.kpiName),
          datasets: [
            { label: '100% Target Reference', data: details.map(() => 100), backgroundColor: '#e5e7eb' },
            { label: 'Achievement %', data: details.map((k) => k.achievementPercentage), backgroundColor: '#2453ff' },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, max: 150 } },
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
        },
      });
    }

    const historyCtx = document.getElementById('hrp-history-chart');
    if (historyCtx) {
      destroyChart('history');
      chartInstances.history = new Chart(historyCtx, {
        type: 'line',
        data: {
          labels: d.performanceHistory.map((h) => h.period).reverse(),
          datasets: [{ label: 'Final Score', data: d.performanceHistory.map((h) => h.finalScore).reverse(), borderColor: '#2453ff', tension: 0.3 }],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 150 } } },
      });
    }

    const payslipsBody = document.getElementById('hrp-payslips-table');
    if (payslipsBody) {
      payslipsBody.innerHTML = d.payslips
        .map((p) => `<tr><td>${HrpUtils.escapeHtml(p.period)}</td><td>${HrpUtils.formatCurrency(p.netSalary)}</td><td>${HrpUtils.statusBadge(p.status)}</td></tr>`)
        .join('') || '<tr><td colspan="3" class="text-center text-muted-sm">No payslips yet</td></tr>';
    }
  }

  function startDashboard(loaderFn) {
    dashboardLoader = loaderFn;
    const applyButton = document.getElementById('hrp-dashboard-date-apply');
    if (applyButton && !applyButton.dataset.bound) {
      applyButton.dataset.bound = 'true';
      applyButton.addEventListener('click', () => {
        if (dashboardLoader) dashboardLoader().catch(HrpUtils.showError);
      });
    }
    loaderFn().catch(HrpUtils.showError);
  }

  return { loadOrganizationDashboard, loadDepartmentDashboard, loadEmployeeDashboard, startDashboard };
})();
