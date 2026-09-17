const form = document.querySelector('#auditForm');
const statusEl = document.querySelector('#status');
const resultsEl = document.querySelector('#results');
const issuesEl = document.querySelector('#issues');
const categoryEl = document.querySelector('#categoryScores');
const filtersEl = document.querySelector('#filters');
let currentIssues = [];

const label = (key) => ({
  crawlability: 'Crawlability & Indexation',
  onPage: 'On-page SEO',
  content: 'Content & Headings',
  links: 'Internal Linking',
  media: 'Images & Media',
  schema: 'Structured Data',
  performance: 'Performance',
  security: 'Security',
  international: 'International SEO',
  aiSearch: 'AI Search Readiness'
}[key] || key);

function renderIssues(filter = 'all') {
  const items = filter === 'all' ? currentIssues : currentIssues.filter(i => i.severity === filter);
  issuesEl.innerHTML = items.map(i => `
    <article class="issue ${i.severity}">
      <div class="issue-top"><span class="badge">${i.severity}</span><span class="category">${label(i.category)}</span></div>
      <h3>${i.title}</h3>
      <p><b>Evidence:</b> ${escapeHtml(i.evidence || '—')}</p>
      <p><b>Fix:</b> ${escapeHtml(i.recommendation)}</p>
      <code>${i.code}</code>
    </article>`).join('') || '<p class="empty">No issues in this filter.</p>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  resultsEl.classList.add('hidden');
  statusEl.textContent = 'Auditing…';
  try {
    const response = await fetch('/api/audit', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ url: document.querySelector('#url').value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Audit failed');
    statusEl.textContent = `Audited ${data.finalUrl} in ${data.durationMs} ms`;
    document.querySelector('#overall').textContent = data.scores.overall;
    ['critical','high','medium','low'].forEach(s => document.querySelector(`#${s}`).textContent = data.severityCounts[s] || 0);
    categoryEl.innerHTML = Object.entries(data.scores.categories).map(([k,v]) => `<article><span>${label(k)}</span><strong>${v}</strong><small>/100</small></article>`).join('');
    currentIssues = data.issues;
    filtersEl.innerHTML = ['all','critical','high','medium','low'].map(f => `<button class="filter" data-filter="${f}">${f}</button>`).join('');
    filtersEl.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => renderIssues(btn.dataset.filter)));
    renderIssues();
    resultsEl.classList.remove('hidden');
  } catch (error) {
    statusEl.textContent = error.message;
  }
});
