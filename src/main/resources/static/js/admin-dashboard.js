// ── User Management (existing code - unchanged) ───────────────────────────

async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

    try {
        const res = await fetch('/api/admin/users');
        const users = await res.json();

        tableBody.innerHTML = '';
        if (!users.length) {
            tableBody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            const canToggle = user.role !== 'ADMIN';
            const statusClass = user.enabled ? 'active' : 'disabled';
            const actionLabel = user.enabled ? 'Disable' : 'Enable';

            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td><span class="state-badge ${statusClass}">${user.enabled ? 'Active' : 'Disabled'}</span></td>
                <td>${new Date(user.createdAt).toLocaleString()}</td>
                <td>
                    ${canToggle ? `<button data-id="${user.id}" data-enabled="${!user.enabled}" class="toggle-btn">${actionLabel}</button>` : '-'}
                </td>
            `;
            tableBody.appendChild(row);
        });

        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const enabled = btn.getAttribute('data-enabled') === 'true';
                await fetch(`/api/admin/users/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled })
                });
                await loadUsers();
            });
        });
    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="5">Failed to load users.</td></tr>';
    }
}

async function createUser(event) {
    event.preventDefault();

    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role     = document.getElementById('newRole').value;
    const msg      = document.getElementById('createMsg');

    msg.textContent = '';

    const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
    });

    const data = await res.json();
    if (!res.ok) {
        msg.style.color = '#b91c1c';
        msg.textContent = data.error || 'Could not create user';
        return;
    }

    msg.style.color = '#047857';
    msg.textContent = `Created ${data.role} user: ${data.username}`;
    document.getElementById('createUserForm').reset();
    await loadUsers();
}

document.getElementById('createUserForm').addEventListener('submit', createUser);
loadUsers();


// ── API Provider Management (new code) ───────────────────────────────────

// Loads all providers from Spring and renders them in the table
async function loadProviders() {
    const tableBody = document.getElementById('providersTableBody');
    tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

    try {
        const res = await fetch('/api/providers');
        const providers = await res.json();

        tableBody.innerHTML = '';

        if (!providers.length) {
            tableBody.innerHTML = '<tr><td colspan="5" style="color:#9ca3af;">No providers added yet.</td></tr>';
            return;
        }

        providers.forEach(p => {
            const row = document.createElement('tr');

            // Show only first 6 and last 4 characters of the key — rest is masked
            const masked = p.apiKey.substring(0, 6) + '••••••••' + p.apiKey.slice(-4);

            // Active provider gets a green badge, others get grey
            const statusBadge = p.isActive
                ? `<span class="state-badge active">Active</span>`
                : `<span class="state-badge inactive">Inactive</span>`;

            // Don't show Activate button if already active
            const activateBtn = p.isActive
                ? ''
                : `<button class="btn-sm btn-activate" onclick="activateProvider(${p.id})">Set Active</button>`;

            row.innerHTML = `
                <td>${p.name}</td>
                <td>${p.modelName}</td>
                <td><span class="key-mask">${masked}</span></td>
                <td>${statusBadge}</td>
                <td>
                    ${activateBtn}
                    <button class="btn-sm btn-delete" onclick="deleteProvider(${p.id}, '${p.name}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="5" style="color:#b91c1c;">Failed to load providers.</td></tr>';
    }
}

// Adds a new provider using the form values
async function addProvider(event) {
    event.preventDefault();

    const name      = document.getElementById('providerName').value.trim();
    const apiKey    = document.getElementById('providerKey').value.trim();
    const modelName = document.getElementById('providerModel').value.trim();
    const msg       = document.getElementById('providerMsg');

    msg.textContent = '';

    const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, apiKey, modelName })
    });

    if (!res.ok) {
        msg.style.color = '#b91c1c';
        msg.textContent = 'Failed to add provider.';
        return;
    }

    msg.style.color = '#047857';
    msg.textContent = `Provider "${name}" added successfully.`;
    document.getElementById('addProviderForm').reset();
    await loadProviders();
}

// Sets a provider as active — Flask will use this key from now on
async function activateProvider(id) {
    const res = await fetch(`/api/providers/${id}/activate`, { method: 'PUT' });

    if (!res.ok) {
        alert('Failed to activate provider.');
        return;
    }

    await loadProviders();
}

// Deletes a provider — asks for confirmation first
async function deleteProvider(id, name) {
    const confirmed = confirm(`Delete provider "${name}"? This cannot be undone.`);
    if (!confirmed) return;

    const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
        // Spring returns an error message if trying to delete the active one
        alert(data.error || 'Failed to delete provider.');
        return;
    }

    await loadProviders();
}

document.getElementById('addProviderForm').addEventListener('submit', addProvider);
loadProviders();