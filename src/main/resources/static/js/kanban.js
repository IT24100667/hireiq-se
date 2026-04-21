// kanban.js
// Kanban pipeline board - direct move on arrow click, Gemini email generation on SCREENED, INTERVIEWED, and OFFERED stages.

const API    = '/api/pipeline';
const STAGES = ['SCREENED', 'INTERVIEWED', 'OFFERED', 'HIRED'];
const THEME  = { accentRed: '#c0392b' };
const AI_EMAIL_URL = '/api/email/generate';

const STAGE_LABELS = {
    SCREENED:    '🔍 Screened',
    INTERVIEWED: '🎤 Interviewed',
    OFFERED:     '📄 Offered',
    HIRED:       '✅ Hired'
};

let currentJobId  = null;
let candidateInfo = {};
let isMoving      = false;

function setInlineMsg(message, isError = false) {
    const el = document.getElementById('kanbanInlineMsg');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('error', !!isError);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function escapeJs(value) {
    return String(value).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}

async function loadJobs() {
    try {
        const res  = await fetch('/api/jobs');
        const jobs = await res.json();
        const sel  = document.getElementById('jobSelect');
        sel.innerHTML = '<option value="">-- Select a job --</option>';
        jobs.forEach(j => {
            const o = document.createElement('option');
            o.value = j.jobId;
            o.textContent = j.title + ' (ID: ' + j.jobId + ')';
            sel.appendChild(o);
        });
    } catch(e) {
        document.getElementById('jobSelect').innerHTML = '<option value="">Failed to load jobs</option>';
    }
}

async function loadBoard() {
    const sel    = document.getElementById('jobSelect');
    currentJobId = parseInt(sel.value, 10);
    setInlineMsg('');
    if (!currentJobId) {
        setInlineMsg('Please select a job first.', true);
        showToast('⚠️ Please select a job first');
        sel.focus();
        return;
    }
    document.getElementById('board').innerHTML =
        '<div class="loading"><i class="bx bx-loader-alt bx-spin" style="font-size:24px;"></i><br>Loading pipeline...</div>';
    candidateInfo = {};
    try {
        const rankRes  = await fetch('/api/rankings?jobId=' + currentJobId);
        const rankings = await rankRes.json();
        rankings.forEach(r => {
            candidateInfo[r.candidateId] = {
                name:     r.fullName  || ('Candidate #' + r.candidateId),
                email:    r.email     || '',
                score:    r.totalScore,
                jobTitle: r.jobTitle  || ''
            };
        });
        await Promise.all(rankings.map(r =>
            fetch(API + '/add', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ candidateId: r.candidateId, jobId: currentJobId })
            }).catch(() => {})
        ));
        await loadCandidateDropdown();
        setInlineMsg('Board loaded.');
    } catch(e) { console.warn('Rankings load failed:', e); }
    try {
        const res   = await fetch(API + '/board/' + currentJobId);
        const board = await res.json();
        renderBoard(board);
    } catch(e) {
        document.getElementById('board').innerHTML =
            '<div style="padding:40px;color:' + THEME.accentRed + ';">Failed to load board: ' + e.message + '</div>';
    }
}

async function loadCandidateDropdown() {
    try {
        const res = await fetch('/api/candidates?jobId=' + currentJobId);
        const candidates = await res.json();
        const sel = document.getElementById('addCandidateSelect');
        sel.innerHTML = '<option value="">-- Select candidate --</option>';
        candidates.forEach(c => {
            const o = document.createElement('option');
            o.value = c.candidateId;
            o.textContent = (c.fullName || 'Unknown') + ' (ID: ' + c.candidateId + ')';
            sel.appendChild(o);
        });
    } catch(e) { console.warn('Candidate dropdown failed:', e); }
}

function renderBoard(board) {
    const container = document.getElementById('board');
    container.innerHTML = '';
    STAGES.forEach(stage => {
        const candidates = board[stage] || [];
        const col = document.createElement('div');
        col.className = 'column col-' + stage;
        col.innerHTML =
            '<div class="column-header">' +
            '<span>' + STAGE_LABELS[stage] + '</span>' +
            '<span class="count-badge">' + candidates.length + '</span>' +
            '</div>' +
            '<div class="cards-container" id="cards-' + stage + '">' +
            (candidates.length === 0 ? '<div class="empty-col">No candidates</div>' : '') +
            '</div>';
        container.appendChild(col);
        candidates.forEach(ps => renderCard(ps, col.querySelector('#cards-' + stage)));
    });
}

