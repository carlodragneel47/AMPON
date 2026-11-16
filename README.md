# Ampon: Web-Based Pet Adoption System with Rule-Based Matching

Thesis system for *"A Web-Based Pet Adoption System with Rule-Based Matching"*
(BSIT, PUP Santa Maria Bulacan Campus). Built with the stack listed in Chapter 3:
**HTML, CSS, JavaScript, Express.js and MySQL**.

## Quick start

```bash
npm install
npm start
```

Open http://localhost:3000.

On Windows PowerShell, if `npm` is blocked with "running scripts is disabled", run this once:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (or use `npm.cmd start`).

With no `.env` file the system stores data in `data/db.json`, so it runs without any
database setup. Sample pets (with photos), care records, applications and accounts are loaded on first start.

### Accounts

| Portal | Email | Password |
|---|---|---|
| Admin Console (`/admin/`) | `admin@ampon.local` | `admin123` |
| Adopter account (`/account/`) | `adopter@ampon.local` | `adopter123` |
| Other sample adopters | `maria.santos@example.com`, `paolo.reyes@example.com`, `andrea.villanueva@example.com`, `miguel.garcia@example.com` | `adopter123` |

Administrators can add or remove accounts under **Admin Console → Users**, and every user can change
their password under **Profile and Security**. Change the sample passwords before a public deployment.

### Commands

| Command | What it does |
|---|---|
| `npm start` | Start the server |
| `npm run dev` | Start and restart automatically when files change |
| `npm run upgrade-data` | Add the sample photos and sample accounts to an existing database without deleting anything (stop the server first) |
| `npm run reset-data` | Wipe everything and reload the sample data (stop the server first) |

## Using MySQL (XAMPP / MySQL Server)

1. Start MySQL (XAMPP Control Panel → MySQL → Start).
2. Copy `.env.example` to `.env` and set `DB_HOST=127.0.0.1` (plus `DB_USER` / `DB_PASSWORD` if yours differ from XAMPP's default `root` with no password).
3. `npm start`. The database `ampon_pet_adoption` and its tables are created automatically from
   [database/schema.sql](database/schema.sql). You can open that file in MySQL Workbench to view the design.

Set `SESSION_SECRET` in `.env` so users stay logged in when the server restarts.

## Features, mapped to the Statement of the Problem

| SOP | Where it is in the system |
|---|---|
| 1. Managing rescued pets | **Admin Console → Pets and Care**: register rescued pets with photos, edit and delete records, filter by status. |
| 2. Rule-based matching | **Find a Match** questionnaire → [src/rules.js](src/rules.js). Eligibility rules (E1 to E6) exclude unsuitable pets; compatibility rules (C1 to C12) add or subtract points from a base score of 50. Every result lists the rules that fired. All rules are shown on the **How It Works** page. |
| 3. Streamlined applications | Adopters apply online from a pet's profile; the rule-based score is attached to the application. Admins review, approve or decline under **Admin Console → Applications**; approving marks the pet adopted and closes competing applications. Adopters follow progress under **My Account → My Applications**. |
| 4. Tracking status and care of strays | **Care** records (check ups, vaccinations, treatments, behaviour assessments) with health status and rehabilitation progress. Readiness rules (R1 to R5) block publishing a pet until it is healthy, vaccinated, dewormed, at least 80% rehabilitated and behaviour assessed. Public **Rescue and Care** page. |

**System log records** (Chapter 3, Research Instrument): log ins, registrations, profile views,
searches and filters, matching runs, applications and admin actions are recorded in the `logs` table.
**Admin Console → System Logs** lists them and exports a CSV; **Admin Console → Overview** charts
activity over the last 14 days and summarises feature usage.

## Project structure

```
server.js                    Express entry point, portal guards for /admin and /account
src/api.js                   REST API (auth, pets, care, matching, applications, admin, users)
src/rules.js                 Rule-based matching and readiness engine (IF THEN rules)
src/store/                   Data layer: mysql-store.js (MySQL) and json-store.js (fallback)
src/seed.js                  Sample data;  src/upgrade-data.js / src/reset.js  maintenance scripts
database/schema.sql          MySQL schema

public/                      Public website pages (one HTML file per page)
public/account/              Adopter portal: overview, applications, profile
public/admin/                Admin Console: overview, pets, applications, users, logs, profile
public/css/                  base.css (design tokens), components.css, layout.css, pages/*.css
public/js/core/              Shared modules: api, dom, format, icons, ui, components, layout
public/js/pages/             One script per page (pages/account/*, pages/admin/*)
public/img/                  icons.svg (Lucide icon sprite), pets/ and site/ photos
```

## Credits

Pet and site photos are from [Unsplash](https://unsplash.com) and used under the Unsplash License.
Icons are from [Lucide](https://lucide.dev) (ISC License).
