// Session ID 
let sessionId = "session_" + Math.random().toString(36).substring(2, 10);
document.getElementById("session-display").textContent = sessionId;

let deleteTargetId = null;

// On Page Load 
document.addEventListener("DOMContentLoaded", () => {
    loadJobs();
    loadSessionHistory();
});

// Load Jobs into Dropdown 
async function loadJobs() {
    try {
        const res  = await fetch("/api/jobs");
        const jobs = await res.json();
        const select = document.getElementById("job-select");
        jobs.forEach(job => {
            const option = document.createElement("option");
            option.value       = job.jobId;
            option.textContent = `${job.title} (ID: ${job.jobId})`;
            select.appendChild(option);
        });
    } catch (err) {
        console.log("Could not load jobs:", err);
    }
}

// Load Session History into Sidebar 
async function loadSessionHistory() {
    try {
        const res      = await fetch("/api/chat/sessions");
        const sessions = await res.json();
        renderSidebar(sessions);
    } catch (err) {
        console.log("Could not load sessions:", err);
    }
}

// Render Sidebar Session List 
function renderSidebar(sessions) {
    const list = document.getElementById("history-list");

    if (!sessions || sessions.length === 0) {
        list.innerHTML = '<div class="history-empty">No past conversations yet</div>';
        return;
    }

    list.innerHTML = sessions.map(s => `
        <div class="session-item ${s.sessionId === sessionId ? 'active' : ''}"
             id="sess-${s.sessionId}"
             onclick="loadSession('${s.sessionId}')">
            <div class="session-info">
                <div class="session-preview">${escapeHtml(s.preview)}</div>
                <div class="session-date">${formatDate(s.createdAt)}</div>
            </div>
            <button class="session-delete" title="Delete conversation"
                    onclick="event.stopPropagation(); askDelete('${s.sessionId}')">
                <i class='bx bx-trash'></i>
            </button>
        </div>
    `).join("");
}

// Load a Past Session into Chat Area 
async function loadSession(sid) {
    try {
        const res      = await fetch(`/api/chat/history/${sid}`);
        const messages = await res.json();

        sessionId = sid;
        document.getElementById("session-display").textContent = sessionId;

        document.querySelectorAll(".session-item").forEach(el => el.classList.remove("active"));
        const el = document.getElementById(`sess-${sid}`);
        if (el) el.classList.add("active");

        const chatBox = document.getElementById("chat-box");
        chatBox.innerHTML = "";

        messages.forEach(msg => {
            appendMessageWithTime("user", msg.userMessage, msg.createdAt);
            appendMessageWithTime("bot",  msg.botResponse, msg.createdAt);
        });

        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (err) {
        console.error("Could not load session:", err);
    }
}

// Start a New Chat 
function startNewChat() {
    sessionId = "session_" + Math.random().toString(36).substring(2, 10);
    document.getElementById("session-display").textContent = sessionId;

    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML = `
        <div class="msg bot">
            <div class="avatar"><i class='bx bx-bot'></i></div>
            <div>
                <div class="bubble">Hello! I'm HireIQ Assistant. Ask me anything about your candidates — I can search resumes, compare scores, and provide insights.</div>
                <div class="timestamp">Just now</div>
            </div>
        </div>`;

    document.querySelectorAll(".session-item").forEach(el => el.classList.remove("active"));
}

// Delete Session 
function askDelete(sid) {
    deleteTargetId = sid;
    document.getElementById("del-toast").classList.add("show");
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    try {
        await fetch(`/api/chat/session/${deleteTargetId}`, { method: "DELETE" });
        if (deleteTargetId === sessionId) startNewChat();
        await loadSessionHistory();
    } catch (err) {
        console.error("Delete failed:", err);
    }
    deleteTargetId = null;
    document.getElementById("del-toast").classList.remove("show");
}

function cancelDelete() {
    deleteTargetId = null;
    document.getElementById("del-toast").classList.remove("show");
}

// Get current time string 
function timeNow() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Send Message 
async function sendMessage() {
    const input   = document.getElementById("msg-input");
    const message = input.value.trim();

    // ── Empty message validation ──
    if (!message) {
        const toast = document.getElementById("input-toast");
        toast.classList.add("show");
        input.style.borderColor = "rgba(239, 68, 68, 0.5)";
        input.focus();

        // Auto-dismiss after 3 seconds
        clearTimeout(window._toastTimer);
        window._toastTimer = setTimeout(() => {
            toast.classList.remove("show");
            input.style.borderColor = "";
        }, 3000);
        return;
    }

    // Clear any lingering toast
    document.getElementById("input-toast").classList.remove("show");
    input.style.borderColor = "";

    const jobSelect = document.getElementById("job-select");
    const jobId     = jobSelect.value ? parseInt(jobSelect.value) : null;

    appendMessage("user", message);
    input.value = "";

    const typingEl = appendTyping();

    try {
        const res = await fetch("/api/chat/message", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, sessionId, jobId })
        });

        const data = await res.json();
        typingEl.remove();

        if (data.success) {
            appendMessage("bot", data.response);
        } else {
            appendMessage("bot", "Error: " + (data.error || "Something went wrong."));
        }

        await loadSessionHistory();

    } catch (err) {
        typingEl.remove();
        appendMessage("bot", "Could not reach the server. Please check that Spring Boot is running.");
        console.error("Chat error:", err);
    }
}

