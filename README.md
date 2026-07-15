# Choreographer's Notebook

A creative workspace for choreographers — a place to catch an idea the moment it happens, keep it next to your notes and reference material, and turn it into movement. Built for the IBM AI Builders Challenge 2026.

## What it is

Most choreographic ideas get lost between the studio and wherever notes normally live — a phone note, a video buried in a camera roll, a voice memo, a stray thought. Choreographer's Notebook keeps everything about one piece in one place: written and drawn notes, video clips, music references, a rough visual timeline, and an AI ideation tool for when you're stuck or want a starting point grounded in real dance theory.

Everything is organized by **project** (one project per piece you're working on), and everything is stored locally in your browser — nothing leaves your machine except the prompts you choose to send to the AI ideation feature.

## Parts of the app

**Landing** — a full-screen entry moment with the app's tagline. Tap anywhere to go in.

**Home** — the hub. A prominent way into Seeds of Movement, plus quick access to your projects.

**Projects** — an overview of every piece you're working on, shown as cards with a cover image (or a placeholder) and a name. Create new projects here, reopen old ones, or send them to the trash (recoverable) when you're done.

**Inside a project**, four tabs:

- **Notes** — rich text or freehand stylus/drawing notes, autosaved as you go.
- **Video Log** — record short clips right in the browser, or link a local folder of footage for in-app playback.
- **Music References** — same idea for audio: record inside the app or link a local folder, with waveform playback.
- **Visualization** — a lightweight timeline for arranging video and audio clips to sketch out a piece's structure.

**Seeds of Movement** — an AI ideation workspace, separate from any one project. Three modes, each grounded in a real dance/choreography tradition rather than generic AI output:

| Mode | For | Draws on |
|---|---|---|
| **Story Mode** | Narrative and event scores — a task or image a performer interprets in the moment, not fixed counts | Anna Halprin's life/art scores, Fluxus event scores, Judson Dance Theater |
| **Abstract Mode** | Precise, technical movement cues you can drop straight into rehearsal | Laban Movement Analysis, Forsythe's Improvisation Technologies, Viewpoints |
| **Movement Vocabulary Expander** | Breaking out of movement habits you keep defaulting to | Bartenieff Fundamentals, Body-Mind Centering, Skinner Releasing Technique, Contact Improvisation |

Each mode explains itself with a plain-language description and a couple of clickable examples that generate a real response, so you can see what it does before committing to it. You can also attach a project's notes as context, so the AI's suggestions are grounded in what you're already working on.

## Getting started

```bash
npm install
npm run dev
```

The app needs IBM watsonx.ai credentials for Seeds of Movement to work (the rest of the app works without them). Create a `.env` file in the project root:

```
VITE_WATSONX_API_KEY=your_ibm_api_key_here
VITE_WATSONX_PROJECT_ID=your_watsonx_project_id_here
```

Other useful commands:

```bash
npm run build     # production build
npm run preview   # preview the production build locally
npm run lint      # run oxlint
```

## How it's built

- **React 19 + Vite** for the app itself, with **React Router** handling navigation between the landing page, home, projects, and individual project screens.
- **IBM watsonx.ai** (the `ibm/granite-4-h-small` model) powers Seeds of Movement. Requests go through a Vite dev-server proxy to avoid browser CORS restrictions on IBM's endpoints — see `vite.config.js`.
- **Everything else is local-first**: project data, notes, and settings live in `localStorage`; linked video/music folders are remembered via the **File System Access API** (through an IndexedDB-backed helper); in-app recording uses the **MediaRecorder API**; the stylus/drawing notes use the **Pointer Events API**; and audio waveforms are rendered with **Wavesurfer.js**.
- No backend, no database, no account system — the browser is the whole app.

## Design

Forest green and cream, serif display type paired with a simple sans-serif body — meant to feel like an actual notebook rather than a typical SaaS dashboard. Motion is used sparingly and stays fast: entrances, hovers, and page transitions are all short and calm rather than showy.

## Challenge

Submitted to the [IBM AI Builders Challenge](https://aibuilderschallenge-bob.bemyapp.com/) — "Reimagine Creative Industries with AI" theme.
