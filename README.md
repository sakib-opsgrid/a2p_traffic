# A2P Error Report Tool

**Infozillion Teletech BD Ltd · Service Assurance**

A lightweight web tool to generate date-wise A2P error code summary reports from Elastic Stack CSV exports — without Excel, without pivot tables.

---

## What it does

- Upload multiple CSV files (MNO + IPTSP) at once
- Automatically parses the filename to detect **date** and **type** (MNO / IPTSP)
- Counts all rows where `a2pResponseCode ≠ 9000`
- Shows a clean **date-wise table**: MNO | IPTSP | TOTAL
- Multiple files for the same date are **merged** automatically
- Export as CSV or copy to clipboard

---

## File Naming Convention

Files must follow this format exactly:

```
X9_M_YYYYMMDD_HH.csv   →  MNO
X9_I_YYYYMMDD_HH.csv   →  IPTSP
```

**Examples:**
```
X9_M_20260520_19.csv   →  MNO,  date: 2026-05-20
X9_I_20260520_19.csv   →  IPTSP, date: 2026-05-20
X9_M_20260521_09.csv   →  MNO,  date: 2026-05-21
```

---

## Project Structure

```
a2p-report/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── README.md
```

---

## Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `a2p-report`)

2. Push all files:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/a2p-report.git
git push -u origin main
```

3. Go to **Settings → Pages**

4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`

5. Click **Save** — your tool will be live at:
   ```
   https://YOUR_USERNAME.github.io/a2p-report/
   ```

---

## Usage

1. Open the tool URL in any browser
2. Drag & drop CSV files (or click Browse)
3. All files are shown with auto-detected type and date
4. Click **Generate Report**
5. View the date-wise table, export CSV, or copy

---

## Notes

- All processing is **done in the browser** — no data is uploaded anywhere
- Works offline after first load (no server needed)
- Safe to share the GitHub Pages URL with the entire team
