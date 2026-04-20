// js/comparison.js
// Member 04 - Comparison page logic.
// New UI with job dropdown + all validations + PDF export.

let currentJobId        = null;
let selectedIds         = [];
let currentSession      = null;
let prefillCandidateIds = [];
let lastCandidates      = [];
let lastTradeoffs       = [];
let lastRecommendation  = "";
let lastContext         = {};
let lastJobTitle        = "";

const THEME = {
    textPrimary:   '#1f2937',
    textSecondary: '#374151',
    textMuted:     '#6b7280',
    textDim:       '#9ca3af',
    borderColor:   '#d1d5db',
    bgSecondary:   '#ffffff',
    bgInput:       '#f3f4f6',
    radiusSm:      '6px',
    radiusMd:      '10px'
};

// ============================================================
// INLINE MESSAGE HELPER
// ============================================================
function setInlineMsg(id, message, isError) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('error', !!isError);
}

// ============================================================
// LOAD JOBS INTO DROPDOWN ON PAGE LOAD
// ============================================================
async function loadJobsDropdown() {
    try {
        const res  = await fetch("/api/jobs");
        const jobs = await res.json();
        const select = document.getElementById("jobSelect");

        if (!jobs || jobs.length === 0) {
            select.innerHTML = '<option value="">No jobs available</option>';
            document.getElementById("noJobsWarning").style.display = "flex";
            return;
        }

        select.innerHTML = '<option value="">-- Select a job --</option>';
        jobs.forEach(job => {
            const opt = document.createElement("option");
            opt.value = job.jobId;
            opt.textContent = `${job.title} (ID: ${job.jobId})`;
            select.appendChild(opt);
        });

        const params   = new URLSearchParams(window.location.search);
        const urlJobId = params.get("jobId");
        const prefill  = params.get("prefill");

        if (prefill) {
            prefillCandidateIds = prefill
                .split(',')
                .map(x => parseInt(x.trim(), 10))
                .filter(x => Number.isInteger(x));
        }

        if (urlJobId) {
            select.value = urlJobId;
            await loadCandidates();
        }
    } catch (e) {
        document.getElementById("jobSelect").innerHTML =
            '<option value="">Failed to load jobs</option>';
    }
}
loadJobsDropdown();

// ============================================================
// LOAD CANDIDATES — with validation
// ============================================================
async function loadCandidates() {
    const jobId = document.getElementById("jobSelect").value;
    setInlineMsg('jobInlineMsg', '');

    // Validation 1: Job must be selected
    if (!jobId) {
        setInlineMsg('jobInlineMsg', 'Please select a job first.', true);
        document.getElementById('jobSelect').focus();
        return;
    }

    currentJobId   = parseInt(jobId);
    selectedIds    = [];
    currentSession = null;
    lastCandidates = [];
    lastRecommendation = "";

    // Hide export button on reload
    const exportBtn = document.getElementById("exportPdfBtn");
    if (exportBtn) exportBtn.classList.add("hidden");

    // Hide downstream cards
    ["comparisonCard","tradeoffCard","recommendCard","historyCard"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });

    // Get job title for PDF
    try {
        const jobRes  = await fetch(`/api/jobs/${jobId}`);
        const jobData = await jobRes.json();
        lastJobTitle  = jobData.title || jobData.jobTitle || `Job #${jobId}`;
    } catch(e) {
        lastJobTitle = `Job #${jobId}`;
    }

    try {
        const res  = await fetch(`/api/comparison/candidates?jobId=${jobId}`);
        const data = await res.json();

        // Validation 2: Server error
        if (!res.ok) {
            setInlineMsg('jobInlineMsg', data.error || `Failed to load candidates for Job ID ${jobId}.`, true);
            return;
        }

        // Validation 3: No scored candidates
        if (!data || data.length === 0) {
            setInlineMsg('jobInlineMsg', 'No scored candidates found. Score candidates first on the Rankings page.', true);
            document.getElementById("selectionCard").classList.add("hidden");
            return;
        }

        renderCandidateList(data);
        document.getElementById("selectionCard").classList.remove("hidden");
        document.getElementById('compareBtn').disabled = true;
        setInlineMsg('selectionInlineMsg', 'Pick at least 2 candidates to compare.');

        if (prefillCandidateIds.length) {
            prefillCandidateIds.slice(0, 3).forEach(id => {
                const card = document.getElementById(`item-${id}`);
                if (card) toggleCandidate(id, card);
            });
            prefillCandidateIds = [];
        }

        loadHistory(jobId);

    } catch (e) {
        setInlineMsg('jobInlineMsg', 'Could not connect to server. Please make sure the application is running.', true);
    }
}