// Allow Enter Key to Send 
document.getElementById("msg-input").addEventListener("keydown", function(e) {
    if (e.key === "Enter") sendMessage();
});

// Dismiss empty-message toast on typing 
document.getElementById("msg-input").addEventListener("input", function() {
    if (this.value.trim()) {
        document.getElementById("input-toast").classList.remove("show");
        this.style.borderColor = "";
        clearTimeout(window._toastTimer);
    }
});

// Example prompt chips 
function useExample(el) {
    document.getElementById("msg-input").value = el.textContent;
    document.getElementById("msg-input").focus();
}

// Append Message (live time) 
function appendMessage(role, text) {
    return appendMessageWithTime(role, text, null);
}

// Append Message (with timestamp) 
function appendMessageWithTime(role, text, timestamp) {
    const chatBox = document.getElementById("chat-box");
    const time    = timestamp ? formatDate(timestamp) : timeNow();

    const msgDiv    = document.createElement("div");
    msgDiv.className = `msg ${role}`;

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "avatar";
    avatarDiv.innerHTML = `<i class='bx ${role === "user" ? "bx-user" : "bx-bot"}'></i>`;

    const contentDiv = document.createElement("div");
    const bubble     = document.createElement("div");
    bubble.className = "bubble";

    // FIX: Bot messages render markdown, user messages stay plain 
    if (role === "bot") {
        bubble.innerHTML = formatMarkdown(text);
    } else {
        bubble.textContent = text;
    }

    const ts = document.createElement("div");
    ts.className  = "timestamp";
    ts.textContent = time;

    contentDiv.appendChild(bubble);
    contentDiv.appendChild(ts);
    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(contentDiv);
    chatBox.appendChild(msgDiv);

    chatBox.scrollTop = chatBox.scrollHeight;
    return msgDiv;
}

// Format Markdown 
function formatMarkdown(text) {
    if (!text) return "";
    return text
        // **bold**
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        // bullet lines starting with * or -
        .replace(/^[\*\-]\s+(.+)$/gm, "<li>$1</li>")
        // wrap bullet groups in <ul>
        .replace(/((?:<li>.*<\/li>\n?)+)/g,
            '<ul style="margin:6px 0 6px 20px;padding:0;list-style:disc;">$1</ul>')
        // line breaks
        .replace(/\n/g, "<br>");
}

// Typing Indicator
function appendTyping() {
    const chatBox = document.getElementById("chat-box");
    const div = document.createElement("div");
    div.className = "msg bot";
    div.innerHTML = `
        <div class="avatar"><i class='bx bx-bot'></i></div>
        <div>
            <div class="bubble">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

// Helpers
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    if (isNaN(d)) return dt;
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
