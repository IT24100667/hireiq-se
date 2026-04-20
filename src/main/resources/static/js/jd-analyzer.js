// static/js/jd-analyzer.js
// Member 06 - Handles the JD Analyzer page.

// ── Analyze JD ────────────────────────────────────────────
async function analyzeJd() {
    const originalJd = document.getElementById("originalJd").value.trim();
    const jobId      = document.getElementById("jobId").value;
    const analyzeBtn = document.getElementById("analyzeBtn");
    const analyzeMsg = document.getElementById("analyzeMsg");

    if (!originalJd) {
        analyzeMsg.style.color = "#c0392b";
        analyzeMsg.textContent = "Please paste a job description first.";
        return;
    }

    // Show loading state
    analyzeBtn.disabled    = true;
    analyzeMsg.style.color = "#666";
    analyzeMsg.textContent = "Analyzing... this may take a moment.";

    // Hide previous results
    document.getElementById("scoreBanner").style.display = "none";
    document.getElementById("issuesPanel").style.display = "none";
    document.getElementById("splitPanel").style.display  = "none";

    try {
        const response = await fetch("/api/jd/analyze", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                originalJd: originalJd,
                jobId:      jobId ? parseInt(jobId) : null
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Analysis failed");

        analyzeMsg.textContent = "Done!";
        renderResults(data, originalJd);

    } catch (error) {
        analyzeMsg.style.color = "#c0392b";
        analyzeMsg.textContent = "Error: " + error.message;
    } finally {
        analyzeBtn.disabled = false;
    }
}

// ── Render Results ─────────────────────────────────────────
function renderResults(data, originalJd) {

    // 1 - Quality Score Banner
    const score = data.qualityScore || 0;
    document.getElementById("qualityScore").textContent    = score;
    document.getElementById("scoreBar").style.width        = score + "%";
    document.getElementById("improvementSummary").textContent =
        data.improvementSummary || "";

    // Color code the score
    const scoreEl = document.getElementById("qualityScore");
    if      (score >= 75) scoreEl.style.color = "#27ae60";
    else if (score >= 50) scoreEl.style.color = "#f39c12";
    else                  scoreEl.style.color = "#c0392b";

    document.getElementById("scoreBanner").style.display = "block";

    // 2 - Issues List
    let issues = [];
    try {
        issues = typeof data.issuesFound === "string"
            ? JSON.parse(data.issuesFound)
            : (data.issuesFound || []);
    } catch (e) { issues = []; }

    if (issues.length > 0) {
        document.getElementById("issuesList").innerHTML = issues.map(issue => `
            <div style="padding:10px; background:#fff3cd; border-left:4px solid #f39c12;
                        border-radius:4px; margin-bottom:8px; font-size:13px; color:#856404;">
                ⚠ ${issue}
            </div>`).join("");
        document.getElementById("issuesPanel").style.display = "block";
    }

    // 3 - Split Screen
    document.getElementById("originalDisplay").textContent = originalJd;
    document.getElementById("refinedJd").value             = data.refinedJd || "";
    document.getElementById("splitPanel").style.display    = "block";
}

// ── Copy Refined JD ────────────────────────────────────────
function copyRefined() {
    const text = document.getElementById("refinedJd").value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        alert("Refined JD copied to clipboard!");
    });
}

// ── Download Refined JD ────────────────────────────────────
function downloadRefined() {
    const text = document.getElementById("refinedJd").value;
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "refined-job-description.txt";
    a.click();
    URL.revokeObjectURL(url);
}

// ── Dropdown Loaders ───────────────────────────────────────
async function loadJobs() {
    try {
        const res = await fetch('/api/jobs');
        const jobs = await res.json();
        const sel = document.getElementById('jobId');
        sel.innerHTML = '<option value="">-- Select a job --</option>';
        jobs.forEach(j => {
            const o = document.createElement('option');
            o.value = j.jobId;
            o.textContent = j.title + ' (ID: ' + j.jobId + ')';
            sel.appendChild(o);
        });
    } catch (e) {
        console.warn('Failed to load jobs:', e);
    }
}

loadJobs();