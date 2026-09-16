/* LaserCraft schedule status workflow enhancement */
(() => {
  const STATUSES = ['NEEDS RECUT','SCHEDULED','IN PROCESS','COMPLETE'];
  const STATUS_LABELS = {'NEEDS RECUT':'Needs Recut','SCHEDULED':'Needs Scheduling / Scheduled','IN PROCESS':'In Process','COMPLETE':'Complete'};

  function installFilterOption(){
    if (!filter) return;
    if (![...filter.options].some(o => o.value === 'SCHEDULED')) {
      const option = document.createElement('option'); option.value='SCHEDULED'; option.textContent='SCHEDULED';
      const inProcess=[...filter.options].find(o=>o.value==='IN PROCESS'||o.textContent==='IN PROCESS'); filter.insertBefore(option,inProcess||null);
    }
    const active=[...filter.options].find(o=>o.value==='ACTIVE'); if(active) active.textContent='Active (Needs Recut + Scheduled + In Process)';
  }

  function installStatusCards(){
    const cards=document.querySelector('.cards'); if(!cards) return;
    cards.classList.add('status-cards');
    const originals=[...cards.querySelectorAll('.card')];
    originals.forEach(card=>{ card.setAttribute('role','button'); card.tabIndex=0; });
    if(!document.getElementById('scheduledCard')){
      const card=document.createElement('div'); card.className='card'; card.id='scheduledCard'; card.setAttribute('role','button'); card.tabIndex=0;
      card.innerHTML='Needs Scheduling<div class="num" id="scheduledCount">0</div><div class="card-sub">Click to view scheduled jobs</div>';
      const proc=originals.find(c=>c.querySelector('#proc')); cards.insertBefore(card,proc||null);
    }
    const labels=[['open','Needs Recut','Click to view jobs needing recut'],['parts','Parts Waiting','Total pieces still open'],['proc','In Process','Click to view jobs in process'],['done','Completed Today','Click to view completed jobs']];
    labels.forEach(([id,title,sub])=>{const n=document.getElementById(id); if(!n)return; const c=n.closest('.card'); if(c){c.childNodes[0].textContent=title; if(!c.querySelector('.card-sub'))c.insertAdjacentHTML('beforeend',`<div class="card-sub">${sub}</div>`);}});
    updateStatusCards();
  }
  function updateStatusCards(){ const n=document.getElementById('scheduledCount'); if(n)n.textContent=data.filter(r=>r.status==='SCHEDULED').length; }

  function detailValue(label,value,wide=false){return `<div class="detail-field${wide?' wide':''}"><span>${label}</span><strong>${esc(value||'—')}</strong></div>`}
  function openJob(job){
    let modal=document.getElementById('jobDetailModal');
    if(!modal){modal=document.createElement('div');modal.id='jobDetailModal';modal.className='job-modal';document.body.appendChild(modal)}
    modal.innerHTML=`<div class="job-dialog" role="dialog" aria-modal="true" aria-label="Job ${esc(job.job)} details"><div class="job-dialog-head"><div><div class="eyebrow">RECUT JOB</div><h2>Job ${esc(job.job||'—')}</h2></div><button type="button" class="modal-close" aria-label="Close job details">×</button></div><div class="detail-grid">${detailValue('Status',STATUS_LABELS[job.status]||job.status)}${detailValue('Date',job.date)}${detailValue('Part #',job.part)}${detailValue('Customer',job.customer)}${detailValue('Job Qty',job.jobQty)}${detailValue('Bad Qty / Recut Qty',job.badQty)}${detailValue('Person Rejecting',job.rejecting)}${detailValue('Department / Location',job.location)}${detailValue('Description / Problem',job.description,true)}${detailValue('QC Comments',job.qcComments,true)}${detailValue('QC Signature',job.qcSignature)}${job.completedDate?detailValue('Completed Date',job.completedDate):''}</div><div class="modal-actions"><button type="button" data-modal-pdf="${esc(job.id)}" class="dark">Create NCR PDF</button><button type="button" class="modal-close">Close</button></div></div>`;
    modal.classList.add('open'); document.body.classList.add('modal-open'); modal.querySelector('.modal-close').focus();
  }
  function closeJob(){const m=document.getElementById('jobDetailModal');if(m)m.classList.remove('open');document.body.classList.remove('modal-open')}

  function enhanceRows(){
    rows.querySelectorAll('tr').forEach(tr=>{
      const actionButton=tr.querySelector('button[data-id]'); if(!actionButton)return;
      const job=data.find(v=>String(v.id)===String(actionButton.dataset.id)); if(!job)return;
      tr.dataset.jobId=job.id; tr.classList.add('clickable-job'); tr.tabIndex=0; tr.setAttribute('aria-label',`Open job ${job.job} details`);
      const cells=tr.querySelectorAll('td'); if(cells.length<10)return;
      const statusCell=cells[8];
      if(!statusCell.querySelector('select[data-status-id]')){statusCell.classList.remove('badge');statusCell.innerHTML=`<select data-status-id="${esc(job.id)}" aria-label="Status for job ${esc(job.job)}">${STATUSES.map(s=>`<option value="${s}"${job.status===s?' selected':''}>${STATUS_LABELS[s]}</option>`).join('')}</select>${job.status==='COMPLETE'&&job.completedDate?`<div class="small">Completed ${esc(job.completedDate)}</div>`:''}`}
      const actionCell=cells[9]; actionCell.querySelectorAll('button[data-a="start"],button[data-a="done"]').forEach(b=>b.remove());
      if(!actionCell.querySelector('button[data-a="complete"]')){const b=document.createElement('button');b.dataset.a='complete';b.dataset.id=job.id;b.textContent=job.status==='COMPLETE'?'Reopen':'Complete';actionCell.prepend(b)}
    }); updateStatusCards();
  }

  const originalRender=render; render=function(){originalRender();installFilterOption();enhanceRows();};

  rows.addEventListener('change',async e=>{const select=e.target.closest('select[data-status-id]');if(!select)return;const job=data.find(v=>String(v.id)===String(select.dataset.statusId));if(!job)return;const previous=job.status,next=select.value;select.disabled=true;try{await patchJob(job.id,{status:next,completed_date:next==='COMPLETE'?day():null});await loadData(true)}catch(err){select.value=previous;select.disabled=false;cloudState('Cloud update failed',false);alert('The status could not be updated.');console.error(err)}});
  rows.addEventListener('click',async e=>{const button=e.target.closest('button[data-a="complete"]');if(!button)return;e.stopImmediatePropagation();const job=data.find(v=>String(v.id)===String(button.dataset.id));if(!job)return;const next=job.status==='COMPLETE'?'NEEDS RECUT':'COMPLETE';button.disabled=true;try{await patchJob(job.id,{status:next,completed_date:next==='COMPLETE'?day():null});await loadData(true)}catch(err){button.disabled=false;cloudState('Cloud update failed',false);alert('The shared schedule could not be updated.');console.error(err)}},true);
  rows.addEventListener('click',e=>{if(e.target.closest('button,select,a,input'))return;const tr=e.target.closest('tr[data-job-id]');if(!tr)return;const job=data.find(v=>String(v.id)===String(tr.dataset.jobId));if(job)openJob(job)});
  rows.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button,select,input')){const tr=e.target.closest('tr[data-job-id]');if(tr){e.preventDefault();const job=data.find(v=>String(v.id)===String(tr.dataset.jobId));if(job)openJob(job)}}});
  document.addEventListener('click',e=>{if(e.target.classList.contains('modal-close')||e.target.id==='jobDetailModal')closeJob();const pdf=e.target.closest('[data-modal-pdf]');if(pdf){const job=data.find(v=>String(v.id)===String(pdf.dataset.modalPdf));if(job)makePDF(job)}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeJob()});
  document.addEventListener('click',e=>{const card=e.target.closest('.status-cards .card');if(!card)return;if(card.querySelector('#open'))filter.value='NEEDS RECUT';else if(card.id==='scheduledCard')filter.value='SCHEDULED';else if(card.querySelector('#proc'))filter.value='IN PROCESS';else if(card.querySelector('#done'))filter.value='COMPLETE';else return;render();document.querySelector('.tablewrap')?.scrollIntoView({behavior:'smooth',block:'start'})});
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.status-cards .card')){e.preventDefault();e.target.click()}});

  installFilterOption();installStatusCards();if(data.length)render();
})();