// ============================================================
// RENDER CANDIDATE LIST
// ============================================================
function renderCandidateList(candidates) {
    // Validation 4: Only 1 candidate available
    const warningMsg = candidates.length === 1
        ? `<p style="color:var(--accent-orange);font-size:13px;margin-bottom:10px;">
             ⚠️ Only 1 candidate found. You need at least 2 to use comparison.
           </p>`
        : "";

    document.getElementById("candidateList").innerHTML = warningMsg + candidates.map(c => `
        <div class="candidate-item" id="item-${c.candidateId}"
             onclick="toggleCandidate(${c.candidateId}, this)">
            <input type="checkbox" id="chk-${c.candidateId}" onclick="event.stopPropagation()">
            <div class="candidate-info">
                <div class="name">${c.fullName || "Candidate #" + c.candidateId}</div>
                <div class="email">${c.email || ""}</div>
            </div>
            <span class="score-badge">${c.totalScore}/100</span>
        </div>`).join("");
}

// ============================================================
// TOGGLE CANDIDATE SELECTION — with validation
// ============================================================
function toggleCandidate(candidateId, el) {
    const chk = document.getElementById(`chk-${candidateId}`);
    const idx  = selectedIds.indexOf(candidateId);

    if (idx === -1) {
        // Validation 5: Maximum 3 candidates
        if (selectedIds.length >= 3) {
            setInlineMsg('selectionInlineMsg', 'You can compare a maximum of 3 candidates.', true);
            return;
        }
        selectedIds.push(candidateId);
        chk.checked = true;
        el.classList.add("selected");
    } else {
        selectedIds.splice(idx, 1);
        chk.checked = false;
        el.classList.remove("selected");
    }

    const count = selectedIds.length;
    document.getElementById("compareBtn").disabled = count < 2;

    if (count === 0) {
        setInlineMsg('selectionInlineMsg', 'Pick at least 2 candidates to compare.');
    } else if (count === 1) {
        setInlineMsg('selectionInlineMsg', 'Select 1 more candidate to enable comparison.');
    } else if (count === 3) {
        setInlineMsg('selectionInlineMsg', '3 candidates selected (maximum).', false);
    } else {
        setInlineMsg('selectionInlineMsg', 'Ready to compare. You can also select one more.', false);
    }
}

// ============================================================
// RUN COMPARISON — with validation
// ============================================================
async function runComparison() {
    // Validation 6: No job selected
    if (!currentJobId) {
        setInlineMsg('jobInlineMsg', 'Please select and load a job first.', true);
        return;
    }

    // Validation 7: Need 2-3 candidates
    if (selectedIds.length < 2) {
        setInlineMsg('selectionInlineMsg', 'Please select at least 2 candidates to compare.', true);
        return;
    }
    if (selectedIds.length > 3) {
        setInlineMsg('selectionInlineMsg', 'Please select a maximum of 3 candidates.', true);
        return;
    }

    const btn = document.getElementById("compareBtn");
    btn.classList.add("loading");

    // Hide export button when starting new comparison
    const exportBtn = document.getElementById("exportPdfBtn");
    if (exportBtn) exportBtn.classList.add("hidden");
    lastRecommendation = "";

    try {
        const res  = await fetch("/api/comparison/compare", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: currentJobId, candidateIds: selectedIds })
        });
        const data = await res.json();

        // Validation 8: API error
        if (!res.ok || !data.success) {
            setInlineMsg('selectionInlineMsg', data.error || "Comparison failed. Please try again.", true);
            return;
        }

        currentSession = data.session_id;
        lastCandidates = data.candidates;
        lastTradeoffs  = data.tradeoffs;

        renderComparisonTable(data.candidates);
        renderTradeoffs(data.tradeoffs);

        ["comparisonCard","tradeoffCard","recommendCard"].forEach(id =>
            document.getElementById(id).classList.remove("hidden"));

        setInlineMsg('recommendInlineMsg', 'Comparison ready. Fill in context and generate recommendation.');
        document.getElementById("comparisonCard").scrollIntoView({ behavior:"smooth" });

    } catch (e) {
        setInlineMsg('selectionInlineMsg', 'Could not connect to server. Please check your connection.', true);
    } finally {
        btn.classList.remove("loading");
        btn.disabled = selectedIds.length < 2;
    }
}

