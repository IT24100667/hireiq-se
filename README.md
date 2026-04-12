# HireIQ Security and Role Flow

This project now includes simple role-based login using Spring Security.

## Roles

- `ADMIN`: full access, including `/admin/dashboard` and admin APIs.
- `HR`: access to existing hiring workflow pages and APIs.
- `USER`: access to `/user-dashboard` only (placeholder for future features).

## Default Login Accounts (first run)

- `admin / admin123`
- `hr / hr12345`
- `user / user12345`

Default users are created automatically if they do not exist.

## Key Pages

- Login: `/login`
- HR dashboard: `/dashboard`
- Admin dashboard: `/admin/dashboard`
- User dashboard: `/user-dashboard`

## Run

Use Maven wrapper:

```bash
./mvnw spring-boot:run
```

On Windows PowerShell:

```powershell
.\mvnw.cmd spring-boot:run
```

Then open `http://localhost:8080/login`.

