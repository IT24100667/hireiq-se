// static/js/candidate-detail.js
// Loads a candidate's full score breakdown and renders it.
// Added: category comparison bars (replaces radar chart) showing candidate vs pool average.

const params      = new URLSearchParams(window.location.search);
const candidateId = params.get("candidateId");
const jobId       = params.get("jobId");

const STORAGE_KEYS = {
    decisionThresholds: "hireiq-decision-thresholds"
};

const DEFAULT_DECISION_THRESHOLDS = { rejectScore: 55 };

const THEME = {
    textSecondary: '#374151',
    textMuted:     '#6b7280',
    textDim:       '#9ca3af',
    accentGreen:   '#27ae60',
    accentRed:     '#c0392b'
};

// ── Decision threshold helpers ─────────────────────────────

function getDecisionThresholds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.decisionThresholds);
        if (!raw) return { ...DEFAULT_DECISION_THRESHOLDS };
        return { ...DEFAULT_DECISION_THRESHOLDS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_DECISION_THRESHOLDS };
    }
}

// ── Main loader ────────────────────────────────────────────

async function loadCandidateDetail() {
    if (!candidateId || !jobId) {
        document.getElementById("content").innerHTML =
            "<p class='error-msg'><i class='bx bx-error-circle'></i> Missing candidateId or jobId in URL.</p>";
        return;
    }

    try {
        const backLink = document.getElementById("backToRankings");
        if (backLink) backLink.href = `/rankings?jobId=${jobId}`;

        // Fetch candidate detail, full ranking list, and candidate file metadata in parallel
        const [detailRes, listRes, candidateRes] = await Promise.all([
            fetch(`/api/rankings/candidate?candidateId=${candidateId}&jobId=${jobId}`),
            fetch(`/api/rankings?jobId=${jobId}`),
            fetch(`/api/candidates/${candidateId}`)
        ]);

        const data          = await detailRes.json();
        const rankingList   = listRes.ok ? await listRes.json() : [];
        const candidateMeta = candidateRes.ok ? await candidateRes.json() : null;

        if (!detailRes.ok) throw new Error(data.error || "Could not load candidate");

        const insights = buildInsights(data, Array.isArray(rankingList) ? rankingList : []);

        // Render the page HTML first, then draw the chart into the canvas
        renderDetail(data, insights, candidateMeta);
        renderCategoryBars(data, Array.isArray(rankingList) ? rankingList : []);

    } catch (error) {
        document.getElementById("content").innerHTML =
            `<p class='error-msg'><i class='bx bx-error-circle'></i> ${error.message}</p>`;
    }
}

// ── Render page content ────────────────────────────────────

