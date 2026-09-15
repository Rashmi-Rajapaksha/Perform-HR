/** Performance evaluations list/review and improvement plans logic. */
const HrpPerformance = (() => {
  async function initEvaluationsPage() {
    await loadPeriods();
    await loadEvaluations();
    document.getElementById('hrp-period-filter').addEventListener('change', loadEvaluations);

    document.getElementById('hrp-generate-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await HrpApi.post('/performance/evaluations/generate', {
          employee_id: Number(document.getElementById('hrp-generate-employee').value),
          evaluation_period_id: Number(document.getElementById('hrp-period-filter').value),
        });
        HrpUtils.showToast('Evaluation generated from KPI data');
        loadEvaluations();
      } catch (err) { HrpUtils.showError(err); }
    });

    const employeesRes = await HrpApi.get('/employees', { pageSize: 100 });
    document.getElementById('hrp-generate-employee').innerHTML = employeesRes.data.map((e) => `<option value="${e.id}">${HrpUtils.escapeHtml(e.first_name)} ${HrpUtils.escapeHtml(e.last_name)}</option>`).join('');
  }

  async function loadPeriods() {
    const res = await HrpApi.get('/performance/periods');
    document.getElementById('hrp-period-filter').innerHTML = res.data.map((p) => `<option value="${p.id}">${HrpUtils.escapeHtml(p.name)}</option>`).join('');
  }

  async function loadEvaluations() {
    const periodId = document.getElementById('hrp-period-filter').value;
    const res = await HrpApi.get('/performance/evaluations', { evaluation_period_id: periodId, pageSize: 100 });
    document.getElementById('hrp-eval-table').innerHTML = res.data.length
      ? res.data
          .map(
            (ev) => `<tr>
        <td>${HrpUtils.escapeHtml(ev.employee ? `${ev.employee.first_name} ${ev.employee.last_name}` : '')}</td>
        <td>${ev.kpi_score}%</td>
        <td>${ev.manager_score ?? '-'}</td>
        <td>${ev.final_score ?? '-'}</td>
        <td>${HrpUtils.escapeHtml(ev.rating?.rating_label || '-')}</td>
        <td>${HrpUtils.statusBadge(ev.status)}</td>
        <td><a class="btn btn-sm btn-outline-primary" href="review.html?id=${ev.id}">Review</a></td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="7" class="text-center text-muted-sm py-3">No evaluations for this period</td></tr>';
  }

  async function initReviewPage() {
    const id = HrpUtils.qs('id');
    const res = await HrpApi.get(`/performance/evaluations/${id}`);
    const ev = res.data;

    document.getElementById('hrp-review-employee').textContent = ev.employee ? `${ev.employee.first_name} ${ev.employee.last_name}` : '';
    document.getElementById('hrp-review-period').textContent = ev.period?.name || '';
    document.getElementById('hrp-review-kpi-score').textContent = `${ev.kpi_score}%`;
    document.getElementById('hrp-review-status').innerHTML = HrpUtils.statusBadge(ev.status);

    document.getElementById('hrp-review-detail-table').innerHTML = ev.details
      .map((d) => `<tr><td>${d.kpi_definition_id}</td><td>${d.target_value}</td><td>${d.actual_value}</td><td>${d.achievement_percentage}%</td><td>${d.weight}%</td><td>${d.weighted_score}</td></tr>`)
      .join('');

    if (ev.manager_score !== null) document.getElementById('hrp-manager-score-input').value = ev.manager_score;
    if (ev.manager_comments) document.getElementById('hrp-manager-comments-input').value = ev.manager_comments;
    if (ev.strengths) document.getElementById('hrp-strengths-input').value = ev.strengths;
    if (ev.weaknesses) document.getElementById('hrp-weaknesses-input').value = ev.weaknesses;

    document.getElementById('hrp-review-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await HrpApi.patch(`/performance/evaluations/${id}/review`, {
          manager_score: Number(document.getElementById('hrp-manager-score-input').value),
          manager_comments: document.getElementById('hrp-manager-comments-input').value,
          strengths: document.getElementById('hrp-strengths-input').value,
          weaknesses: document.getElementById('hrp-weaknesses-input').value,
        });
        HrpUtils.showToast('Evaluation reviewed');
        window.location.reload();
      } catch (err) { HrpUtils.showError(err); }
    });

    document.getElementById('hrp-finalize-btn').addEventListener('click', async () => {
      try {
        await HrpApi.patch(`/performance/evaluations/${id}/finalize`);
        HrpUtils.showToast('Evaluation finalized');
        window.location.reload();
      } catch (err) { HrpUtils.showError(err); }
    });

    document.getElementById('hrp-create-plan-btn').addEventListener('click', async () => {
      const description = prompt('Improvement plan description:');
      if (!description) return;
      const targetDate = prompt('Target date (YYYY-MM-DD):', new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      try {
        await HrpApi.post('/performance/improvement-plans', {
          employee_id: ev.employee_id,
          performance_evaluation_id: ev.id,
          description,
          target_date: targetDate,
        });
        HrpUtils.showToast('Improvement plan created');
      } catch (err) { HrpUtils.showError(err); }
    });
  }

  async function initImprovementPlansPage() {
    const res = await HrpApi.get('/performance/improvement-plans');
    document.getElementById('hrp-plans-table').innerHTML = res.data.length
      ? res.data
          .map(
            (p) => `<tr>
        <td>${HrpUtils.escapeHtml(p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : '')}</td>
        <td>${HrpUtils.escapeHtml(p.description)}</td>
        <td>${HrpUtils.formatDate(p.target_date)}</td>
        <td>${HrpUtils.statusBadge(p.status)}</td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="4" class="text-center text-muted-sm py-3">No improvement plans</td></tr>';
  }

  return { initEvaluationsPage, initReviewPage, initImprovementPlansPage };
})();
