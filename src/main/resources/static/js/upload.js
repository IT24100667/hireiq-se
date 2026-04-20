// static/js/upload.js
// Member 03 — Resume Upload Page Logic
//
// Responsibilities:
//   1. Load jobs from /api/jobs into the dropdown on page load
//   2. Handle drag & drop file selection with preview
//   3. Submit files to POST /api/candidates/upload (Spring Boot)
//   4. Render result cards from the Spring response
//
// Spring endpoint: POST /api/candidates/upload
//   Sends:    FormData { jobId, files[] }
//   Receives: List<CandidateDTO> with fullName, email, phone,
//             originalFilename, chunkCount, status

// ── 1. Load jobs into dropdown ─────────────────────────────
async function loadJobs() {
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
    } catch (e) {
        document.getElementById("jobSelect").innerHTML =
            '<option value="">Failed to load jobs</option>';
    }
}
loadJobs();

// ── 2. Drag & drop zone setup ──────────────────────────────
const dropZone  = document.getElementById("dropZone");
const fileInput = document.getElementById("files");
const fileList  = document.getElementById("fileList");

// We use DataTransfer to track files so we can add/remove individually
let selectedFiles = new DataTransfer();

function setInlineError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message || "";
    el.style.display = message ? "block" : "none";
}

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    addFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
});

function addFiles(files) {
    setInlineError("fileError", "");
    for (const file of files) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'docx'].includes(ext)) {
            setInlineError("fileError", `"${file.name}" is not supported. Use PDF or DOCX only.`);
            continue;
        }
        if (file.size > 10 * 1024 * 1024) {
            setInlineError("fileError", `"${file.name}" is above 10MB. Please upload a smaller file.`);
            continue;
        }
        selectedFiles.items.add(file);
    }
    fileInput.files = selectedFiles.files;
    renderFileList();
}

function removeFile(index) {
    const newDT = new DataTransfer();
    for (let i = 0; i < selectedFiles.files.length; i++) {
        if (i !== index) newDT.items.add(selectedFiles.files[i]);
    }
    selectedFiles = newDT;
    fileInput.files = selectedFiles.files;
    renderFileList();
}

function renderFileList() {
    if (selectedFiles.files.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    fileList.innerHTML = Array.from(selectedFiles.files).map((file, i) => {
        const size = file.size < 1024 * 1024
            ? (file.size / 1024).toFixed(1) + ' KB'
            : (file.size / (1024 * 1024)).toFixed(1) + ' MB';
        const icon = file.name.endsWith('.pdf') ? 'bx-file' : 'bx-file-blank';
        return `
            <div class="file-item">
                <i class='bx ${icon}'></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${size}</span>
                <i class='bx bx-x file-remove' onclick="removeFile(${i})" title="Remove"></i>
            </div>`;
    }).join('');
}

// ── 3. Form submit → POST /api/candidates/upload ──────────
document.getElementById("uploadForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const jobId     = document.getElementById("jobSelect").value;
    const files     = document.getElementById("files").files;
    const statusMsg = document.getElementById("statusMsg");
    const submitBtn = document.getElementById("submitBtn");
    const results   = document.getElementById("results");

    setInlineError("jobError", "");
    setInlineError("fileError", "");

    // Validation
    if (!jobId) {
        setInlineError("jobError", "Please select a job before uploading resumes.");
        document.getElementById("jobSelect").focus();
        statusMsg.textContent = "Please complete required fields.";
        statusMsg.style.color = "var(--accent-red)";
        return;
    }
    if (files.length === 0) {
        setInlineError("fileError", "Add at least one resume file.");
        statusMsg.textContent = "Please complete required fields.";
        statusMsg.style.color = "var(--accent-red)";
        return;
    }

    submitBtn.classList.add("loading");
    statusMsg.textContent = "Uploading & processing...";
    statusMsg.style.color = "var(--text-secondary)";
    results.innerHTML = "";

    // Build multipart form data — Spring expects "files" (list) + "jobId"
    const formData = new FormData();
    formData.append("jobId", jobId);
    for (const file of files) {
        formData.append("files", file);
    }

    try {
        // Allow up to 10 minutes for large batches (50 resumes processed sequentially through Flask AI)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

        const response = await fetch("/api/candidates/upload", {
            method: "POST",
            body:   formData,
            signal: controller.signal
            // Do NOT set Content-Type — browser sets it automatically for FormData
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || `Upload failed (HTTP ${response.status})`);
        }

        const data = await response.json();

        statusMsg.textContent = `Done! ${data.length} resume(s) processed.`;
        statusMsg.style.color = "var(--accent-green)";

        // ── 4. Render one result card per candidate ────────
        results.innerHTML = data.map(candidate => `
            <div class="result-card">
                <div class="result-icon"><i class='bx bx-user'></i></div>
                <div class="result-info">
                    <div class="result-name">
                        ${candidate.fullName || "Name not detected"}
                    </div>
                    <div class="result-meta">
                        ${candidate.email    || "No email"} &nbsp;&middot;&nbsp;
                        ${candidate.phone    || "No phone"} &nbsp;&middot;&nbsp;
                        ${candidate.originalFilename}
                        &nbsp;&middot;&nbsp; ${candidate.chunkCount || 0} chunks
                    </div>
                </div>
                <span class="status ${candidate.status}">${candidate.status}</span>
            </div>
        `).join("");

        // Clear the file list after successful upload
        selectedFiles = new DataTransfer();
        fileInput.files = selectedFiles.files;
        renderFileList();

    } catch (error) {
        if (error.name === 'AbortError') {
            statusMsg.textContent = "Error: Upload timed out. Try uploading fewer resumes at a time.";
        } else {
            statusMsg.textContent = "Error: " + error.message;
        }
        statusMsg.style.color = "var(--accent-red)";
    } finally {
        submitBtn.classList.remove("loading");
    }
});