function renderCard(ps, container) {
    const info     = candidateInfo[ps.candidateId] || {};
    const name     = info.name     || ('Candidate #' + ps.candidateId);
    const email    = info.email    || '';
    const score    = info.score;
    const jobTitle = info.jobTitle || 'the position';

    const idx           = STAGES.indexOf(ps.stage);
    const safeNameHtml  = escapeHtml(name);
    const safeEmailHtml = escapeHtml(email || ('ID: ' + ps.candidateId));
    const safeNameJs    = escapeJs(name);
    const safeJobJs     = escapeJs(jobTitle);

    const scoreClass = score >= 75 ? 'score-high' : score >= 50 ? 'score-mid' : 'score-low';
    const scoreHtml  = score != null
        ? '<span class="card-score ' + scoreClass + '">Score: ' + score + '/100</span>' : '';
    const since = ps.updatedAt
        ? '<div class="card-since">Updated: ' + new Date(ps.updatedAt).toLocaleDateString() + '</div>' : '';

    let emailBtn = '';
    if (ps.stage === 'SCREENED') {
        emailBtn = '<button class="btn-email btn-email-interview" onclick="openEmailModal(' + ps.candidateId + ',\'' + safeNameJs + '\',\'' + safeJobJs + '\',\'interview\')">📅 Invite to Interview</button>';
    } else if (ps.stage === 'INTERVIEWED') {
        emailBtn = '<button class="btn-email btn-email-rejection" onclick="openEmailModal(' + ps.candidateId + ',\'' + safeNameJs + '\',\'' + safeJobJs + '\',\'rejection\')">❌ Send Rejection</button>';
    } else if (ps.stage === 'OFFERED') {
        emailBtn = '<button class="btn-email btn-email-offer" onclick="openEmailModal(' + ps.candidateId + ',\'' + safeNameJs + '\',\'' + safeJobJs + '\',\'offer\')">✉️ Send Offer</button>';
    }

    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.innerHTML =
        '<div class="card-name" onclick="viewCandidate(' + ps.candidateId + ')">' + safeNameHtml + '</div>' +
        '<div class="card-meta">' + safeEmailHtml + '</div>' +
        scoreHtml + since +
        '<div class="card-actions">' +
        '<button class="btn-arrow btn-prev" title="Move back" ' + (idx === 0 ? 'disabled' : '') +
        ' onclick="moveCandidate(' + ps.candidateId + ',' + ps.jobId + ',\'prev\')">◀</button>' +
        '<span class="stage-label">' + ps.stage + '</span>' +
        '<button class="btn-arrow btn-next" title="Move forward" ' + (idx === STAGES.length - 1 ? 'disabled' : '') +
        ' onclick="moveCandidate(' + ps.candidateId + ',' + ps.jobId + ',\'next\')">▶</button>' +
        '</div>' +
        emailBtn +
        '<button class="btn-remove" onclick="removeCandidate(' + ps.candidateId + ',' + ps.jobId + ',\'' + safeNameJs + '\')">🗑️ Remove</button>';
    container.appendChild(card);
}

async function moveCandidate(candidateId, jobId, direction) {
    if (isMoving) return;
    isMoving = true;
    document.querySelectorAll('.btn-arrow').forEach(b => b.disabled = true);
    try {
        const res = await fetch(API + (direction === 'next' ? '/next' : '/prev'), {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ candidateId, jobId })
        });
        if (!res.ok) { showToast('❌ Failed to move'); setInlineMsg('Failed to move.', true); return; }
        const updated = await res.json();
        showToast('✅ Moved to ' + updated.stage);
        setInlineMsg('Moved to ' + updated.stage + '.');
        await loadBoard();
    } catch(e) {
        showToast('❌ Failed to move');
        setInlineMsg('Failed to move.', true);
    } finally {
        isMoving = false;
    }
}