function renderDetail(s, insights, candidateMeta) {
    window.currentInterviewFocus = insights.interviewFocus || '';

    const matched   = parseField(s.matchedSkills);
    const missing   = parseField(s.missingSkills);
    const checklist = parseField(s.requirementChecklist);

    const rawConf  = typeof s.confidenceScore === 'number' ? s.confidenceScore : 0;
    const confScore = rawConf <= 1 ? rawConf * 100 : rawConf;
    const confClass = confScore >= 70 ? 'conf-high' : confScore >= 40 ? 'conf-mid' : 'conf-low';
    const confLabel = confScore >= 70 ? 'High Confidence' : confScore >= 40 ? 'Medium Confidence' : 'Low Confidence';

    const hasDocument = candidateMeta?.hasDocument === true;
    const documentStatusHtml = !candidateMeta
        ? `<span style="font-size:12px; color:${THEME.accentRed};">Could not read candidate file metadata from server.</span>`
        : hasDocument
            ? `<span style="font-size:12px; color:${THEME.accentGreen};">Original uploaded file is available.</span>`
            : `<span style="font-size:12px; color:${THEME.textMuted};">This candidate is from older data. Original upload file was not saved, so download is unavailable.</span>`;

    document.getElementById("content").innerHTML = `

        <!-- Header: name + total score -->
        <div class="card">
            <div class="detail-header">
                <div>
                    <h1>${s.fullName || "Unknown"}</h1>
                    <div style="font-size:13px; color:${THEME.textMuted}; margin-bottom:8px;">
                        ${s.email ? '<i class="bx bx-envelope" style="margin-right:4px;"></i>' + s.email : ''}
                        ${s.phone ? ' &nbsp;·&nbsp; <i class="bx bx-phone" style="margin-right:4px;"></i>' + s.phone : ''}
                    </div>
                    <span class="status ${s.status}">${s.status}</span>
                </div>
                <div class="score-circle">
                    <span class="big">${s.totalScore || 0}</span>
                    <span class="small">/ 100</span>
                </div>
            </div>
        </div>

        <!-- Benchmark analytics (rank, percentile, vs average) -->
        <div class="card">
            <div class="section-title"><i class='bx bx-line-chart'></i> Benchmark Analytics</div>
            <div class="benchmark-grid">
                <div class="benchmark-item">
                    <div class="k">Percentile</div>
                    <div class="v">${insights.percentile}%</div>
                </div>
                <div class="benchmark-item">
                    <div class="k">Rank Position</div>
                    <div class="v">#${insights.rank}/${insights.totalCandidates}</div>
                </div>
                <div class="benchmark-item">
                    <div class="k">Vs Job Average</div>
                    <div class="v">${insights.deltaFromAverage >= 0 ? '+' : ''}${insights.deltaFromAverage}</div>
                </div>
                <div class="benchmark-item">
                    <div class="k">Top Score (Job)</div>
                    <div class="v">${insights.topScore}</div>
                </div>
            </div>
        </div>

        <!-- Category comparison bars: this candidate vs pool average -->
        <!-- Rendered by renderCategoryBars() after this HTML is inserted -->
        <div class="card">
            <div class="section-title">
                <i class='bx bx-bar-chart-square'></i> How They Compare to Other Applicants
            </div>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:18px;">
                Each row shows how this candidate performed in one area compared to everyone else who applied.
            </p>
            <div id="categoryBars"></div>
        </div>

        <!-- Decision support -->
        <div class="card">
            <div class="section-title"><i class='bx bx-bulb'></i> Decision Support</div>
            <div class="decision-box">
                <div class="decision-badge ${insights.decisionClass}">${insights.decisionLabel}</div>
                <div style="font-size:13px; color:${THEME.textMuted}; margin-bottom:8px;">${insights.decisionReason}</div>
                <div style="font-size:12px; color:${THEME.textSecondary};">
                    <strong>Interview focus:</strong> ${insights.interviewFocus}
                </div>
                <div style="margin-top:8px; font-size:12px; color:${THEME.textMuted};">
                    <strong>How this recommendation is made:</strong>
                    Proceed when score is ${insights.thresholds.rejectScore} or higher.
                    Reject when score is below ${insights.thresholds.rejectScore}.
                </div>
                <div style="margin-top:8px; font-size:12px; color:${THEME.textSecondary};">
                    <strong>Top strengths:</strong> ${insights.strengths.join(', ')}
                </div>
                <div style="margin-top:6px; font-size:12px; color:${THEME.textSecondary};">
                    <strong>Main risks:</strong> ${insights.risks.join(', ')}
                </div>
                <div style="margin-top:10px;">
                    <button type="button" class="btn btn-secondary" onclick="copyInterviewFocus()">
                        <i class='bx bx-copy'></i> Copy Interview Focus
                    </button>
                </div>
                <div class="next-actions">
                    <a class="btn btn-primary" href="/comparison?jobId=${jobId}">Compare Candidates</a>
                    <a class="btn btn-secondary" href="/interview">Generate Interview Pack</a>
                    <a class="btn btn-secondary" href="/kanban">Open Pipeline</a>
                </div>
            </div>
        </div>

        <!-- Resume download -->
        <div class="card">
            <div class="section-title"><i class='bx bx-file'></i> Resume Document</div>
            <div style="font-size:13px; color:${THEME.textSecondary}; margin-bottom:10px;">
                ${candidateMeta?.originalFilename
        ? `File: <strong>${candidateMeta.originalFilename}</strong>`
        : "Original uploaded file name is not available."}
            </div>
            <div style="margin-bottom:10px;">${documentStatusHtml}</div>
            <div>
                ${hasDocument
        ? `<a class="btn btn-primary" href="/api/candidates/${candidateId}/download">
                           <i class='bx bx-download'></i> Download Resume
                       </a>`
        : `<span style="font-size:12px; color:${THEME.textMuted};">No downloadable file for this candidate.</span>`}
            </div>
        </div>

        <!-- Recruiter notes -->
        <div class="card">
            <div class="section-title"><i class='bx bx-note'></i> Recruiter Notes</div>
            <p style="font-size:12px; color:${THEME.textMuted}; margin-bottom:10px;">
                Save private notes for this candidate (visible to HR/Admin users).
            </p>
            <textarea id="candidateNotes" rows="5"
                      placeholder="Add interview reminders, concerns, strengths, or follow-up points..."></textarea>
            <div style="display:flex; gap:10px; align-items:center; margin-top:10px;">
                <button type="button" class="btn btn-primary" onclick="saveCandidateNotes()">
                    <i class='bx bx-save'></i> Save Notes
                </button>
                <span id="notesMsg" style="font-size:12px; color:${THEME.textMuted};"></span>
            </div>
        </div>

        <!-- Score breakdown bars -->
        <div class="card">
            <div class="section-title"><i class='bx bx-bar-chart-alt-2'></i> Score Breakdown</div>
            ${scoreRow("Skills",     s.skillsScore,     s.skillsWeight,     "fill-skills")}
            ${scoreRow("Experience", s.experienceScore, s.experienceWeight, "fill-experience")}
            ${scoreRow("Education",  s.educationScore,  s.educationWeight,  "fill-education")}
            ${scoreRow("Extras",     s.extrasScore,     s.extrasWeight,     "fill-extras")}
            <div class="confidence-badge ${confClass}">
                <i class='bx bx-shield-quarter'></i> ${confLabel} (${confScore.toFixed(0)}%)
            </div>
        </div>

        <!-- AI summary -->
        <div class="card">
            <div class="section-title"><i class='bx bx-brain'></i> AI Summary</div>
            <div class="ai-summary-text">${s.aiSummary || "No summary available."}</div>
        </div>

        <!-- Matched vs missing skills -->
        <div class="card">
            <div class="section-title"><i class='bx bx-check-double'></i> Skills Match</div>
            <div style="margin-bottom:14px;">
                <label style="color:${THEME.accentGreen}; margin-bottom:8px;">
                    <i class='bx bx-check-circle'></i> Matched Skills (${matched.length})
                </label>
                ${matched.length > 0
        ? matched.map(sk => `<span class="skill-tag matched-tag">✓ ${sk}</span>`).join("")
        : `<span style='font-size:13px; color:${THEME.textDim};'>None detected</span>`}
            </div>
            <div>
                <label style="color:${THEME.accentRed}; margin-bottom:8px;">
                    <i class='bx bx-x-circle'></i> Missing Skills (${missing.length})
                </label>
                ${missing.length > 0
        ? missing.map(sk => `<span class="skill-tag missing-tag">✗ ${sk}</span>`).join("")
        : `<span style='font-size:13px; color:${THEME.textDim};'>None — all requirements met!</span>`}
            </div>
        </div>

        <!-- Requirement checklist -->
        <div class="card">
            <div class="section-title"><i class='bx bx-list-check'></i> Requirement Checklist</div>
            ${checklist.length > 0
        ? checklist.map(item => `
                    <div class="checklist-item ${item.status}">
                        <strong>${item.skill}</strong>
                        <span class="cl-status">${item.status.replace("_", " ")}</span>
                        ${item.evidence
            ? `<div class="checklist-evidence">${item.evidence}</div>`
            : ''}
                    </div>`).join("")
        : `<div class="empty-state">
                       <div class="empty-icon">📋</div>
                       <h3>No checklist available</h3>
                       <p>Score this candidate to generate a requirement checklist.</p>
                   </div>`}
        </div>
    `;

    // Restore saved notes if any
    const notesInput = document.getElementById("candidateNotes");
    if (notesInput) notesInput.value = candidateMeta?.notes || "";
}

