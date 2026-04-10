# Verge: Endless Road

Web app scaffold: **React 19**, **TypeScript**, **Vite**, and **SCSS**. **ESLint** and **Prettier** are configured. The UI is a minimal shell: a main heading with the project name.

**Static assets:** favicons and PNG icons under `public/`, plus `site.webmanifest` for install / PWA metadata. The document title matches the project name.

## Getting started

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Scripts

| Command                | Description                    |
| ---------------------- | ------------------------------ |
| `npm run dev`          | Dev server with HMR            |
| `npm run build`        | Typecheck + production build   |
| `npm run preview`      | Serve the `dist` build locally |
| `npm run lint`         | ESLint                         |
| `npm run format`       | Prettier write                 |
| `npm run format:check` | Prettier check                 |

## Project layout

```
src/
  components/App/   # Root React component
  styles/           # globals.scss, app.scss, abstracts/ (palette, spacing, borders, radii, motion, z-index, glass, mixins)
  main.tsx          # Entry
public/             # Favicons, icons, site.webmanifest
```
