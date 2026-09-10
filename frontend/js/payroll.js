/** Payroll periods, processing, details, and payslip page logic. */
const HrpPayroll = (() => {
  async function initPeriodsPage() {
    await loadPeriods();
    document.getElementById('hrp-period-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const name = document.getElementById('hrp-period-name').value;
        await HrpApi.post('/payroll/periods', {
          name,
          start_date: document.getElementById('hrp-period-start').value,
          end_date: document.getElementById('hrp-period-end').value,
        });
        HrpUtils.showToast('Payroll period created');
        document.getElementById('hrp-period-form').reset();
        loadPeriods();
      } catch (err) { HrpUtils.showError(err); }
    });
  }

  async function loadPeriods() {
    const res = await HrpApi.get('/payroll/periods');
    document.getElementById('hrp-period-table').innerHTML = res.data
      .map(
        (p) => `<tr>
      <td>${HrpUtils.escapeHtml(p.name)}</td>
      <td>${HrpUtils.formatDate(p.start_date)} - ${HrpUtils.formatDate(p.end_date)}</td>
      <td>${HrpUtils.statusBadge(p.status)}</td>
      <td><a class="btn btn-sm btn-outline-primary" href="details.html?period_id=${p.id}">View Payrolls</a> <a class="btn btn-sm btn-primary" href="process.html?period_id=${p.id}">Process</a></td>
    </tr>`
      )
      .join('');
  }

  async function initProcessPage() {
    const periodId = HrpUtils.qs('period_id');
    if (periodId) document.getElementById('hrp-process-period').value = periodId;
    const periodsRes = await HrpApi.get('/payroll/periods');
    document.getElementById('hrp-process-period').innerHTML = periodsRes.data.map((p) => `<option value="${p.id}" ${String(p.id) === periodId ? 'selected' : ''}>${HrpUtils.escapeHtml(p.name)}</option>`).join('');

    document.getElementById('hrp-process-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing...';
      try {
        const res = await HrpApi.post('/payroll/process', { payroll_period_id: Number(document.getElementById('hrp-process-period').value) });
        HrpUtils.showToast(`Processed payroll for ${res.data.length} employee(s)`);
        window.location.href = `details.html?period_id=${document.getElementById('hrp-process-period').value}`;
      } catch (err) {
        HrpUtils.showError(err);
        btn.disabled = false;
        btn.textContent = 'Process Payroll';
      }
    });
  }

  async function initDetailsPage() {
    const periodId = HrpUtils.qs('period_id');
    const res = await HrpApi.get('/payroll', { payroll_period_id: periodId, pageSize: 100 });
    document.getElementById('hrp-payroll-table').innerHTML = res.data.length
      ? res.data
          .map(
            (p) => `<tr>
        <td>${HrpUtils.escapeHtml(p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : '')}</td>
        <td>${HrpUtils.formatCurrency(p.gross_earnings)}</td>
        <td>${HrpUtils.formatCurrency(p.total_deductions)}</td>
        <td>${HrpUtils.formatCurrency(p.net_salary)}</td>
        <td>${HrpUtils.statusBadge(p.status)}</td>
        <td class="hrp-row-actions">
          <a class="btn btn-outline-secondary" href="payslip.html?id=${p.id}"><i class="bi bi-receipt"></i></a>
          ${p.status === 'CALCULATED' ? `<button class="btn btn-outline-primary" data-action="review:${p.id}">Review</button>` : ''}
          ${p.status === 'REVIEWED' ? `<button class="btn btn-outline-success" data-action="approve:${p.id}">Approve</button>` : ''}
          ${p.status === 'APPROVED' ? `<button class="btn btn-success" data-action="pay:${p.id}">Mark Paid</button>` : ''}
        </td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="6" class="text-center text-muted-sm py-3">No payrolls processed for this period yet</td></tr>';

    document.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const [action, id] = btn.dataset.action.split(':');
        const endpointMap = { review: 'review', approve: 'approve', pay: 'mark-paid' };
        try {
          await HrpApi.patch(`/payroll/${id}/${endpointMap[action]}`);
          HrpUtils.showToast('Payroll updated');
          initDetailsPage();
        } catch (err) { HrpUtils.showError(err); }
      });
    });
  }

  async function initPayslipPage() {
    const id = HrpUtils.qs('id');
    const res = await HrpApi.get(`/payroll/${id}`);
    const p = res.data;
    document.getElementById('hrp-payslip-employee').textContent = p.employee ? `${p.employee.first_name} ${p.employee.last_name} (${p.employee.employee_code})` : '';
    document.getElementById('hrp-payslip-period').textContent = p.period?.name || '';
    document.getElementById('hrp-payslip-status').innerHTML = HrpUtils.statusBadge(p.status);
    document.getElementById('hrp-payslip-net').textContent = HrpUtils.formatCurrency(p.net_salary);

    const earnings = p.items.filter((i) => i.type === 'EARNING');
    const deductions = p.items.filter((i) => i.type === 'DEDUCTION');
    document.getElementById('hrp-payslip-earnings').innerHTML = earnings.map((i) => `<tr><td>${HrpUtils.escapeHtml(i.component_name)}</td><td class="text-end">${HrpUtils.formatCurrency(i.amount)}</td></tr>`).join('');
    document.getElementById('hrp-payslip-deductions').innerHTML = deductions.map((i) => `<tr><td>${HrpUtils.escapeHtml(i.component_name)}</td><td class="text-end">${HrpUtils.formatCurrency(i.amount)}</td></tr>`).join('');
    document.getElementById('hrp-payslip-gross').textContent = HrpUtils.formatCurrency(p.gross_earnings);
    document.getElementById('hrp-payslip-total-deductions').textContent = HrpUtils.formatCurrency(p.total_deductions);
  }

  async function initMyPayslipsPage() {
    const res = await HrpApi.get('/payroll/my-payslips');
    document.getElementById('hrp-my-payslips-table').innerHTML = res.data.length
      ? res.data.map((p) => `<tr><td>${HrpUtils.escapeHtml(p.period?.name || '')}</td><td>${HrpUtils.formatCurrency(p.net_salary)}</td><td>${HrpUtils.statusBadge(p.status)}</td><td><a class="btn btn-sm btn-outline-primary" href="payslip.html?id=${p.id}">View</a></td></tr>`).join('')
      : '<tr><td colspan="4" class="text-center text-muted-sm py-3">No payslips yet</td></tr>';
  }

  return { initPeriodsPage, initProcessPage, initDetailsPage, initPayslipPage, initMyPayslipsPage };
})();