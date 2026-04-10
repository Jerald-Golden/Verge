# Verge: Endless Road

Web app scaffold: **React 19**, **TypeScript**, **Vite**, **React Router**, and **SCSS**. **ESLint** and **Prettier** are configured.

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
  components/
    App.tsx                 # LoadingProvider + BrowserRouter
    Verge.tsx               # Routes; landing at /
    buttons/
      index.ts              # Re-exports VergeButton, enterSide helpers
      buttons/VergeButton.tsx
      functions/enterSide.ts
    pages/
      LandingPage/
      LoadingScreen/        # Overlay; loadingConfig.ts (timing + labels)
  context/
    LoadingContext.tsx
  styles/
    main.scss               # Entry: @use base, components (app, buttons), pages
    abstracts/              # Design tokens and mixins
    base/                   # Global reset, :root, body
    components/
      _app.scss
      _buttons.scss         # .verge-button (glass, clip-path hover fill, corner dots)
    pages/                  # landing, loading screen, …
  main.tsx                  # StrictMode root; imports styles/main.scss
public/                     # Favicons, icons, site.webmanifest
```
