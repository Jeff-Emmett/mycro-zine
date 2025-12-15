---
id: task-001
title: Initial toolkit setup
status: Done
priority: high
created_date: '2025-12-15 23:35'
labels: [setup, feature]
---

## Description

Created the mycro-zine repository with core utilities for generating print-ready 8-page mini-zines.

## Acceptance Criteria

- [x] Repository structure created (src/, examples/, output/)
- [x] Layout script generates single-page output (2x4 grid)
- [x] Prompt templates for AI content/image generation
- [x] Example Undernet zine pages included
- [x] Pushed to Gitea and GitHub

## Implementation Notes

Repository locations:
- Gitea: gitea.jeffemmett.com:jeffemmett/mycro-zine
- GitHub: github.com/Jeff-Emmett/mycro-zine

Files created:
- `src/layout.mjs` - Print layout generator (all 8 pages on one 8.5"x11" sheet)
- `src/prompts.mjs` - Prompt templates for AI generation
- `src/index.mjs` - Main entry point and exports
- `examples/undernet/` - 8 example zine pages

Test with: `npm run example`
