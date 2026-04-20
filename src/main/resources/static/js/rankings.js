// static/js/rankings.js
// Handles the rankings page: job dropdown, scoring, search, and rendering.
// Logic is unchanged — only visual rendering has been improved.

let currentJobId = null;
let currentRankings = [];
let currentDisplayedRankings = [];

const STORAGE_KEYS = {
    lastJobId:          "hireiq-rankings-jobId",
    sortBy:             "hireiq-rankings-sortBy",
    minScore:           "hireiq-rankings-minScore",
    topLimit:           "hireiq-rankings-topLimit",
    decisionThresholds: "hireiq-decision-thresholds"
};

const DEFAULT_DECISION_THRESHOLDS = { rejectScore: 55 };

// CSS variable shortcuts used throughout rendering
const THEME = {
    textPrimary: 'var(--text-primary)',
    textMuted:   'var(--text-muted)',
    textDim:     'var(--text-dim)',
    accentGreen: 'var(--accent-green)',
    accentRed:   'var(--accent-red)'
};

// ── Helpers ────────────────────────────────────────────────

function setInlineError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message || "";
    el.style.display = message ? "block" : "none";
}

// Returns score tier as a string: "strong", "review", or "risk"
function scoreTier(score) {
    if (score >= 75) return "strong";
    if (score >= 60) return "review";
    return "risk";
}

// Returns the appropriate CSS color for a score value
function scoreColor(score) {
    if (score >= 75) return "var(--accent-green)";
    if (score >= 60) return "var(--accent-orange)";
    return "var(--accent-red)";
}

// Returns the gradient for a score bar based on tier
function scoreBarGradient(score) {
    if (score >= 75) return "linear-gradient(90deg, #10b981, #34d399)";
    if (score >= 60) return "linear-gradient(90deg, #f59e0b, #fbbf24)";
    return "linear-gradient(90deg, #ef4444, #f87171)";
}

// Returns the left-border color for a candidate card
function cardBorderColor(score) {
    if (score >= 75) return "#10b981"; // green
    if (score >= 60) return "#f59e0b"; // amber
    return "#ef4444";                  // red
}

// Converts confidenceScore (0–1 or 0–100) to an integer percentage
function confidencePercent(candidate) {
    const c = candidate?.confidenceScore;
    if (typeof c !== "number") return 0;
    return c <= 1 ? Math.round(c * 100) : Math.round(c);
}

// Returns badge class and label for a confidence percentage
function confidenceBadgeInfo(pct) {
    if (pct >= 70) return { cls: "high", label: `${pct}% confidence` };
    if (pct >= 45) return { cls: "mid",  label: `${pct}% confidence` };
    return             { cls: "low",  label: `${pct}% confidence` };
}

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

function getRejectScoreThreshold() {
    const t = getDecisionThresholds();
    return Number.isFinite(t.rejectScore) ? t.rejectScore : DEFAULT_DECISION_THRESHOLDS.rejectScore;
}

function restoreDecisionThresholdControls() {
    const t = getDecisionThresholds();
    const rejectInput = document.getElementById("tRejectScore");
    if (rejectInput) rejectInput.value = t.rejectScore;
    updateThresholdLabels();
}

function updateThresholdLabels() {
    const lbl = document.getElementById("lblRejectScore");
    if (lbl) lbl.textContent = document.getElementById("tRejectScore")?.value || "55";
}

function saveDecisionThresholds() {
    const thresholds = {
        rejectScore: parseInt(document.getElementById("tRejectScore")?.value
            || DEFAULT_DECISION_THRESHOLDS.rejectScore, 10)
    };
    localStorage.setItem(STORAGE_KEYS.decisionThresholds, JSON.stringify(thresholds));
    updateThresholdLabels();
    applyRankingsView();
}

// ── View control state ─────────────────────────────────────

function restoreViewControlState() {
    const sortBy   = localStorage.getItem(STORAGE_KEYS.sortBy);
    const minScore = localStorage.getItem(STORAGE_KEYS.minScore);
    const topLimit = localStorage.getItem(STORAGE_KEYS.topLimit);
    if (sortBy   && document.getElementById("sortBy"))   document.getElementById("sortBy").value   = sortBy;
    if (minScore !== null && document.getElementById("minScore")) document.getElementById("minScore").value = minScore;
    if (topLimit !== null && document.getElementById("topLimit")) document.getElementById("topLimit").value = topLimit;
}