// ============================================================
// FIELD HELPER — supports both camelCase and snake_case
// ============================================================
function f(c, camel, snake) {
    return c[camel] !== undefined && c[camel] !== null ? c[camel] : c[snake];
}

// ============================================================
// RENDER COMPARISON TABLE
// ============================================================
function renderComparisonTable(candidates) {
    const table = document.getElementById("comparisonTable");
    table.innerHTML = `<tr><th>Category</th>${candidates.map(c =>
        `<th>${f(c,"fullName","full_name") || "Candidate #" + c.candidateId}<br>
         <small style="font-weight:400;color:${THEME.textMuted}">${c.email||""}</small></th>`
    ).join("")}</tr>`;

    function addRow(label, cells) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${label}</td>${cells.map(cell => `<td>${cell}</td>`).join("")}`;
        table.appendChild(tr);
    }

    addRow("Total Score",      candidates.map(c => `<div class="total-score-cell">${f(c,"totalScore","total_score")}/100</div>`));
    addRow("Skills Score",     candidates.map(c => scoreBar(f(c,"skillsScore","skills_score"),     f(c,"skillsWeight","skills_weight"))));
    addRow("Experience Score", candidates.map(c => scoreBar(f(c,"experienceScore","experience_score"), f(c,"experienceWeight","experience_weight"))));
    addRow("Education Score",  candidates.map(c => scoreBar(f(c,"educationScore","education_score"),  f(c,"educationWeight","education_weight"))));
    addRow("Extras Score",     candidates.map(c => scoreBar(f(c,"extrasScore","extras_score"),     f(c,"extrasWeight","extras_weight"))));

    addRow("Matched Skills", candidates.map(c => {
        const s = f(c,"matchedSkills","matched_skills") || [];
        return s.length
            ? s.map(x => `<span class="skill-tag skill-matched">✓ ${x}</span>`).join("")
            : `<span style="color:${THEME.textDim}">None</span>`;
    }));

    addRow("Missing Skills", candidates.map(c => {
        const s = f(c,"missingSkills","missing_skills") || [];
        if (!s.length) return `<span style="color:${THEME.textDim}">None</span>`;
        const shown = s.slice(0,5).map(x => `<span class="skill-tag skill-missing">✗ ${x}</span>`).join("");
        return shown + (s.length > 5 ? `<span class="skill-tag skill-missing">+${s.length-5} more</span>` : "");
    }));

    addRow("Background", candidates.map(c => {
        const t = f(c,"companyType","company_type") || "unknown";
        const cls = t==="startup"?"badge-orange":t==="corporate"?"badge-blue":"badge-grey";
        return `<span class="badge ${cls}">${t}</span>`;
    }));
    addRow("Leadership",    candidates.map(c => f(c,"hasLeadership","has_leadership") ? `<span class="badge badge-green">✓ Yes</span>` : `<span class="badge badge-grey">✗ No</span>`));
    addRow("Industry",      candidates.map(c => `<span class="badge badge-blue">${c.industry||"other"}</span>`));
    addRow("Notice Period", candidates.map(c => `<span style="font-size:12px;color:${THEME.textMuted}">${f(c,"noticePeriod","notice_period")||"not mentioned"}</span>`));
    addRow("AI Summary",    candidates.map(c => `<span style="font-size:12px;color:${THEME.textMuted};display:block;text-align:left;line-height:1.5">${f(c,"aiSummary","ai_summary")||""}</span>`));
}

function scoreBar(score, weight) {
    const pct = weight > 0 ? Math.round((score/weight)*100) : 0;
    return `<div class="score-bar-wrap">
        <div class="score-bar"><div class="score-bar-fill" style="width:${pct}%"></div></div>
        <span class="score-num">${score}/${weight}</span>
    </div>`;
}

// ============================================================
// RENDER TRADE-OFFS
// ============================================================
function renderTradeoffs(tradeoffs) {
    const container = document.getElementById("tradeoffContainer");
    if (!tradeoffs || !tradeoffs.length) {
        container.innerHTML = `<p style="color:${THEME.textMuted}">No significant trade-offs detected.</p>`;
        return;
    }
    container.innerHTML = tradeoffs.map(t => `
        <div class="tradeoff-item">
            <div class="tradeoff-type">⚖️ ${t.type}</div>
            <div class="tradeoff-desc">${t.description}</div>
            <div class="tradeoff-impl">💡 ${t.implication}</div>
        </div>`).join("");
}

// ============================================================
// GENERATE RECOMMENDATION — with validation
// ============================================================
async function generateRecommendation() {
    // Validation 9: Must have run comparison first
    if (!currentSession || lastCandidates.length === 0) {
        setInlineMsg('recommendInlineMsg', 'Please select candidates and run comparison first.', true);
        return;
    }

    const roleType = document.querySelector('input[name="roleType"]:checked')?.value;
    const culture  = document.querySelector('input[name="culture"]:checked')?.value;
    const priority = document.querySelector('input[name="priority"]:checked')?.value;

    // Validation 10: All three context fields required
    if (!roleType) {
        setInlineMsg('recommendInlineMsg', 'Please select a Role Type before generating.', true);
        return;
    }
    if (!culture) {
        setInlineMsg('recommendInlineMsg', 'Please select a Company Culture before generating.', true);
        return;
    }
    if (!priority) {
        setInlineMsg('recommendInlineMsg', 'Please select a Top Priority before generating.', true);
        return;
    }

    setInlineMsg('recommendInlineMsg', '');

    const btn    = document.getElementById("recommendBtn");
    const output = document.getElementById("recommendationOutput");
    const exportBtn = document.getElementById("exportPdfBtn");

    btn.classList.add("loading");
    if (exportBtn) exportBtn.classList.add("hidden");

    output.innerHTML = `<p style="color:${THEME.textMuted};font-size:13px;">
        <i class="bx bx-loader-alt bx-spin"></i> Asking AI for recommendation...
    </p>`;

    try {
        const res  = await fetch("/api/comparison/recommend", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jobId:          currentJobId,
                candidateIds:   selectedIds,
                sessionId:      currentSession,
                roleType:       roleType,
                companyCulture: culture,
                topPriority:    priority
            })
        });
        const data = await res.json();

        // Validation 11: API error
        if (!res.ok || !data.success) {
            output.innerHTML = `<p style="color:var(--accent-red);font-size:13px;">
                <i class='bx bx-error-circle'></i> ${data.error || "Recommendation failed."}
            </p>`;
            setInlineMsg('recommendInlineMsg', 'Try again or check your connection.', true);
            return;
        }

        const formatted = data.recommendation
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br>");

        output.innerHTML = `
            <div class="recommendation-box">
                <h3>🎯 AI Recommendation</h3>
                <div>${formatted}</div>
                ${data.fallback ? `<p style="color:${THEME.textDim};font-size:11px;margin-top:12px">
                    * Generated using rule-based logic (AI unavailable)
                </p>` : ''}
            </div>`;

        // Store for PDF
        lastRecommendation = data.recommendation;
        lastContext = { roleType, companyCulture: culture, topPriority: priority };

        // Show export button
        if (exportBtn) exportBtn.classList.remove("hidden");

        loadHistory(currentJobId);

    } catch (e) {
        output.innerHTML = `<p style="color:var(--accent-red);font-size:13px;">
            <i class='bx bx-error-circle'></i> Could not connect to server.
        </p>`;
    } finally {
        btn.classList.remove("loading");
    }
}

// ============================================================
// LOAD HISTORY
// ============================================================
async function loadHistory(jobId) {
    try {
        const res  = await fetch(`/api/comparison/history?jobId=${jobId}`);
        const data = await res.json();
        if (!res.ok || !data.length) return;

        const card = document.getElementById("historyCard");
        if (!card) return;
        card.classList.remove("hidden");

        document.getElementById("historyList").innerHTML = data.map(s => `
            <div style="padding:14px; border:1px solid ${THEME.borderColor}; border-radius:${THEME.radiusMd};
                        margin-bottom:10px; font-size:13px; background:${THEME.bgSecondary};">
                <strong style="color:${THEME.textPrimary}">Session #${s.sessionId}</strong>
                <span style="color:${THEME.textDim}; margin-left:8px;">
                    ${s.createdAt ? s.createdAt.substring(0,16).replace("T"," ") : ""}
                </span>
                <div style="margin-top:6px; color:${THEME.textMuted};">
                    Candidates: ${s.candidateIds} · ${s.roleType||""} · ${s.companyCulture||""} · ${s.topPriority||""}
                </div>
                ${s.recommendation ? `
                <div style="margin-top:8px; color:${THEME.textSecondary}; background:${THEME.bgInput};
                            padding:12px; border-radius:${THEME.radiusSm}; font-size:12px; line-height:1.5;">
                    ${s.recommendation.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").substring(0,300)}...
                </div>` : ""}
            </div>`).join("");
    } catch (e) { /* history is optional */ }
}

// ============================================================
// RADIO BUTTON STYLE HELPER
// ============================================================
function updateRadioStyle(input) {
    const group = input.closest(".radio-group");
    group.querySelectorAll(".radio-option").forEach(opt => opt.classList.remove("selected"));
    input.closest(".radio-option").classList.add("selected");
}

// ============================================================
// PDF EXPORT — with validation
// ============================================================
function exportToPDF() {
    // Validation 12: Need comparison data
    if (!lastCandidates.length) {
        alert("Please run a comparison first before exporting.");
        return;
    }
    // Validation 13: Need recommendation
    if (!lastRecommendation) {
        alert("Please generate an AI recommendation before exporting.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });

    const pageW    = doc.internal.pageSize.getWidth();
    const pageH    = doc.internal.pageSize.getHeight();
    const margin   = 15;
    const colWidth = pageW - margin * 2;
    let   y        = margin;

    const DARK   = [26,  26,  46];
    const BLUE   = [44,  62,  80];
    const ACCENT = [79, 195, 247];
    const LIGHT  = [240, 244, 248];
    const WHITE  = [255, 255, 255];
    const GREY   = [150, 150, 150];

    function checkPage(needed) {
        if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
    }
    function fillRect(x, ry, w, h, color) {
        doc.setFillColor(...color); doc.rect(x, ry, w, h, "F");
    }
    function stripMd(text) { return text.replace(/\*\*(.*?)\*\*/g, "$1"); }

    // SECTION 1 — HEADER
    fillRect(0, 0, pageW, 42, DARK);
    doc.setFontSize(26); doc.setFont("helvetica","bold"); doc.setTextColor(...ACCENT);
    doc.text("HireIQ", margin, 16);
    doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(...WHITE);
    doc.text("Candidate Comparison & Recommendation Report", margin, 23);
    const today = new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"long",year:"numeric"});
    doc.setFontSize(9); doc.setTextColor(...GREY);
    doc.text(today, pageW - margin, 16, {align:"right"});
    y = 48;

    fillRect(margin, y, colWidth, 16, LIGHT);
    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(...BLUE);
    doc.text(`Job ID: ${currentJobId}   |   Position: ${lastJobTitle}`, margin+4, y+7);
    doc.setTextColor(...GREY);
    doc.text(`Role: ${lastContext.roleType||"—"}   |   Culture: ${lastContext.companyCulture||"—"}   |   Priority: ${lastContext.topPriority||"—"}`, margin+4, y+13);
    y += 22;

    // SECTION 2 — AI RECOMMENDATION
    checkPage(20); y += 4;
    fillRect(margin, y, colWidth, 9, BLUE);
    doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(...WHITE);
    doc.text("AI RECOMMENDATION", margin+4, y+6.5);
    y += 13;

    const recLines = lastRecommendation.split("\n");
    recLines.forEach(line => {
        const cleanLine = stripMd(line.trim());
        if (!cleanLine) { y += 3; return; }
        const isBold = line.includes("**") || /^\d+\./.test(cleanLine) || cleanLine.startsWith("*");
        if (isBold) {
            checkPage(10);
            doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(...BLUE);
            doc.splitTextToSize(cleanLine, colWidth).forEach(bl => {
                checkPage(7); doc.text(bl, margin, y); y += 6;
            });
            y += 2;
        } else {
            doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(60,60,60);
            doc.splitTextToSize(cleanLine, colWidth).forEach(wl => {
                checkPage(6); doc.text(wl, margin, y); y += 5.5;
            });
            y += 3;
        }
    });
    y += 6;

    // SECTION 3 — COMPARISON TABLE
    checkPage(20);
    fillRect(margin, y, colWidth, 9, BLUE);
    doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(...WHITE);
    doc.text("DETAILED CANDIDATE COMPARISON", margin+4, y+6.5);
    y += 13;

    const numCandidates = lastCandidates.length;
    const labelW = 38;
    const dataW  = (colWidth - labelW) / numCandidates;

    fillRect(margin, y, labelW, 14, DARK);
    doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(...WHITE);
    doc.text("Category", margin+2, y+9);

    lastCandidates.forEach((c, i) => {
        fillRect(margin + labelW + i*dataW, y, dataW, 14, DARK);
        doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(...ACCENT);
        const name = f(c,"fullName","full_name") || `Candidate ${i+1}`;
        const nameLines = doc.splitTextToSize(name, dataW-4);
        doc.text(nameLines[0], margin+labelW+i*dataW+2, y+6);
        if (nameLines[1]) doc.text(nameLines[1], margin+labelW+i*dataW+2, y+11);
    });
    y += 14;

    const tableRows = [
        { label:"Total Score",    getValue: c=>`${f(c,"totalScore","total_score")}/100`, highlight:true },
        { label:"Skills",         getValue: c=>`${f(c,"skillsScore","skills_score")}/${f(c,"skillsWeight","skills_weight")}` },
        { label:"Experience",     getValue: c=>`${f(c,"experienceScore","experience_score")}/${f(c,"experienceWeight","experience_weight")}` },
        { label:"Education",      getValue: c=>`${f(c,"educationScore","education_score")}/${f(c,"educationWeight","education_weight")}` },
        { label:"Extras",         getValue: c=>`${f(c,"extrasScore","extras_score")}/${f(c,"extrasWeight","extras_weight")}` },
        { label:"Matched Skills", getValue: c=>(f(c,"matchedSkills","matched_skills")||[]).join(", ")||"None", tall:true },
        { label:"Missing Skills", getValue: c=>{ const s=f(c,"missingSkills","missing_skills")||[]; return s.slice(0,8).join(", ")+(s.length>8?"...":"")||"None"; }, tall:true },
        { label:"Background",     getValue: c=>f(c,"companyType","company_type")||"unknown" },
        { label:"Leadership",     getValue: c=>f(c,"hasLeadership","has_leadership")?"Yes":"No" },
        { label:"Industry",       getValue: c=>c.industry||"other" },
        { label:"Notice Period",  getValue: c=>f(c,"noticePeriod","notice_period")||"not mentioned" },
        { label:"AI Summary",     getValue: c=>(f(c,"aiSummary","ai_summary")||"").substring(0,120)+"...", tall:true }
    ];

    tableRows.forEach((row, rowIdx) => {
        let rowH = row.tall ? 20 : 10;
        if (row.tall) {
            lastCandidates.forEach(c => {
                const lines = doc.splitTextToSize(row.getValue(c), dataW-4);
                rowH = Math.max(rowH, lines.length*5+4);
            });
        }
        checkPage(rowH+2);
        const rowBg = rowIdx%2===0 ? WHITE : LIGHT;

        fillRect(margin, y, labelW, rowH, row.highlight?[230,240,255]:rowBg);
        doc.setFontSize(8); doc.setFont("helvetica", row.highlight?"bold":"normal");
        doc.setTextColor(...(row.highlight?BLUE:[80,80,80]));
        doc.text(row.label, margin+2, y+rowH/2+1.5);

        lastCandidates.forEach((c,i) => {
            const cellX = margin+labelW+i*dataW;
            fillRect(cellX, y, dataW, rowH, row.highlight?[230,240,255]:rowBg);
            doc.setDrawColor(220,220,220); doc.rect(cellX, y, dataW, rowH);
            const val   = row.getValue(c);
            const lines = doc.splitTextToSize(val, dataW-4);
            doc.setFontSize(row.highlight?11:8);
            doc.setFont("helvetica", row.highlight?"bold":"normal");
            doc.setTextColor(...(row.highlight?BLUE:[50,50,50]));
            if (row.tall) { lines.forEach((line,li) => { doc.text(line, cellX+2, y+5+li*5); }); }
            else { doc.text(lines[0]||val, cellX+2, y+rowH/2+1.5); }
        });

        doc.setDrawColor(220,220,220); doc.rect(margin, y, labelW, rowH);
        y += rowH;
    });

    // FOOTER
    const totalPages = doc.internal.getNumberOfPages();
    for (let p=1; p<=totalPages; p++) {
        doc.setPage(p);
        fillRect(0, pageH-10, pageW, 10, DARK);
        doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(...GREY);
        doc.text("HireIQ — Confidential Hiring Report", margin, pageH-3.5);
        doc.text(`Page ${p} of ${totalPages}`, pageW-margin, pageH-3.5, {align:"right"});
    }

    const filename = `HireIQ_Comparison_Job${currentJobId}_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
}