// ── Category comparison bars ───────────────────────────────
// Replaces the radar chart with simple horizontal bars.
// Each row = one scoring category. Shows this candidate vs pool average
// as two stacked bars, plus a plain-English label (Strong / Above average /
// Below average / Weak) so HR never has to interpret a number.
// Called after renderDetail() so #categoryBars already exists in the DOM.

function renderCategoryBars(candidate, rankingList) {
    const container = document.getElementById("categoryBars");
    if (!container) return;

    // Convert raw score to % of its max weight
    function toPct(score, weight) {
        if (!weight || weight <= 0) return 0;
        return Math.round((score / weight) * 100);
    }

    // Plain-English label based on how candidate compares to pool average
    function getLabel(candidatePct, avgPct) {
        const diff = candidatePct - avgPct;
        if (candidatePct >= 80)   return { text: "Strong",        color: "#10b981" };
        if (diff >= 10)            return { text: "Above average", color: "#10b981" };
        if (diff >= -10)           return { text: "Average",       color: "#f59e0b" };
        if (candidatePct >= 40)   return { text: "Below average", color: "#f97316" };
        return                            { text: "Weak",          color: "#ef4444" };
    }

    // Pool average per category (scored candidates only)
    const scored = rankingList.filter(r => typeof r.totalScore === "number");

    function poolAvg(scoreKey, weight) {
        if (scored.length === 0) return 0;
        const sum = scored.reduce((acc, r) => acc + toPct(r[scoreKey] || 0, weight), 0);
        return Math.round(sum / scored.length);
    }

    // The 4 categories we want to show
    const categories = [
        {
            label:    "Skills",
            pct:      toPct(candidate.skillsScore,     candidate.skillsWeight),
            avgPct:   poolAvg("skillsScore",            candidate.skillsWeight),
            barColor: "#6c5ce7"
        },
        {
            label:    "Experience",
            pct:      toPct(candidate.experienceScore, candidate.experienceWeight),
            avgPct:   poolAvg("experienceScore",        candidate.experienceWeight),
            barColor: "#00cec9"
        },
        {
            label:    "Education",
            pct:      toPct(candidate.educationScore,  candidate.educationWeight),
            avgPct:   poolAvg("educationScore",         candidate.educationWeight),
            barColor: "#fdcb6e"
        },
        {
            label:    "Extras",
            pct:      toPct(candidate.extrasScore,     candidate.extrasWeight),
            avgPct:   poolAvg("extrasScore",            candidate.extrasWeight),
            barColor: "#fd79a8"
        }
    ];

    container.innerHTML = categories.map(cat => {
        const verdict = getLabel(cat.pct, cat.avgPct);

        return `
        <div style="margin-bottom:18px;">

            <!-- Row header: category name + verdict label -->
            <div style="display:flex; justify-content:space-between; align-items:center;
                        margin-bottom:6px;">
                <span style="font-size:13px; font-weight:600; color:var(--text-primary);">
                    ${cat.label}
                </span>
                <span style="font-size:12px; font-weight:700; color:${verdict.color};">
                    ${verdict.text}
                </span>
            </div>

            <!-- This candidate's bar -->
            <div style="margin-bottom:4px;">
                <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">
                    This candidate
                </div>
                <div style="background:var(--bg-input); border-radius:999px;
                            height:10px; overflow:hidden;">
                    <div style="width:${cat.pct}%; height:100%; border-radius:999px;
                                background:${cat.barColor};
                                transition: width 0.7s ease;"></div>
                </div>
            </div>

            <!-- Pool average bar (grey, thinner) -->
            <div>
                <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px;">
                    Pool average &nbsp;
                    <span style="color:var(--text-dim);">(${cat.avgPct}%)</span>
                </div>
                <div style="background:var(--bg-input); border-radius:999px;
                            height:6px; overflow:hidden;">
                    <div style="width:${cat.avgPct}%; height:100%; border-radius:999px;
                                background:rgba(148,163,184,0.6);
                                transition: width 0.7s ease;"></div>
                </div>
            </div>

        </div>`;
    }).join("");
}