function saveViewControlState() {
    localStorage.setItem(STORAGE_KEYS.sortBy,   document.getElementById("sortBy")?.value   || "total_desc");
    localStorage.setItem(STORAGE_KEYS.minScore,  document.getElementById("minScore")?.value  || "0");
    localStorage.setItem(STORAGE_KEYS.topLimit,  document.getElementById("topLimit")?.value  || "0");
}

// ── Load jobs into dropdown on page load ───────────────────

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
            opt.value       = job.jobId;
            opt.textContent = `${job.title} (ID: ${job.jobId})`;
            select.appendChild(opt);
        });

        // Pre-select from URL param or last saved job
        const params     = new URLSearchParams(window.location.search);
        const urlJobId   = params.get("jobId");
        const savedJobId = localStorage.getItem(STORAGE_KEYS.lastJobId);
        const autoJobId  = urlJobId || savedJobId;

        if (autoJobId) {
            select.value = autoJobId;
            currentJobId = parseInt(autoJobId, 10);
            document.getElementById("scoringPanel").style.display = "block";
            const searchPanelA = document.getElementById("searchPanel");
            if (searchPanelA) searchPanelA.style.display = "block";
            fetchRankings(autoJobId);
        }
    } catch (e) {
        document.getElementById("jobSelect").innerHTML =
            '<option value="">Failed to load jobs</option>';
    }
}
loadJobsDropdown();

// ── Load rankings ──────────────────────────────────────────

async function loadRankings() {
    const jobId = document.getElementById("jobSelect").value;
    setInlineError("jobInlineError", "");

    if (!jobId) {
        setInlineError("jobInlineError", "Please select a job first.");
        document.getElementById("jobSelect").focus();
        return;
    }

    currentJobId = parseInt(jobId);
    localStorage.setItem(STORAGE_KEYS.lastJobId, String(currentJobId));
    window.history.replaceState({}, "", `/rankings?jobId=${jobId}`);

    document.getElementById("scoringPanel").style.display = "block";
    const searchPanelB = document.getElementById("searchPanel");
    if (searchPanelB) searchPanelB.style.display = "block";

    await fetchRankings(jobId);
}

async function fetchRankings(jobId) {
    try {
        const response = await fetch(`/api/rankings?jobId=${jobId}`);
        const rankings = await response.json();
        if (!response.ok) throw new Error(rankings.error || "Failed to load rankings");

        currentRankings = Array.isArray(rankings) ? rankings : [];
        renderAnalytics(currentRankings);
        document.getElementById("analyticsPanel").style.display = "block";
        document.getElementById("viewControls").style.display   = "block";
        applyRankingsView();
    } catch (error) {
        document.getElementById("rankingsList").innerHTML =
            `<p class="error-msg"><i class='bx bx-error-circle'></i> ${error.message}</p>`;
    }
}

// ── Trigger scoring ────────────────────────────────────────

async function scoreAll() {
    setInlineError("jobInlineError", "");

    if (!currentJobId) {
        setInlineError("jobInlineError", "Select and load a job before scoring.");
        return;
    }

    const skillsW     = parseInt(document.getElementById("wSkills").value);
    const experienceW = parseInt(document.getElementById("wExperience").value);
    const educationW  = parseInt(document.getElementById("wEducation").value);
    const extrasW     = parseInt(document.getElementById("wExtras").value);
    const total       = skillsW + experienceW + educationW + extrasW;

    if (Number.isNaN(total) || total !== 100) {
        document.getElementById("weightError").innerHTML =
            "<i class='bx bx-error-circle'></i> Weights must add up to 100";
        return;
    }

    document.getElementById("weightError").textContent = "";

    const btn = document.getElementById("scoreBtn");
    btn.classList.add("loading");
    document.getElementById("scoreMsg").textContent = "Scoring… this may take a minute.";

    try {
        const response = await fetch("/api/rankings/score", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jobId:            currentJobId,
                skillsWeight:     skillsW,
                experienceWeight: experienceW,
                educationWeight:  educationW,
                extrasWeight:     extrasW
            })
        });

        const rankings = await response.json();
        if (!response.ok) throw new Error(rankings.error || "Scoring failed");

        document.getElementById("scoreMsg").textContent = `✓ ${rankings.length} candidates scored.`;
        document.getElementById("scoreMsg").style.color = THEME.accentGreen;

        currentRankings = Array.isArray(rankings) ? rankings : [];
        renderAnalytics(currentRankings);
        document.getElementById("analyticsPanel").style.display = "block";
        document.getElementById("viewControls").style.display   = "block";
        applyRankingsView();

    } catch (error) {
        document.getElementById("scoreMsg").textContent = "Error: " + error.message;
        document.getElementById("scoreMsg").style.color = THEME.accentRed;
    } finally {
        btn.classList.remove("loading");
    }
}

