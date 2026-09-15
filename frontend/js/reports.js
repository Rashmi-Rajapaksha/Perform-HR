/** Reports hub: renders each report type inline and supports CSV export. */
const HrpReports = (() => {
  const REPORT_DEFS = {
    'employee-master': { label: 'Employee Master', path: '/reports/employees/master', params: [] },
    'department-employee': { label: 'Department Employee Count', path: '/reports/employees/by-department', params: [] },
    'daily-attendance': { label: 'Daily Attendance', path: '/reports/attendance/daily', params: [{ key: 'date', type: 'date', default: () => new Date().toISOString().slice(0, 10) }] },
    'monthly-attendance': { label: 'Monthly Attendance', path: '/reports/attendance/monthly', params: [{ key: 'month', type: 'month', default: () => new Date().toISOString().slice(0, 7) }] },
    'late-attendance': { label: 'Late Attendance', path: '/reports/attendance/late', params: [{ key: 'from', type: 'date' }, { key: 'to', type: 'date' }] },
    absenteeism: { label: 'Absenteeism', path: '/reports/attendance/absenteeism', params: [{ key: 'from', type: 'date' }, { key: 'to', type: 'date' }] },
    overtime: { label: 'Overtime', path: '/reports/attendance/overtime', params: [{ key: 'from', type: 'date' }, { key: 'to', type: 'date' }] },
    'payroll-summary': { label: 'Payroll Summary', path: '/reports/payroll/summary', params: [{ key: 'payroll_period_id', type: 'period' }] },
    'department-payroll': { label: 'Payroll by Department', path: '/reports/payroll/by-department', params: [{ key: 'payroll_period_id', type: 'period' }] },
    'overtime-cost': { label: 'Overtime Cost', path: '/reports/payroll/overtime-cost', params: [{ key: 'payroll_period_id', type: 'period' }] },
    'performance-ranking': { label: 'Performance Ranking', path: '/reports/performance/ranking', params: [{ key: 'evaluation_period_id', type: 'evalperiod' }] },
    'high-low-performers': { label: 'High / Low Performers', path: '/reports/performance/high-low-performers', params: [{ key: 'evaluation_period_id', type: 'evalperiod' }] },
  };

  let payrollPeriods = [];
  let evalPeriods = [];
  let currentReportKey = null;

  function paramInputHtml(param) {
    if (param.type === 'period') {
      return `<select class="form-select form-select-sm" data-param="${param.key}">${payrollPeriods.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}</select>`;
    }
    if (param.type === 'evalperiod') {
      return `<select class="form-select form-select-sm" data-param="${param.key}">${evalPeriods.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}</select>`;
    }
    const defaultVal = param.default ? param.default() : '';
    return `<input type="${param.type}" class="form-control form-control-sm" data-param="${param.key}" value="${defaultVal}">`;
  }

  function selectReport(key) {
    currentReportKey = key;
    const def = REPORT_DEFS[key];
    document.getElementById('hrp-report-title').textContent = def.label;
    document.getElementById('hrp-report-params').innerHTML = def.params
      .map((p) => `<div><label class="form-label text-capitalize">${p.key.replace(/_/g, ' ')}</label>${paramInputHtml(p)}</div>`)
      .join('');
    document.getElementById('hrp-report-results').innerHTML = '<p class="text-muted-sm">Click "Run Report" to view results.</p>';
  }

  function collectParams() {
    const params = {};
    document.querySelectorAll('[data-param]').forEach((el) => { params[el.dataset.param] = el.value; });
    return params;
  }

  async function runReport() {
    if (!currentReportKey) return;
    const def = REPORT_DEFS[currentReportKey];
    const params = collectParams();
    const res = await HrpApi.get(def.path, params);
    const rows = res.data;

    if (currentReportKey === 'high-low-performers') {
      renderTable(document.getElementById('hrp-report-results'), 'High Performers', rows.highPerformers);
      const lowDiv = document.createElement('div');
      document.getElementById('hrp-report-results').appendChild(lowDiv);
      renderTable(lowDiv, 'Low Performers', rows.lowPerformers);
      return;
    }

    renderTable(document.getElementById('hrp-report-results'), null, rows);
  }

  function renderTable(container, heading, rows) {
    if (!rows || rows.length === 0) {
      container.innerHTML = (heading ? `<h6>${heading}</h6>` : '') + '<p class="text-muted-sm">No data found.</p>';
      return;
    }
    const headers = Object.keys(rows[0]);
    const html = `
      ${heading ? `<h6 class="mt-3">${heading}</h6>` : ''}
      <div class="table-responsive">
        <table class="table hrp-table table-sm">
          <thead><tr>${headers.map((h) => `<th>${h.replace(/_/g, ' ')}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${HrpUtils.escapeHtml(r[h])}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`;
    container.innerHTML = html;
  }

  async function exportCsv() {
    if (!currentReportKey) return;
    const def = REPORT_DEFS[currentReportKey];
    const params = collectParams();
    await HrpApi.downloadCsv(def.path, params, `${currentReportKey}.csv`);
  }

  async function init() {
    const [periodsRes, evalPeriodsRes] = await Promise.all([HrpApi.get('/payroll/periods'), HrpApi.get('/performance/periods')]);
    payrollPeriods = periodsRes.data;
    evalPeriods = evalPeriodsRes.data;

    document.getElementById('hrp-report-list').innerHTML = Object.entries(REPORT_DEFS)
      .map(([key, def]) => `<button type="button" class="list-group-item list-group-item-action" data-report="${key}">${def.label}</button>`)
      .join('');

    document.querySelectorAll('[data-report]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-report]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectReport(btn.dataset.report);
      });
    });

    document.getElementById('hrp-run-report-btn').addEventListener('click', () => runReport().catch(HrpUtils.showError));
    document.getElementById('hrp-export-csv-btn').addEventListener('click', () => exportCsv().catch(HrpUtils.showError));

    const firstKey = Object.keys(REPORT_DEFS)[0];
    document.querySelector(`[data-report="${firstKey}"]`).classList.add('active');
    selectReport(firstKey);
  }

  return { init };
})();
