/* LaserCraft schedule status workflow enhancement */
(() => {
  const STATUSES = ['NEEDS RECUT','SCHEDULED','IN PROCESS','COMPLETE'];

  function installFilterOption(){
    if (!filter || [...filter.options].some(o => o.value === 'SCHEDULED')) return;
    const option = document.createElement('option');
    option.value = 'SCHEDULED';
    option.textContent = 'SCHEDULED';
    const inProcess = [...filter.options].find(o => o.value === 'IN PROCESS' || o.textContent === 'IN PROCESS');
    filter.insertBefore(option, inProcess || null);
    const active = [...filter.options].find(o => o.value === 'ACTIVE');
    if (active) active.textContent = 'Active (Needs Recut + Scheduled + In Process)';
  }

  function enhanceRows(){
    rows.querySelectorAll('tr').forEach(tr => {
      const actionButton = tr.querySelector('button[data-id]');
      if (!actionButton) return;
      const id = actionButton.dataset.id;
      const job = data.find(v => String(v.id) === String(id));
      if (!job) return;
      const cells = tr.querySelectorAll('td');
      if (cells.length < 10) return;

      const statusCell = cells[8];
      if (!statusCell.querySelector('select[data-status-id]')) {
        statusCell.classList.remove('badge');
        statusCell.innerHTML = `<select data-status-id="${esc(job.id)}" aria-label="Status for job ${esc(job.job)}">${STATUSES.map(s => `<option value="${s}"${job.status===s?' selected':''}>${s}</option>`).join('')}</select>${job.status==='COMPLETE' && job.completedDate ? `<div class="small">Completed ${esc(job.completedDate)}</div>` : ''}`;
      }

      const actionCell = cells[9];
      actionCell.querySelectorAll('button[data-a="start"],button[data-a="done"]').forEach(b => b.remove());
      if (!actionCell.querySelector('button[data-a="complete"]')) {
        const complete = document.createElement('button');
        complete.dataset.a = 'complete';
        complete.dataset.id = job.id;
        complete.textContent = job.status === 'COMPLETE' ? 'Reopen' : 'Complete';
        actionCell.prepend(complete);
      }
    });
  }

  const originalRender = render;
  render = function(){ originalRender(); installFilterOption(); enhanceRows(); };

  rows.addEventListener('change', async e => {
    const select = e.target.closest('select[data-status-id]');
    if (!select) return;
    const job = data.find(v => String(v.id) === String(select.dataset.statusId));
    if (!job) return;
    const previous = job.status;
    const next = select.value;
    select.disabled = true;
    try {
      await patchJob(job.id, {status: next, completed_date: next === 'COMPLETE' ? day() : null});
      await loadData(true);
    } catch(err) {
      select.value = previous;
      select.disabled = false;
      cloudState('Cloud update failed', false);
      alert('The status could not be updated.');
      console.error(err);
    }
  });

  rows.addEventListener('click', async e => {
    const button = e.target.closest('button[data-a="complete"]');
    if (!button) return;
    e.stopImmediatePropagation();
    const job = data.find(v => String(v.id) === String(button.dataset.id));
    if (!job) return;
    const next = job.status === 'COMPLETE' ? 'NEEDS RECUT' : 'COMPLETE';
    button.disabled = true;
    try {
      await patchJob(job.id, {status: next, completed_date: next === 'COMPLETE' ? day() : null});
      await loadData(true);
    } catch(err) {
      button.disabled = false;
      cloudState('Cloud update failed', false);
      alert('The shared schedule could not be updated.');
      console.error(err);
    }
  }, true);

  installFilterOption();
  if (data.length) render();
})();
