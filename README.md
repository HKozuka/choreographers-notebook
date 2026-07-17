# Choreographer's Notebook

A creative workspace for choreographers — a place to catch an idea the moment it happens, keep it next to your notes and reference material, and turn it into movement. Built for the IBM AI Builders Challenge 2026, using **IBM Bob** as the primary development tool.

## Problem Statement

Choreographic ideas are fragile and scattered. A phrase idea that arrives mid-rehearsal ends up as a phone video; a structural thought ends up in a paper notebook; music references live in a separate playlist app; and by the time a choreographer sits down to actually build a piece, the raw material is spread across five different tools — or lost entirely. On top of that, choreographers who want a jumping-off point when they're stuck are usually left with generic AI writing tools that have no grounding in actual dance and movement theory, producing suggestions that don't hold up to a trained mover.

## Solution Description

Choreographer's Notebook keeps everything about one piece of work in a single project: written and freehand notes, video clips, music references, a rough visual timeline, and an AI ideation tool for when you want a starting point. Every project is self-contained, everything is stored locally in the browser (no account, no backend to lose data to), and the AI ideation feature — **Seeds of Movement** — is explicitly grounded in named choreographic traditions rather than producing generic text.

## AI Approach and Architecture

Seeds of Movement is built on **IBM watsonx.ai** (`ibm/granite-4-h-small`, via the chat completions endpoint) and is organized around three modes, each with its own dense, instructive system prompt that names the specific frameworks the model must draw from and cite in every response:

| Mode | For | Grounded in |
|---|---|---|
| **Story Mode** | Narrative and event scores — a task or image a performer interprets in the moment | Anna Halprin's life/art scores, Fluxus event scores, Judson Dance Theater |
| **Abstract Mode** | Precise, technical movement cues for rehearsal | Laban Movement Analysis, Forsythe's Improvisation Technologies, Viewpoints |
| **Movement Vocabulary Expander** | Breaking out of habitual movement patterns | Bartenieff Fundamentals, Body-Mind Centering, Skinner Releasing Technique, Contact Improvisation |

A project's own notes can optionally be injected as context ahead of the user's prompt, so suggestions are grounded in what the choreographer is already working on rather than generic output. Requests are routed through a Vite dev-server proxy (see `vite.config.js`) to avoid browser CORS restrictions on IBM's IAM and watsonx endpoints; an IAM bearer token is fetched and cached client-side before each request.

The rest of the app is deliberately local-first and dependency-light: **React 19 + Vite** with **React Router** for navigation; project data and notes in `localStorage`; linked video/music folders remembered via the **File System Access API**; in-app recording via the **MediaRecorder API**; freehand notes via the **Pointer Events API**; and audio waveforms via **Wavesurfer.js**. No backend, no database — the browser is the whole app.

## Parts of the App

**Landing** — a full-screen entry moment with the app's tagline.

**Home** — the hub, with a prominent way into Seeds of Movement and quick access to projects.

**Projects** — an overview of every piece you're working on, shown as drag-to-reorder cards with a cover image (or placeholder) and name. Create, reopen, or trash (recoverable) projects here.

**Inside a project**, four tabs: **Notes** (rich text or freehand stylus/drawing, autosaved), **Video Log** (record in-browser or link a local folder), **Music References** (same, for audio, with waveform playback), and **Visualization** (a lightweight timeline for arranging clips).

**Seeds of Movement** — the AI ideation workspace described above, with a plain-language description and clickable examples for each mode so you can see what it does before committing to it.

## Selected Challenge Theme

Submitted to the [IBM AI Builders Challenge](https://aibuilderschallenge-bob.bemyapp.com/) under the **"Reimagine Creative Industries with AI"** theme.

## How IBM Bob Was Used

IBM Bob was the primary development tool used to build this project. It scaffolded the Vite + React application, established the design system (the forest green / cream color tokens, typography, spacing scale) and the routing structure, and built out the core feature set: the home screen with project creation and `localStorage` persistence, the Seeds of Movement page with its initial watsonx.ai integration and the three mode system prompts, the in-browser camera recording modal, the four-tab project page shell, and the Notes, Video Log, Music References, and Visualization tabs themselves — including the File System Access API folder-linking flow and the in-app audio/video recording.

## Design

Forest green and cream, serif display type paired with a simple sans-serif body — meant to feel like an actual notebook rather than a typical SaaS dashboard. Motion is used sparingly and stays fast: entrances, hovers, and page transitions are all short and calm rather than showy.

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org/) 18 or later (includes npm). No other tools or accounts are required to run the app — an IBM Cloud account is only needed if you want Seeds of Movement's AI ideation to work (step 3 below).

**1. Clone the repository and install dependencies**

```bash
git clone git@github.com:HKozuka/choreographers-notebook.git
cd choreographers-notebook
npm install
```

**2. (Optional) Set up watsonx.ai credentials for Seeds of Movement**

Every other part of the app (Notes, Video Log, Music References, Visualization, Projects) works with no configuration. Only the Seeds of Movement AI feature needs credentials — skip this step if you just want to try the rest of the app.

- Copy the example env file: `cp .env.example .env`
- In the [IBM Cloud console](https://cloud.ibm.com/), create (or open) a watsonx.ai project, then generate an API key under **Manage → Access (IAM) → API keys**.
- Open your watsonx.ai project's settings to find its **Project ID** (a UUID).
- Fill in `.env` with both values:

  ```
  VITE_WATSONX_API_KEY=your_ibm_api_key_here
  VITE_WATSONX_PROJECT_ID=your_watsonx_project_id_here
  ```

`.env` is already git-ignored, so your keys won't be committed.

**3. Start the app**

```bash
npm run dev
```

Vite will print a local URL — open **http://localhost:5173** in your browser. Changes to the code hot-reload automatically; no rebuild step needed while developing.

**Browser note:** Video Log and Music References can link a local folder on disk for playback, which uses the File System Access API — currently supported in Chrome and Edge, not Safari or Firefox. In-app recording and every other feature work in any modern browser.