// ── Build decision insights from ranking data ──────────────

function buildInsights(candidate, rankingList) {
    const thresholds = getDecisionThresholds();
    const candidates = rankingList.filter(r => typeof r.totalScore === 'number');

    if (candidates.length === 0) {
        const score = candidate.totalScore || 0;
        const isProceed = score >= thresholds.rejectScore;
        return {
            percentile: 0,
            rank: 1,
            totalCandidates: 1,
            deltaFromAverage: 0,
            topScore: candidate.totalScore || 0,
            decisionLabel:  isProceed ? 'PROCEED - Score Above Cutoff' : 'REJECT - Score Below Cutoff',
            decisionClass:  isProceed ? 'decision-proceed' : 'decision-reject',
            decisionReason: `Limited benchmark data. Decision uses score cutoff ${thresholds.rejectScore}.`,
            interviewFocus: 'Validate core required skills and role-fit confidence.',
            thresholds,
            strengths: ['Initial fit available'],
            risks:     ['Limited benchmark data']
        };
    }

    const sorted     = [...candidates].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    const rank       = Math.max(1, sorted.findIndex(r => r.candidateId === candidate.candidateId) + 1 || 1);
    const total      = sorted.length;
    const percentile = Math.round(((total - rank) / Math.max(total - 1, 1)) * 100);

    const avg    = Math.round(sorted.reduce((sum, r) => sum + (r.totalScore || 0), 0) / total);
    const delta  = (candidate.totalScore || 0) - avg;
    const topScore = sorted[0]?.totalScore || candidate.totalScore || 0;

    const confidence = typeof candidate.confidenceScore === 'number'
        ? (candidate.confidenceScore <= 1 ? candidate.confidenceScore * 100 : candidate.confidenceScore)
        : 0;
    const missingCount = parseField(candidate.missingSkills).length;

    const isProceed    = (candidate.totalScore || 0) >= thresholds.rejectScore;
    const decisionLabel = isProceed ? 'PROCEED - Score Above Cutoff' : 'REJECT - Score Below Cutoff';
    const decisionClass = isProceed ? 'decision-proceed' : 'decision-reject';

    const decisionReason = `Score ${candidate.totalScore || 0}/100, confidence ${Math.round(confidence)}%, ${missingCount} missing skill(s).`;
    const interviewFocus = missingCount > 0
        ? `Validate: ${parseField(candidate.missingSkills).slice(0, 3).join(', ')}${missingCount > 3 ? '...' : ''}`
        : 'Deep dive on leadership, ownership, and role readiness.';

    const strengths = [];
    if ((candidate.totalScore     || 0) >= thresholds.rejectScore) strengths.push('Score above proceed cutoff');
    if ((candidate.skillsScore    || 0) >= 25)                     strengths.push('Solid technical skills');
    if ((candidate.experienceScore|| 0) >= 18)                     strengths.push('Relevant experience');
    if (confidence >= 70)                                           strengths.push('High confidence profile');
    if (!strengths.length)                                          strengths.push('Balanced profile');

    const risks = [];
    if (missingCount > 0)                                           risks.push(`${missingCount} missing skill(s)`);
    if ((candidate.totalScore || 0) < thresholds.rejectScore)       risks.push('Below proceed cutoff');
    if (confidence < 50)                                            risks.push('Lower confidence score');
    if (!risks.length)                                              risks.push('No critical risks detected');

    return {
        percentile,
        rank,
        totalCandidates: total,
        deltaFromAverage: delta,
        topScore,
        decisionLabel,
        decisionClass,
        decisionReason,
        interviewFocus,
        thresholds,
        strengths: strengths.slice(0, 3),
        risks:     risks.slice(0, 3)
    };
}

