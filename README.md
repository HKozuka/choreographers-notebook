# Choreographer's Notebook

A web-first creative workspace for choreographers — built for the IBM AI Builders Challenge 2026.

## Features

- **Seeds of Movement** — AI-assisted movement ideation powered by IBM watsonx.ai (ibm/granite-3-2b-instruct)
- **Notes** — Rich text and freehand stylus/drawing notes per project
- **Video Log** — Local video file management and in-app playback
- **Music References** — Local audio file management and in-app playback
- **Visualization Timeline** — Lightweight clip arrangement tool

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env` file in the project root with your IBM watsonx credentials:

```
VITE_WATSONX_API_KEY=your_ibm_api_key_here
VITE_WATSONX_PROJECT_ID=your_watsonx_project_id_here
```

## Tech Stack

- React (Vite)
- IBM watsonx.ai REST API
- File System Access API
- MediaRecorder API
- Pointer Events API
- Wavesurfer.js

## Challenge

Submitted to the [IBM AI Builders Challenge](https://ibm.com) — "Reimagine Creative Industries with AI" theme.
