// static/js/interview.js
// Member 06 - Handles the Interview Question Generator page.

let allQuestions = [];

function setFieldMsg(message, isError = false) {
    const fieldMsg = document.getElementById('fieldMsg');
    if (!fieldMsg) return;
    fieldMsg.textContent = message || '';
    fieldMsg.classList.toggle('error', !!isError);
}

function getValidIds() {
    const candidateId = parseInt(document.getElementById("candidateId").value, 10);
    const jobId = parseInt(document.getElementById("jobId").value, 10);

    if (!jobId || !candidateId) {
        setFieldMsg('Please select a Job and a Candidate.', true);
        return null;
    }

    setFieldMsg('');
    return { candidateId, jobId };
}

// ── Custom Confirm Dialog ──────────────────────────────────
function showConfirm() {
    return new Promise(resolve => {
        const overlay   = document.getElementById('confirmOverlay');
        const okBtn     = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        overlay.classList.add('active');

        function cleanup(result) {
            overlay.classList.remove('active');
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            resolve(result);
        }

        const onOk     = () => cleanup(true);
        const onCancel = () => cleanup(false);

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);

        // Click outside to cancel
        overlay.addEventListener('click', e => {
            if (e.target === overlay) cleanup(false);
        }, { once: true });
    });
}

// ── Generate Questions ─────────────────────────────────────
async function generateQuestions() {
    const ids         = getValidIds();
    const generateBtn = document.getElementById("generateBtn");
    const generateMsg = document.getElementById("generateMsg");

    if (!ids) {
        generateMsg.style.color = "#c0392b";
        generateMsg.textContent = "Please fix the inputs above.";
        return;
    }

    generateBtn.disabled    = true;
    generateMsg.style.color = "#666";
    generateMsg.textContent = "Generating questions... this may take a moment.";

    document.getElementById("questionsOutput").style.display = "none";

    try {
        const response = await fetch("/api/interview/generate", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                candidateId: ids.candidateId,
                jobId:       ids.jobId
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Generation failed");

        generateMsg.style.color = "#27ae60";
        generateMsg.textContent = `Done! ${data.length} questions generated.`;
        allQuestions = data;
        renderQuestions(data);

    } catch (error) {
        generateMsg.style.color = "#c0392b";
        generateMsg.textContent = "Error: " + error.message;
    } finally {
        generateBtn.disabled = false;
    }
}

// ── Load Previously Saved Questions ───────────────────────
async function loadSaved() {
    const ids         = getValidIds();
    const generateMsg = document.getElementById("generateMsg");

    if (!ids) {
        generateMsg.style.color = "#c0392b";
        generateMsg.textContent = "Please fix the inputs above.";
        return;
    }

    generateMsg.style.color = "#666";
    generateMsg.textContent = "Loading saved questions...";

    try {
        const response = await fetch(
            `/api/interview/questions?candidateId=${ids.candidateId}&jobId=${ids.jobId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load");

        if (data.length === 0) {
            generateMsg.style.color = "#f39c12";
            generateMsg.textContent = "No saved questions found. Click Generate Questions.";
            return;
        }

        generateMsg.style.color = "#27ae60";
        generateMsg.textContent = `Loaded ${data.length} saved questions.`;
        allQuestions = data;
        renderQuestions(data);

    } catch (error) {
        generateMsg.style.color = "#c0392b";
        generateMsg.textContent = "Error: " + error.message;
    }
}

// ── Render Questions ───────────────────────────────────────
function renderQuestions(questions) {

    const categories = {
        "MISSING_SKILLS":  { listId: "missingSkillsList",  sectionId: "missingSkillsSection"  },
        "WEAK_EXPERIENCE": { listId: "weakExperienceList", sectionId: "weakExperienceSection" },
        "RED_FLAGS":       { listId: "redFlagsList",       sectionId: "redFlagsSection"       }
    };

    // Clear all sections first
    Object.values(categories).forEach(c => {
        document.getElementById(c.listId).innerHTML        = "";
        document.getElementById(c.sectionId).style.display = "none";
    });

    // Group questions by category
    questions.forEach((q, index) => {
        const cat = categories[q.category];
        if (!cat) return;

        const el = document.createElement("div");
        el.className = 'question-item';
        el.id = `question-card-${q.questionId}`;

        el.innerHTML = `
            <div style="display:flex; justify-content:space-between;
                        align-items:flex-start; gap:8px;">
                <div style="flex:1;">
                    <div style="font-size:14px; font-weight:bold; margin-bottom:6px;">
                        Q${index + 1}. ${q.questionText}
                    </div>
                    <div style="font-size:12px; color:#888; font-style:italic;">
                        💡 ${q.reason || ""}
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;
                            align-items:flex-end; flex-shrink:0;">
                    <button onclick="copySingle(${index})"
                            class="btn btn-secondary"
                            style="padding:4px 10px; font-size:11px; white-space:nowrap;">
                        Copy
                    </button>
                    <button onclick="deleteQuestion(${q.questionId}, this)"
                            class="action-btn delete-btn"
                            style="padding:4px 10px; font-size:11px; white-space:nowrap;">
                        <i class='bx bx-trash'></i> Delete
                    </button>
                </div>
            </div>`;

        document.getElementById(cat.listId).appendChild(el);
        document.getElementById(cat.sectionId).style.display = "block";
    });

    document.getElementById("questionsOutput").style.display = "block";
}

// ── Delete Single Question ─────────────────────────────────
async function deleteQuestion(id, buttonEl) {
    const confirmed = await showConfirm();
    if (!confirmed) return;

    buttonEl.disabled  = true;
    buttonEl.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Deleting...';

    try {
        const res = await fetch(`/api/interview/questions/${id}`, { method: 'DELETE' });

        if (res.ok) {
            // Keep local array in sync so copyAll / downloadAll stay correct
            allQuestions = allQuestions.filter(q => q.questionId !== id);

            // Animate card out then remove from DOM
            const card = document.getElementById(`question-card-${id}`);
            if (card) {
                card.classList.add('removing');
                card.addEventListener('animationend', () => {
                    const parentList = card.parentElement;
                    card.remove();

                    // Hide section header if no questions remain
                    if (parentList && parentList.children.length === 0) {
                        const section = parentList.closest('.card');
                        if (section) section.style.display = 'none';
                    }

                    // Hide entire output block if all sections are empty
                    const anyVisible = ['missingSkillsSection', 'weakExperienceSection', 'redFlagsSection']
                        .some(sid => document.getElementById(sid).style.display !== 'none');
                    if (!anyVisible) {
                        document.getElementById('questionsOutput').style.display = 'none';
                    }
                });
            }

            const generateMsg = document.getElementById("generateMsg");
            generateMsg.style.color = "#27ae60";
            generateMsg.textContent = "Question deleted.";

        } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete question.');
            buttonEl.disabled  = false;
            buttonEl.innerHTML = '<i class="bx bx-trash"></i> Delete';
        }

    } catch (e) {
        alert('Network error. Please try again.');
        buttonEl.disabled  = false;
        buttonEl.innerHTML = '<i class="bx bx-trash"></i> Delete';
    }
}

// ── Copy Single Question ───────────────────────────────────
function copySingle(index) {
    const q = allQuestions[index];
    if (!q) return;
    navigator.clipboard.writeText(q.questionText).then(() => {
        const generateMsg = document.getElementById("generateMsg");
        generateMsg.style.color = "#27ae60";
        generateMsg.textContent = "Question copied.";
    });
}

// ── Copy All Questions ─────────────────────────────────────
function copyAll() {
    if (allQuestions.length === 0) return;
    const text = allQuestions.map((q, i) =>
        `[${q.category}]\nQ${i + 1}. ${q.questionText}\nReason: ${q.reason}\n`
    ).join("\n");
    navigator.clipboard.writeText(text).then(() => {
        const generateMsg = document.getElementById("generateMsg");
        generateMsg.style.color = "#27ae60";
        generateMsg.textContent = "All questions copied.";
    });
}

// ── Download All Questions ─────────────────────────────────
function downloadAll() {
    if (allQuestions.length === 0) return;
    const text = allQuestions.map((q, i) =>
        `[${q.category}]\nQ${i + 1}. ${q.questionText}\nReason: ${q.reason}\n`
    ).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "interview-questions.txt";
    a.click();
    URL.revokeObjectURL(url);
}

// ── Dropdown Loaders ───────────────────────────────────────
async function loadJobs() {
    try {
        const res  = await fetch('/api/jobs');
        const jobs = await res.json();
        const sel  = document.getElementById('jobId');
        sel.innerHTML = '<option value="">-- Select a job --</option>';
        jobs.forEach(j => {
            const o = document.createElement('option');
            o.value       = j.jobId;
            o.textContent = j.title + ' (ID: ' + j.jobId + ')';
            sel.appendChild(o);
        });
    } catch (e) {
        console.warn('Failed to load jobs:', e);
    }
}

async function loadCandidates() {
    const jobId = document.getElementById('jobId').value;
    const sel   = document.getElementById('candidateId');
    sel.innerHTML = '<option value="">-- Select a candidate --</option>';

    if (!jobId) return;

    try {
        const res        = await fetch('/api/candidates?jobId=' + jobId);
        const candidates = await res.json();
        candidates.forEach(c => {
            const o = document.createElement('option');
            o.value       = c.candidateId;
            o.textContent = (c.fullName || 'Unknown') + ' (ID: ' + c.candidateId + ')';
            sel.appendChild(o);
        });
    } catch (e) {
        console.warn('Failed to load candidates:', e);
    }
}

loadJobs();