/** Small formatting/DOM helpers reused across every page. */
const HrpUtils = (() => {
  function formatCurrency(value) {
    const n = Number(value) || 0;
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function statusBadge(status) {
    if (!status) return '';
    return `<span class="badge badge-status badge-${status}">${status.replace(/_/g, ' ')}</span>`;
  }

  function scoreClass(score) {
    const n = Number(score);
    if (n >= 80) return 'high';
    if (n >= 60) return 'mid';
    return 'low';
  }

  function el(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function debounce(fn, delay = 350) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function showToast(message, variant = 'success') {
    let container = document.getElementById('hrp-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'hrp-toast-container';
      container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:2000;display:flex;flex-direction:column;gap:0.5rem;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `alert alert-${variant} shadow-sm mb-0`;
    toast.style.cssText = 'min-width:260px;';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function showError(error) {
    // eslint-disable-next-line no-console
    console.error(error);
    showToast(error.message || 'Something went wrong', 'danger');
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { formatCurrency, formatDate, formatDateTime, statusBadge, scoreClass, el, qs, debounce, showToast, showError, escapeHtml };
})();
