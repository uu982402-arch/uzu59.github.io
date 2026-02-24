# Auto build version (Cloudflare Pages)

This repo uses a single cache-busting version value.

- `assets/js/build.ver.js` is generated automatically at build time.
- `assets/js/build.loader.js` appends `?v=<BUILD_VER>` to global CSS/JS requests.
- `build.txt` is generated automatically (quick deploy verification).

## 1) Cloudflare Pages settings

Workers & Pages → your project → Settings → Build & deployments

- **Framework preset**: None
- **Build command**: `npm run build`
- **Build output directory**: `.` (dot)

After that, every deploy will generate a new build version based on time + commit SHA.

## 2) Verify

Open:
- `/build.txt`

You should see:
- `build=vYYYYMMDD-HHMM-<sha>-<branch>`

## Notes

- `build.ver.js` is no-cache (`must-revalidate`) so clients always re-check it.
- All other `/assets/*` keep long immutable cache for performance.
