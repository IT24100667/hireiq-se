// static/js/job-input.js
// Handles job creation form with validation and character counting

// ── Character counter for description ──────────────────────
document.getElementById("jobDescription").addEventListener("input", function() {
    const len = this.value.length;
    const counter = document.getElementById("charCount");
    counter.textContent = `${len.toLocaleString()} / 10,000 characters`;
    counter.className = "char-count" + (len < 50 ? " warn" : " good");
    this.classList.remove("input-invalid");
    document.getElementById("descError").style.display = "none";
});

// Clear error on title typing
document.getElementById("jobTitle").addEventListener("input", function() {
    this.classList.remove("input-invalid");
    document.getElementById("titleError").style.display = "none";
});

async function createJob() {
    const title       = document.getElementById("jobTitle").value.trim();
    const department  = document.getElementById("jobDepartment").value.trim();
    const description = document.getElementById("jobDescription").value.trim();
    const statusMsg   = document.getElementById("statusMsg");
    const createBtn   = document.getElementById("createBtn");

    // Validation with first-error focus for easier correction.
    let valid = true;
    let firstInvalid = null;

    if (!title) {
        const titleInput = document.getElementById("jobTitle");
        titleInput.classList.add("input-invalid");
        document.getElementById("titleError").style.display = "block";
        valid = false;
        firstInvalid = firstInvalid || titleInput;
    }

    if (!description) {
        const descInput = document.getElementById("jobDescription");
        descInput.classList.add("input-invalid");
        document.getElementById("descError").style.display = "block";
        valid = false;
        firstInvalid = firstInvalid || descInput;
    }

    if (!valid) {
        statusMsg.textContent = "Please fix highlighted fields.";
        statusMsg.style.color = "var(--accent-red)";
        if (firstInvalid) {
            firstInvalid.focus();
        }
        return;
    }

    createBtn.classList.add("loading");
    statusMsg.textContent = "Creating job posting...";
    statusMsg.style.color = "var(--text-secondary)";

    try {
        const response = await fetch("/api/jobs", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, department })
        });

        const job = await response.json();

        if (!response.ok) throw new Error(job.error || "Failed to create job");

        // Show success card, hide form
        document.getElementById("formCard").style.display = "none";
        document.getElementById("successCard").style.display = "block";
        document.getElementById("createdJobId").textContent = "# " + job.jobId;
        statusMsg.textContent = "";

    } catch (error) {
        statusMsg.textContent = "Error: " + error.message;
        statusMsg.style.color = "var(--accent-red)";
    } finally {
        createBtn.classList.remove("loading");
    }
}

function resetForm() {
    document.getElementById("jobTitle").value       = "";
    document.getElementById("jobDepartment").value  = "";
    document.getElementById("jobDescription").value = "";
    document.getElementById("successCard").style.display = "none";
    document.getElementById("formCard").style.display    = "block";
    document.getElementById("statusMsg").textContent     = "";
    document.getElementById("charCount").textContent     = "0 / 10,000 characters";
    document.getElementById("charCount").className       = "char-count";
    document.getElementById("titleError").style.display  = "none";
    document.getElementById("descError").style.display   = "none";
    document.getElementById("jobTitle").classList.remove("input-invalid");
    document.getElementById("jobDescription").classList.remove("input-invalid");
}