// ── Small helpers ──────────────────────────────────────────

// Renders one score breakdown bar row
function scoreRow(label, score, maxWeight, fillClass) {
    const pct = maxWeight > 0 ? Math.round((score / maxWeight) * 100) : 0;
    return `
        <div class="score-row">
            <div class="score-row-header">
                <span>${label}</span>
                <span>${score} / ${maxWeight}</span>
            </div>
            <div class="score-row-bar">
                <div class="score-row-fill ${fillClass}" style="width:${pct}%;"></div>
            </div>
        </div>`;
}

// Safely parses a field that might be a JSON string or already an array
function parseField(field) {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try { return JSON.parse(field); } catch { return []; }
}

function copyInterviewFocus() {
    const text = window.currentInterviewFocus || '';
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
}

async function saveCandidateNotes() {
    const notesInput = document.getElementById("candidateNotes");
    const notesMsg   = document.getElementById("notesMsg");
    if (!notesInput || !notesMsg) return;

    notesMsg.textContent = "Saving...";
    notesMsg.style.color = THEME.textMuted;

    try {
        const response = await fetch(`/api/candidates/${candidateId}/notes`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ notes: notesInput.value || "" })
        });

        if (!response.ok) throw new Error("Could not save notes");

        notesMsg.textContent = "Notes saved.";
        notesMsg.style.color = THEME.accentGreen;
    } catch (e) {
        notesMsg.textContent = "Failed to save notes.";
        notesMsg.style.color = THEME.accentRed;
    }
}

// ── Start ──────────────────────────────────────────────────
loadCandidateDetail();