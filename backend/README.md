# GitHub Dependency Graph - Backend

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
python app.py
```

Server runs on `http://localhost:5000`

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/analyze` - Analyze a GitHub repo
  - Body: `{"url": "https://github.com/owner/repo"}`
- `GET /api/demo` - Get demo data

## Supported Languages

- Python (AST-based parsing)
- JavaScript / TypeScript (regex-based)
- Java (regex-based)
- Go (regex-based)
- Rust (regex-based)