// ── Natural language search ────────────────────────────────

async function searchCandidates() {
    const query      = document.getElementById("searchQuery").value.trim();
    const resultsDiv = document.getElementById("searchResults");
    setInlineError("searchInlineError", "");

    if (!currentJobId) {
        setInlineError("searchInlineError", "Select and load a job before searching.");
        return;
    }

    if (!query) {
        setInlineError("searchInlineError",
            "Type a search query, for example: top candidates with Java and Spring.");
        return;
    }

    resultsDiv.innerHTML =
        `<p style="font-size:13px; color:${THEME.textMuted};">
            <i class="bx bx-loader-alt bx-spin"></i> Searching…
        </p>`;

    try {
        const response = await fetch("/api/rankings/search", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ query, jobId: currentJobId, topK: 10 })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Search failed");

        if (!data.results || data.results.length === 0) {
            resultsDiv.innerHTML =
                `<p style="font-size:13px; color:${THEME.textMuted};">No results found.</p>`;
            return;
        }

        // Deduplicate by candidate_id
        const seen = {};
        data.results.forEach(r => { if (!seen[r.candidate_id]) seen[r.candidate_id] = r; });
        const candidates = Object.values(seen);

        resultsDiv.innerHTML = `
            <p style="font-size:12px; color:${THEME.textMuted}; margin-bottom:10px;">
                ${candidates.length} matching candidate(s):
            </p>
            ${candidates.map(r => `
                <div class="card" style="margin-bottom:8px; padding:12px 16px; cursor:pointer;"
                     onclick="viewCandidate(${r.candidate_id})">
                    <strong style="color:${THEME.textPrimary}; font-size:14px;">
                        ${r.full_name || "Unknown"}
                    </strong>
                    <span style="font-size:11px; color:${THEME.textDim}; margin-left:8px;">
                        ${r.email || ""}
                    </span>
                    <div style="font-size:12px; color:${THEME.textMuted}; margin-top:5px; line-height:1.5;">
                        ${r.text.substring(0, 120)}…
                    </div>
                </div>`).join("")}`;

    } catch (error) {
        resultsDiv.innerHTML =
            `<p class="error-msg"><i class='bx bx-error-circle'></i> ${error.message}</p>`;
    }
}

function clearSearch() {
    document.getElementById("searchQuery").value       = "";
    document.getElementById("searchResults").innerHTML = "";
    setInlineError("searchInlineError", "");
}

// ── Filter / sort rankings ─────────────────────────────────

function applyRankingsView() {
    if (!Array.isArray(currentRankings)) return;

    const sortBy   = document.getElementById("sortBy")?.value   || "total_desc";
    const minScore = parseInt(document.getElementById("minScore")?.value  || "0", 10);
    const topLimit = parseInt(document.getElementById("topLimit")?.value  || "0", 10);

    let list = currentRankings.filter(r => (r.totalScore || 0) >= Math.max(0, minScore || 0));

    list.sort((a, b) => {
        if (sortBy === "skills_desc")     return (b.skillsScore     || 0) - (a.skillsScore     || 0);
        if (sortBy === "experience_desc") return (b.experienceScore  || 0) - (a.experienceScore  || 0);
        if (sortBy === "confidence_desc") return confidencePercent(b)      - confidencePercent(a);
        return (b.totalScore || 0) - (a.totalScore || 0); // default: total score
    });

    if (topLimit > 0) list = list.slice(0, topLimit);

    currentDisplayedRankings = list;
    saveViewControlState();
    renderRankings(list);
}

// ── Analytics panel ────────────────────────────────────────

