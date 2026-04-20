// static/js/navbar.js
// Loads the shared navbar + Boxicons CDN into every page.
// Handles theme toggle (light/dark) with localStorage persistence.

// ── Apply saved theme IMMEDIATELY (before page renders) ────
(function() {
    const saved = localStorage.getItem('hireiq-theme');
    if (saved === 'light') {
        document.documentElement.classList.add('light-mode');
    }
})();

async function loadNavbar() {
    try {
        // Inject Boxicons CSS if not already present
        if (!document.querySelector('link[href*="boxicons"]')) {
            const link = document.createElement("link");
            link.rel  = "stylesheet";
            link.href = "https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css";
            document.head.appendChild(link);
        }

        const response = await fetch("/components/navbar.html");
        const html     = await response.text();

        const container = document.createElement("div");
        container.innerHTML = html;
        document.body.insertBefore(container.firstElementChild, document.body.firstChild);

        await applyRoleBasedNavigation();

        // Highlight the current page link
        const currentPath = window.location.pathname;
        document.querySelectorAll("nav a:not(.brand)").forEach(link => {
            if (link.getAttribute("href") === currentPath) {
                link.classList.add("active-link");
            }
        });

        // ── Theme toggle ───────────────────────────────────
        const toggleBtn = document.getElementById("themeToggle");
        if (toggleBtn) {
            updateToggleIcon(toggleBtn);
            toggleBtn.addEventListener("click", () => {
                document.documentElement.classList.toggle("light-mode");
                const isLight = document.documentElement.classList.contains("light-mode");
                localStorage.setItem("hireiq-theme", isLight ? "light" : "dark");
                updateToggleIcon(toggleBtn);
            });
        }

    } catch (error) {
        console.error("Could not load navbar:", error);
    }
}

async function applyRoleBasedNavigation() {
    let role = "HR";
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const me = await response.json();
            role = me.role || role;
        }
    } catch (e) {
        console.warn('Unable to load current user role:', e);
    }

    const brand = document.getElementById('brandHomeLink');
    if (brand) {
        brand.setAttribute('href', role === 'ADMIN' ? '/admin/dashboard' : role === 'USER' ? '/user-dashboard' : '/home');
    }

    document.querySelectorAll('nav a[data-roles]').forEach(link => {
        const roles = (link.getAttribute('data-roles') || '').split(',').map(x => x.trim());
        if (!roles.includes(role)) {
            link.remove();
        }
    });

    return role;
}


function updateToggleIcon(btn) {
    const isLight = document.documentElement.classList.contains("light-mode");
    btn.innerHTML = isLight ? "<i class='bx bx-sun'></i>" : "<i class='bx bx-moon'></i>";
    btn.title     = isLight ? "Switch to dark mode" : "Switch to light mode";
}

loadNavbar();