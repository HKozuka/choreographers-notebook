# Choreographer's Notebook

A creative workspace for choreographers — a place to catch an idea the moment it happens, keep it next to your notes and reference material, and turn it into movement. Built for the IBM AI Builders Challenge 2026, using **IBM Bob** as the primary development tool.

## Problem statement

Choreographic ideas are fragile and scattered. A phrase idea that arrives mid-rehearsal ends up as a phone video; a structural thought ends up in a paper notebook; music references live in a separate playlist app; and by the time a choreographer sits down to actually build a piece, the raw material is spread across five different tools — or lost entirely. On top of that, choreographers who want a jumping-off point when they're stuck are usually left with generic AI writing tools that have no grounding in actual dance and movement theory, producing suggestions that don't hold up to a trained mover.

## Solution description

Choreographer's Notebook keeps everything about one piece of work in a single project: written and freehand notes, video clips, music references, a rough visual timeline, and an AI ideation tool for when you want a starting point. Every project is self-contained, everything is stored locally in the browser (no account, no backend to lose data to), and the AI ideation feature — **Seeds of Movement** — is explicitly grounded in named choreographic traditions rather than producing generic text.

## AI approach and architecture

Seeds of Movement is built on **IBM watsonx.ai** (`ibm/granite-4-h-small`, via the chat completions endpoint) and is organized around three modes, each with its own dense, instructive system prompt that names the specific frameworks the model must draw from and cite in every response:

| Mode | For | Grounded in |
|---|---|---|
| **Story Mode** | Narrative and event scores — a task or image a performer interprets in the moment | Anna Halprin's life/art scores, Fluxus event scores, Judson Dance Theater |
| **Abstract Mode** | Precise, technical movement cues for rehearsal | Laban Movement Analysis, Forsythe's Improvisation Technologies, Viewpoints |
| **Movement Vocabulary Expander** | Breaking out of habitual movement patterns | Bartenieff Fundamentals, Body-Mind Centering, Skinner Releasing Technique, Contact Improvisation |

A project's own notes can optionally be injected as context ahead of the user's prompt, so suggestions are grounded in what the choreographer is already working on rather than generic output. Requests are routed through a Vite dev-server proxy (see `vite.config.js`) to avoid browser CORS restrictions on IBM's IAM and watsonx endpoints; an IAM bearer token is fetched and cached client-side before each request.

The rest of the app is deliberately local-first and dependency-light: **React 19 + Vite** with **React Router** for navigation; project data and notes in `localStorage`; linked video/music folders remembered via the **File System Access API**; in-app recording via the **MediaRecorder API**; freehand notes via the **Pointer Events API**; and audio waveforms via **Wavesurfer.js**. No backend, no database — the browser is the whole app.

## Parts of the app

**Landing** — a full-screen entry moment with the app's tagline.

**Home** — the hub, with a prominent way into Seeds of Movement and quick access to projects.

**Projects** — an overview of every piece you're working on, shown as drag-to-reorder cards with a cover image (or placeholder) and name. Create, reopen, or trash (recoverable) projects here.

**Inside a project**, four tabs: **Notes** (rich text or freehand stylus/drawing, autosaved), **Video Log** (record in-browser or link a local folder), **Music References** (same, for audio, with waveform playback), and **Visualization** (a lightweight timeline for arranging clips).

**Seeds of Movement** — the AI ideation workspace described above, with a plain-language description and clickable examples for each mode so you can see what it does before committing to it.

## Getting started

```bash
npm install
npm run dev
```

Seeds of Movement needs IBM watsonx.ai credentials (the rest of the app works without them). Create a `.env` file in the project root:

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

## How IBM Bob was used

IBM Bob was the primary development tool used to build this project. It scaffolded the Vite + React application, established the design system (the forest green / cream color tokens, typography, spacing scale) and the routing structure, and built out the core feature set: the home screen with project creation and `localStorage` persistence, the Seeds of Movement page with its initial watsonx.ai integration and the three mode system prompts, the in-browser camera recording modal, the four-tab project page shell, and the Notes, Video Log, Music References, and Visualization tabs themselves — including the File System Access API folder-linking flow and the in-app audio/video recording.

## Design

Forest green and cream, serif display type paired with a simple sans-serif body — meant to feel like an actual notebook rather than a typical SaaS dashboard. Motion is used sparingly and stays fast: entrances, hovers, and page transitions are all short and calm rather than showy.

## Selected challenge theme

Submitted to the [IBM AI Builders Challenge](https://aibuilderschallenge-bob.bemyapp.com/) under the **"Reimagine Creative Industries with AI"** theme.