function renderAnalytics(rankings) {
    const grid       = document.getElementById("analyticsGrid");
    const quartileEl = document.getElementById("quartileGraph");
    const distEl     = document.getElementById("distributionGraph");
    const shortlist  = document.getElementById("shortlistBox");

    if (!rankings || rankings.length === 0) {
        grid.innerHTML       = `<div class="analytics-item"><div class="k">Candidates</div><div class="v">0</div></div>`;
        quartileEl.innerHTML = `<div style="font-size:12px; color:var(--text-muted);">No data yet.</div>`;
        distEl.innerHTML     = `<div style="font-size:12px; color:var(--text-muted);">No data yet.</div>`;
        shortlist.innerHTML  = "No suggestions yet.";
        return;
    }

    const totals      = rankings.map(r => r.totalScore || 0).sort((a, b) => a - b);
    const avg         = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    const topCandidate = [...rankings].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))[0];

    const strongCount = rankings.filter(r => (r.totalScore || 0) >= 75).length;
    const reviewCount = rankings.filter(r => (r.totalScore || 0) >= 60 && (r.totalScore || 0) < 75).length;
    const riskCount   = rankings.filter(r => (r.totalScore || 0) < 60).length;

    grid.innerHTML = `
        <div class="analytics-item blue">
            <div class="k">Total Candidates</div>
            <div class="v">${totals.length}</div>
        </div>
        <div class="analytics-item teal">
            <div class="k">Interview Ready</div>
            <div class="v">${strongCount}</div>
        </div>
        <div class="analytics-item warm">
            <div class="k">Need Review</div>
            <div class="v">${reviewCount}</div>
        </div>
        <div class="analytics-item violet">
            <div class="k">Average Score</div>
            <div class="v">${avg}</div>
        </div>
        <div class="analytics-item">
            <div class="k">Top Candidate</div>
            <div class="v" style="font-size:15px;">${topCandidate?.fullName || 'N/A'}</div>
        </div>
    `;

    // Fit overview bar (proportional green/amber/red segments)
    const strongPct = Math.round((strongCount / rankings.length) * 100);
    const reviewPct = Math.round((reviewCount / rankings.length) * 100);
    const riskPct   = Math.max(0, 100 - strongPct - reviewPct);

    quartileEl.innerHTML = `
        <div class="fit-overview">
            <div class="fit-bar">
                <div class="fit-segment-strong" style="width:${strongPct}%"></div>
                <div class="fit-segment-review" style="width:${reviewPct}%"></div>
                <div class="fit-segment-risk"   style="width:${riskPct}%"></div>
            </div>
            <div class="fit-legend">
                <span><span class="legend-dot" style="background:#10b981"></span>Ready (${strongCount})</span>
                <span><span class="legend-dot" style="background:#f59e0b"></span>Review (${reviewCount})</span>
                <span><span class="legend-dot" style="background:#ef4444"></span>Risk (${riskCount})</span>
            </div>
        </div>
    `;

    // Score histogram (5 buckets)
    const buckets = [
        { label: "90–100", count: 0, color: "#10b981" },
        { label: "80–89",  count: 0, color: "#3b82f6" },
        { label: "70–79",  count: 0, color: "#f59e0b" },
        { label: "60–69",  count: 0, color: "#f97316" },
        { label: "0–59",   count: 0, color: "#ef4444" }
    ];

    rankings.forEach(r => {
        const s = r.totalScore || 0;
        if      (s >= 90) buckets[0].count++;
        else if (s >= 80) buckets[1].count++;
        else if (s >= 70) buckets[2].count++;
        else if (s >= 60) buckets[3].count++;
        else              buckets[4].count++;
    });

    distEl.innerHTML = `
        <div class="histogram">
            ${buckets.map(b => {
        const pct = Math.round((b.count / rankings.length) * 100);
        const h   = Math.max(8, Math.round((pct / 100) * 88));
        return `
                    <div class="hist-bar-wrap">
                        <div class="hist-bar" style="height:${h}px; background:${b.color};"></div>
                        <div>${b.label}</div>
                        <strong>${b.count}</strong>
                    </div>`;
    }).join("")}
        </div>
    `;

    // Suggested shortlist (top 5)
    const shortlistCandidates = [...rankings]
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .slice(0, 5);

    shortlist.innerHTML = shortlistCandidates.length === 0
        ? "No shortlist available."
        : shortlistCandidates.map((r, i) => `
            <div style="margin-bottom:8px; display:flex; align-items:center; gap:8px;">
                <span class="shortlist-chip">#${i + 1}</span>
                <strong style="font-size:12px; color:var(--text-primary);">${r.fullName || "Unknown"}</strong>
                <span style="font-size:11px; color:${scoreColor(r.totalScore || 0)}; font-weight:700;">
                    ${r.totalScore || 0}/100
                </span>
            </div>`).join("");
}

