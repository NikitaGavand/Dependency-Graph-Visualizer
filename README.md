# Dependency-Graph-Visualizer
A full-stack Single Page Application that clones GitHub repositories, parses their AST to extract internal dependencies, and visualizes them as an interactive D3.js graph.
# GitHub Dependency Graph Visualizer

A full-stack Single Page Application that clones GitHub repositories, parses their AST to extract internal dependencies, and visualizes them as an interactive D3.js graph.

## Architecture

```
┌─────────────┐     HTTP/JSON      ┌─────────────┐
│   React     │ ◄────────────────► │   Flask     │
│   (D3.js)   │                    │   (Python)  │
└─────────────┘                    └──────┬──────┘
                                            │
                                     ┌──────┴──────┐
                                     │  git clone  │
                                     │  AST Parse  │
                                     │  Build Graph│
                                     └─────────────┘
```

## Pipeline

1. **Clone** — `git clone --depth 1` the repo to a temp directory
2. **Parse** — Walk the file tree, use language-specific AST parsers to extract:
   - Internal imports (project files/modules)
   - External libraries (listed separately)
   - Functions, classes, methods
3. **Build Graph** — Create nodes (files + directories) and edges (imports + inheritance)
4. **Visualize** — D3.js force-directed / tree / cluster layout with interactive pan/zoom/select

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Runs on `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
npm start
```

Runs on `http://localhost:3000`

## Supported Languages

| Language | Parser Type | Imports | Functions | Classes |
|----------|-------------|---------|-----------|---------|
| Python   | AST (`ast`) | ✅      | ✅        | ✅      |
| JS/TS    | Regex       | ✅      | ✅        | ✅      |
| Java     | Regex       | ✅      | ✅        | ✅      |
| Go       | Regex       | ✅      | ✅        | ❌      |
| Rust     | Regex       | ✅      | ✅        | ✅      |

## API

### `POST /api/analyze`

Request:
```json
{ "url": "https://github.com/owner/repo" }
```

Response:
```json
{
  "nodes": [...],
  "edges": [...],
  "externalLibraries": ["flask", "requests"],
  "stats": {
    "totalFiles": 42,
    "totalDirectories": 8,
    "totalLines": 3500,
    "languages": { "python": 30, "javascript": 12 }
  }
}
```

### `GET /api/demo`

Returns pre-built demo data for testing the UI without cloning.

## Features

- **3 Layout Modes**: Force-directed, hierarchical tree, language-clustered
- **Interactive**: Drag nodes, zoom/pan, click to inspect details
- **Sidebar Inspector**: Functions, classes, imports, external libs per file
- **External Libraries**: Listed separately — not shown in the graph
- **Multi-language**: Python AST + regex parsers for JS/TS/Java/Go/Rust
- **Responsive**: Adapts to container size

## Tech Stack

**Frontend:** React 18, D3.js 7, Tailwind CSS, Lucide Icons  
**Backend:** Flask, Python AST, subprocess (git)  
**Deployment:** Docker (optional)