function openEmailModal(candidateId, candidateName, jobTitle, emailType) {
    document.getElementById('emailModal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'emailModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:9999;';

    const title = emailType === 'interview' ? '📅 Interview Invitation' : emailType === 'rejection' ? '❌ Rejection Email' : '✉️ Job Offer Email';
    const subtitle = (emailType === 'interview' ? 'Interview invite for' : emailType === 'rejection' ? 'Rejection email for' : 'Offer email for') + ' <strong>' + escapeHtml(candidateName) + '</strong>';
    const inputStyle = 'width:100%;background:var(--bg-secondary,#2a2a3e);border:1px solid var(--border-color,#333);border-radius:8px;padding:10px 14px;font-size:0.85rem;color:var(--text-primary,#fff);box-sizing:border-box;font-family:inherit;';
    const labelStyle = 'display:block;font-size:0.72rem;color:var(--text-dim,#888);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px;';

    // For interview stage: show a details form first, then generate
    const detailsForm = emailType === 'interview'
        ? '<div id="emailDetailsForm">' +
        '<label style="' + labelStyle + '">Venue <span style="color:#ff6b6b;">*</span></label>' +
        '<input id="interviewVenue" type="text" placeholder="e.g. Main Office, 3rd Floor" style="' + inputStyle + 'margin-bottom:14px;" />' +
        '<label style="' + labelStyle + '">Date & Time <span style="color:#ff6b6b;">*</span></label>' +
        '<input id="interviewTime" type="text" placeholder="e.g. Friday 25 April at 10:00 AM" style="' + inputStyle + 'margin-bottom:14px;" />' +
        '<label style="' + labelStyle + '">Additional Information <span style="color:var(--text-dim,#888);font-size:0.7rem;text-transform:none;letter-spacing:0;">(optional)</span></label>' +
        '<textarea id="interviewExtra" placeholder="e.g. Please bring a portfolio, dress code is smart casual..." style="' + inputStyle + 'min-height:80px;resize:vertical;line-height:1.5;margin-bottom:6px;"></textarea>' +
        '<div id="detailsError" style="display:none;color:#ff6b6b;font-size:0.82rem;margin-bottom:8px;"></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">' +
        '<button class="btn-secondary" onclick="document.getElementById(\'emailModal\').remove()">Close</button>' +
        '<button style="background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:white;border:none;border-radius:8px;padding:9px 20px;font-size:0.85rem;font-weight:600;cursor:pointer;" onclick="submitInterviewDetails(' + candidateId + ',\'' + escapeHtml(candidateName).replace(/'/g,"\\'") + '\',\'' + escapeHtml(jobTitle).replace(/'/g,"\\'") + '\')">Generate Email →</button>' +
        '</div></div>'
        : '';

    overlay.innerHTML =
        '<div style="background:var(--bg-card,#1e1e2e);border:1px solid var(--border-color,#333);border-radius:14px;padding:28px;max-width:580px;width:92%;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);">' +
        '<h3 style="margin:0 0 6px;font-size:1.1rem;">' + title + '</h3>' +
        '<p style="color:var(--text-secondary,#888);font-size:0.83rem;margin:0 0 20px;">' + subtitle + '</p>' +
        detailsForm +
        '<div id="emailLoading" style="display:none;text-align:center;padding:30px 0;color:var(--text-dim,#666);">' +
        '<i class="bx bx-loader-alt bx-spin" style="font-size:28px;"></i>' +
        '<div style="margin-top:10px;font-size:0.85rem;">Gemini is writing the email...</div>' +
        '</div>' +
        '<div id="emailResult" style="display:none;">' +
        '<div style="font-size:0.72rem;color:var(--text-dim,#888);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px;">Subject</div>' +
        '<div id="emailSubject" style="background:var(--bg-secondary,#2a2a3e);border:1px solid var(--border-color,#333);border-radius:8px;padding:10px 14px;font-size:0.88rem;font-weight:600;color:var(--text-primary,#fff);margin-bottom:14px;"></div>' +
        '<div style="font-size:0.72rem;color:var(--text-dim,#888);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px;">Email Body</div>' +
        '<textarea id="emailBody" style="width:100%;min-height:230px;background:var(--bg-secondary,#2a2a3e);border:1px solid var(--border-color,#333);border-radius:8px;padding:12px 14px;font-size:0.84rem;color:var(--text-primary,#fff);resize:vertical;font-family:inherit;line-height:1.65;box-sizing:border-box;" readonly></textarea>' +
        '<div id="copyConfirm" style="display:none;color:#55efc4;font-size:0.8rem;margin-top:8px;text-align:center;font-weight:600;">✅ Copied to clipboard!</div>' +
        '</div>' +
        '<div id="emailError" style="display:none;color:#ff6b6b;font-size:0.84rem;padding:12px 0;"></div>' +
        '<div id="emailResultActions" style="display:none;display:none;gap:10px;justify-content:flex-end;margin-top:20px;">' +
        '<button class="btn-secondary" onclick="document.getElementById(\'emailModal\').remove()">Close</button>' +
        '<button id="copyEmailBtn" style="background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:white;border:none;border-radius:8px;padding:9px 20px;font-size:0.85rem;font-weight:600;cursor:pointer;" onclick="copyEmail()">📋 Copy Email</button>' +
        '</div>' +
        '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // For rejection/offer, generate immediately (no extra details needed)
    if (emailType !== 'interview') {
        document.getElementById('emailLoading').style.display = 'block';
        generateEmailWithGemini(candidateId, candidateName, jobTitle, emailType, '', '', '');
    }
}

function submitInterviewDetails(candidateId, candidateName, jobTitle) {
    const venue = (document.getElementById('interviewVenue')?.value || '').trim();
    const time  = (document.getElementById('interviewTime')?.value  || '').trim();
    const extra = (document.getElementById('interviewExtra')?.value || '').trim();
    const errEl = document.getElementById('detailsError');

    if (!venue || !time) {
        errEl.textContent = '⚠️ Please fill in Venue and Date & Time.';
        errEl.style.display = 'block';
        return;
    }
    errEl.style.display = 'none';

    // Hide form, show loader
    document.getElementById('emailDetailsForm').style.display = 'none';
    document.getElementById('emailLoading').style.display = 'block';

    generateEmailWithGemini(candidateId, candidateName, jobTitle, 'interview', venue, time, extra);
}

async function generateEmailWithGemini(candidateId, candidateName, jobTitle, emailType, venue, time, extraInfo) {
    try {
        const res = await fetch(AI_EMAIL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                candidateId:   candidateId,
                candidateName: candidateName,
                jobTitle:      jobTitle,
                stage:         emailType,
                venue:         venue     || '',
                time:          time      || '',
                extraInfo:     extraInfo || ''
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to generate email');
        }

        const subject = data.subject || (data.email && data.email.subject) || '(No subject)';
        const body    = data.body    || (data.email && data.email.body)    || '(No body)';

        document.getElementById('emailLoading').style.display  = 'none';
        document.getElementById('emailSubject').textContent    = subject;
        document.getElementById('emailBody').value             = body;
        document.getElementById('emailResult').style.display   = 'block';
        const actionsEl = document.getElementById('emailResultActions');
        actionsEl.style.display = 'flex';

    } catch(e) {
        document.getElementById('emailLoading').style.display = 'none';
        document.getElementById('emailError').style.display   = 'block';
        document.getElementById('emailError').textContent     = '❌ Failed to generate email: ' + e.message;
    }
}

function copyEmail() {
    const subject = document.getElementById('emailSubject').textContent;
    const body    = document.getElementById('emailBody').value;
    navigator.clipboard.writeText('Subject: ' + subject + '\n\n' + body).then(showCopyConfirm).catch(() => {
        document.getElementById('emailBody').select();
        document.execCommand('copy');
        showCopyConfirm();
    });
}

function showCopyConfirm() {
    const el = document.getElementById('copyConfirm');
    if (!el) return;
    el.style.display = 'block';
    setTimeout(() => { if (el) el.style.display = 'none'; }, 2500);
}

async function removeCandidate(candidateId, jobId, candidateName) {
    if (!confirm('Remove ' + candidateName + ' from the pipeline? This cannot be undone.')) return;
    try {
        const res = await fetch(API + '/remove', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateId, jobId })
        });
        if (!res.ok) { showToast('❌ Failed to remove candidate'); return; }
        showToast('🗑️ ' + candidateName + ' removed from pipeline');
        setInlineMsg(candidateName + ' removed from pipeline.');
        await loadBoard();
    } catch(e) {
        showToast('❌ Failed to remove candidate');
        setInlineMsg('Failed to remove candidate.', true);
    }
}

async function addCandidate() {
    const sel = document.getElementById('addCandidateSelect');
    const candidateId = parseInt(sel.value, 10);
    if (!candidateId)  { setInlineMsg('Please select a candidate.', true); showToast('⚠️ Select a candidate first'); return; }
    if (!currentJobId) { setInlineMsg('Please select a job first.', true); showToast('⚠️ Select a job first'); return; }
    try {
        const res = await fetch(API + '/add', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ candidateId, jobId: currentJobId })
        });
        if (!res.ok) { showToast('❌ Failed to add candidate'); return; }
        showToast('✅ Candidate added!');
        sel.value = '';
        toggleAddPanel();
        await loadBoard();
    } catch(e) { showToast('❌ Failed to add candidate'); }
}

function viewCandidate(candidateId) {
    window.location.href = '/candidate?candidateId=' + candidateId + '&jobId=' + currentJobId;
}

function toggleAddPanel() {
    document.getElementById('addPanel').classList.toggle('open');
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

loadJobs();