// ── Export CSV ─────────────────────────────────────────────

function exportRankingsCsv() {
    const list = currentDisplayedRankings.length ? currentDisplayedRankings : currentRankings;
    if (!list.length) return;

    const rows = [
        ["candidateId","fullName","email","totalScore","skillsScore","experienceScore",
            "educationScore","extrasScore","confidencePercent","status"]
    ];

    list.forEach(r => {
        rows.push([
            r.candidateId      || "",
            r.fullName         || "",
            r.email            || "",
            r.totalScore       || 0,
            r.skillsScore      || 0,
            r.experienceScore  || 0,
            r.educationScore   || 0,
            r.extrasScore      || 0,
            confidencePercent(r),
            r.status           || ""
        ]);
    });

    const csv  = rows.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `rankings-job-${currentJobId || "unknown"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Send top candidates to comparison page ─────────────────

function sendTopToComparison() {
    if (!currentJobId) {
        setInlineError("jobInlineError", "Select and load a job first.");
        return;
    }

    const source = currentDisplayedRankings.length ? currentDisplayedRankings : currentRankings;
    const topIds = [...source]
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .slice(0, 3)
        .map(r => r.candidateId)
        .filter(Boolean);

    if (topIds.length < 2) {
        setInlineError("jobInlineError", "Need at least 2 ranked candidates to compare.");
        return;
    }

    window.location.href = `/comparison?jobId=${currentJobId}&prefill=${topIds.join(',')}`;
}

// ── Render the candidate cards ─────────────────────────────

function renderRankings(rankings) {
    const container  = document.getElementById("rankingsList");
    const rejectScore = getRejectScoreThreshold();

    if (!rankings || rankings.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h3>No Rankings Yet</h3>
                    <p>Click "Score All Candidates" above to generate AI-powered scores.</p>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = rankings.map((r, i) => {
        const score      = r.totalScore || 0;
        const medalClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        const medalIcon  = i === 0 ? '🥇'   : i === 1 ? '🥈'    : i === 2 ? '🥉'    : (i + 1);

        // Staggered animation delay (capped so it doesn't feel too slow)
        const delay = Math.min(0.08 + i * 0.05, 0.5).toFixed(2);

        const reasons    = buildCandidateReasons(r);
        const isProceed  = score >= rejectScore;
        const confPct    = confidencePercent(r);
        const confInfo   = confidenceBadgeInfo(confPct);

        return `
        <div class="card candidate-card"
             onclick="viewCandidate(${r.candidateId})"
             style="animation: fadeInUp ${delay}s ease both;
                    border-left-color: ${cardBorderColor(score)};">

            <!-- Top row: name + score -->
            <div style="display:flex; align-items:center; justify-content:space-between;
                        flex-wrap:wrap; gap:10px;">

                <div style="display:flex; align-items:center;">
                    <span class="rank-badge ${medalClass}">${medalIcon}</span>
                    <div>
                        <div style="font-size: 15px; font-weight:700; color:${THEME.textPrimary};">
                            ${r.fullName || "Unknown"}
                        </div>
                        <div style="font-size:12px; color:${THEME.textMuted}; margin-top:2px;">
                            ${r.email || ""}${r.phone ? ' · ' + r.phone : ''}
                        </div>
                    </div>
                </div>

                <!-- Score + status badge + confidence -->
                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                    <!-- Confidence badge -->
                    <span class="confidence-badge ${confInfo.cls}">
                        <i class='bx bx-pulse'></i> ${confInfo.label}
                    </span>
                    <!-- Status -->
                    <span class="status ${r.status}">${r.status}</span>
                    <!-- Big score number, colored by tier -->
                    <div style="text-align:right;">
                        <span style="font-size:26px; font-weight:800; color:${scoreColor(score)}; line-height:1;">
                            ${score}
                        </span>
                        <span style="font-size:12px; color:${THEME.textDim};">/100</span>
                    </div>
                </div>
            </div>

            <!-- Score progress bar (color reflects tier) -->
            <div class="score-bar-bg">
                <div class="score-bar"
                     style="width:${score}%; background:${scoreBarGradient(score)};"></div>
            </div>

            <!-- Breakdown pills -->
            <div class="score-breakdown-row">
                <div class="score-breakdown-item">
                    <span class="dot" style="background:#6c5ce7;"></span>
                    Skills: ${r.skillsScore || 0}
                </div>
                <div class="score-breakdown-item">
                    <span class="dot" style="background:#00cec9;"></span>
                    Experience: ${r.experienceScore || 0}
                </div>
                <div class="score-breakdown-item">
                    <span class="dot" style="background:#fdcb6e;"></span>
                    Education: ${r.educationScore || 0}
                </div>
                <div class="score-breakdown-item">
                    <span class="dot" style="background:#fd79a8;"></span>
                    Extras: ${r.extrasScore || 0}
                </div>
            </div>

            <!-- Reason chips -->
            <div style="margin-top:8px;">
                ${reasons.map(reason => `<span class="reason-chip">${reason}</span>`).join('')}
            </div>

            <!-- Decision chip (Proceed / Reject) -->
            <div class="decision-chip ${isProceed ? 'proceed' : 'reject'}">
                <i class='bx ${isProceed ? 'bx-check-circle' : 'bx-x-circle'}'></i>
                ${isProceed ? 'PROCEED' : 'REJECT'} &nbsp;·&nbsp; cutoff ${rejectScore}
            </div>

            <!-- AI summary (truncated, separated by a line) -->
            ${r.aiSummary ? `
                <div class="ai-summary">
                    ${r.aiSummary.substring(0, 160)}…
                </div>` : ''}
        </div>`;
    }).join("");
}

// Builds 1–3 highlight reasons for a candidate card
function buildCandidateReasons(candidate) {
    const reasons = [];
    const total   = candidate.totalScore || 0;
    if (total >= 85)                              reasons.push("Top overall score");
    if ((candidate.skillsScore     || 0) >= 30)  reasons.push("Strong skills fit");
    if ((candidate.experienceScore || 0) >= 20)  reasons.push("Strong experience fit");
    if (confidencePercent(candidate)    >= 70)   reasons.push("High confidence");
    if (!reasons.length)                          reasons.push("Balanced profile");
    return reasons.slice(0, 3);
}

// ── Navigate to candidate detail ───────────────────────────

function viewCandidate(candidateId) {
    window.location.href = `/candidate?candidateId=${candidateId}&jobId=${currentJobId}`;
}

// ── Weight input counter + styling ────────────────────────

function updateWeightTotal() {
    const total = parseInt(document.getElementById("wSkills").value     || 0)
        + parseInt(document.getElementById("wExperience").value || 0)
        + parseInt(document.getElementById("wEducation").value  || 0)
        + parseInt(document.getElementById("wExtras").value     || 0);

    document.getElementById("weightTotal").textContent = total;

    const box = document.getElementById("weightTotalBox");
    if (total === 100) {
        box.className = "weight-total valid";
        box.innerHTML = `<i class='bx bx-check-circle'></i> Total: <span id="weightTotal">${total}</span> / 100`;
        document.getElementById("weightError").textContent = "";
    } else {
        box.className = "weight-total invalid";
        box.innerHTML = `<i class='bx bx-error-circle'></i> Total: <span id="weightTotal">${total}</span> / 100`;
    }

    updateWeightInputStyles();
}

// Color each weight input based on its value
function updateWeightInputStyles() {
    ["wSkills", "wExperience", "wEducation", "wExtras"].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        const value = parseInt(input.value || "0", 10);
        input.classList.remove("low", "mid", "high");
        if      (value >= 35) input.classList.add("high");
        else if (value >= 20) input.classList.add("mid");
        else                  input.classList.add("low");
    });
}

// ── Enter key triggers search ──────────────────────────────

document.getElementById("searchQuery")?.addEventListener("keydown", function(e) {
    if (e.key === "Enter") searchCandidates();
});

// ── Init ───────────────────────────────────────────────────

updateWeightInputStyles();
restoreDecisionThresholdControls();
restoreViewControlState();