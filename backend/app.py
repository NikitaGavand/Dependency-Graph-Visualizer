"""
GitHub Dependency Graph Visualizer - Backend
=============================================
Flask API that clones repos, parses ASTs, and returns dependency graphs.
"""

import os
import re
import json
import shutil
import tempfile
import subprocess
import ast
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, asdict
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class FileNode:
    id: str
    path: str
    name: str
    type: str  # 'file' | 'directory'
    language: str
    size: int
    children: List[str]
    imports_internal: List[str]
    importsExternal: List[str]  # camelCase for frontend
    functions: List[Dict]
    classes: List[Dict]

@dataclass
class DependencyEdge:
    source: str
    target: str
    type: str  # 'import' | 'call' | 'inheritance'
    line: int

@dataclass
class GraphData:
    nodes: List[Dict]
    edges: List[Dict]
    externalLibraries: List[str]
    stats: Dict

# =============================================================================
# LANGUAGE DETECTORS
# =============================================================================

LANGUAGE_MAP = {
    '.py': 'python',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
}

IGNORE_DIRS = {
    'node_modules', '.git', '__pycache__', '.venv', 'venv',
    'dist', 'build', '.next', '.nuxt', 'target', 'vendor',
    '.tox', '.pytest_cache', '.mypy_cache', '.idea', '.vscode',
    'coverage', 'site-packages', 'egg-info', '.eggs', 'bin', 'obj'
}

IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'poetry.lock', 'Cargo.lock',
    '.DS_Store', 'Thumbs.db', '.gitignore', '.gitattributes',
    'LICENSE', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md',
    'Makefile', 'CMakeLists.txt', 'setup.py', 'setup.cfg',
    'pyproject.toml', 'requirements.txt', 'Pipfile', 'Pipfile.lock',
    'Dockerfile', 'docker-compose.yml', '.dockerignore',
    'tsconfig.json', 'jsconfig.json', 'babel.config.js',
    'webpack.config.js', 'rollup.config.js', 'vite.config.js',
    'jest.config.js', 'eslint.config.js', '.prettierrc',
    'tailwind.config.js', 'postcss.config.js'
}

# =============================================================================
# GITHUB CLONING
# =============================================================================

def parse_github_url(url: str) -> Tuple[str, str]:
    """Extract owner and repo from GitHub URL."""
    patterns = [
        r'github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$',
        r'github\.com/([^/]+)/([^/]+?)(?:\.git)?/tree/',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1), match.group(2).replace('.git', '')
    raise ValueError(f"Invalid GitHub URL: {url}")

def clone_repo(owner: str, repo: str) -> str:
    """Clone a GitHub repository to a temp directory."""
    temp_dir = tempfile.mkdtemp(prefix=f"repo_{repo}_")
    clone_url = f"https://github.com/{owner}/{repo}.git"

    result = subprocess.run(
        ['git', 'clone', '--depth', '1', '--single-branch', clone_url, temp_dir],
        capture_output=True, text=True, timeout=120
    )

    if result.returncode != 0:
        raise RuntimeError(f"Failed to clone repo: {result.stderr}")

    return temp_dir

# =============================================================================
# AST PARSERS
# =============================================================================

class PythonParser:
    """Parse Python files to extract imports, functions, classes."""

    @staticmethod
    def parse(file_path: str, repo_root: str) -> Tuple[List[str], List[str], List[Dict], List[Dict]]:
        """Returns (internal_imports, external_imports, functions, classes)"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                source = f.read()
            tree = ast.parse(source)
        except (SyntaxError, UnicodeDecodeError):
            return [], [], [], []

        internal = []
        external = []
        functions = []
        classes = []

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    module = alias.name.split('.')[0]
                    if PythonParser._is_internal(module, repo_root):
                        internal.append(alias.name)
                    else:
                        external.append(module)

            elif isinstance(node, ast.ImportFrom):
                module = node.module or ''
                if node.level > 0:  # relative import
                    internal.append(f"{'.' * node.level}{module}")
                elif PythonParser._is_internal(module.split('.')[0], repo_root):
                    internal.append(module)
                else:
                    external.append(module.split('.')[0] if module else 'unknown')

            elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                functions.append({
                    'name': node.name,
                    'line': node.lineno,
                    'args': [a.arg for a in node.args.args]
                })

            elif isinstance(node, ast.ClassDef):
                methods = []
                bases = []
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        methods.append(item.name)
                for base in node.bases:
                    if isinstance(base, ast.Name):
                        bases.append(base.id)
                    elif isinstance(base, ast.Attribute):
                        bases.append(base.attr)

                classes.append({
                    'name': node.name,
                    'line': node.lineno,
                    'methods': methods,
                    'bases': bases
                })

        return internal, list(set(external)), functions, classes

    @staticmethod
    def _is_internal(module: str, repo_root: str) -> bool:
        """Check if a module is internal to the project."""
        if not module:
            return False
        # Check if there's a directory or file matching the module name
        for root, dirs, files in os.walk(repo_root):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            if module in dirs or any(f.startswith(module + '.') for f in files):
                return True
        return False


class JavaScriptParser:
    """Parse JS/TS files to extract imports."""

    IMPORT_PATTERNS = [
        r"import\s+.*?\s+from\s+['"]([^'"]+)['"]",
        r"import\s+['"]([^'"]+)['"]",
        r"require\s*\(\s*['"]([^'"]+)['"]\s*\)",
        r"import\s*\(\s*['"]([^'"]+)['"]\s*\)",
    ]

    FUNCTION_PATTERN = r"(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\("
    CLASS_PATTERN = r"(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?"

    @staticmethod
    def parse(file_path: str, repo_root: str) -> Tuple[List[str], List[str], List[Dict], List[Dict]]:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                source = f.read()
        except (UnicodeDecodeError, IOError):
            return [], [], [], []

        internal = []
        external = []

        for pattern in JavaScriptParser.IMPORT_PATTERNS:
            for match in re.finditer(pattern, source):
                module = match.group(1)
                if module.startswith('.') or module.startswith('/'):
                    # Resolve relative path
                    internal.append(JavaScriptParser._resolve_relative(module, file_path, repo_root))
                elif not module.startswith('@'):
                    external.append(module.split('/')[0])
                else:
                    # Scoped package - check if internal
                    if JavaScriptParser._is_internal_scoped(module, repo_root):
                        internal.append(module)
                    else:
                        external.append(module.split('/')[0])

        functions = []
        for match in re.finditer(JavaScriptParser.FUNCTION_PATTERN, source):
            functions.append({'name': match.group(1), 'line': source[:match.start()].count('\n') + 1, 'args': []})

        classes = []
        for match in re.finditer(JavaScriptParser.CLASS_PATTERN, source):
            classes.append({
                'name': match.group(1),
                'line': source[:match.start()].count('\n') + 1,
                'methods': [],
                'bases': [match.group(2)] if match.group(2) else []
            })

        return internal, list(set(external)), functions, classes

    @staticmethod
    def _resolve_relative(module: str, file_path: str, repo_root: str) -> str:
        """Resolve a relative import to an absolute path within repo."""
        base = os.path.dirname(file_path)
        resolved = os.path.normpath(os.path.join(base, module))
        if resolved.startswith(repo_root):
            return os.path.relpath(resolved, repo_root)
        return module

    @staticmethod
    def _is_internal_scoped(module: str, repo_root: str) -> bool:
        """Check if a scoped package (@scope/name) is internal."""
        parts = module.split('/')
        if len(parts) >= 2:
            scope = parts[0][1:]  # Remove @
            for root, dirs, _ in os.walk(repo_root):
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
                if scope in dirs:
                    return True
        return False


class JavaParser:
    """Parse Java files to extract imports and class info."""

    IMPORT_PATTERN = r"import\s+([\w.]+)"
    CLASS_PATTERN = r"(?:public\s+|private\s+|protected\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?"
    METHOD_PATTERN = r"(?:public|private|protected|static|final|abstract)\s+(?:<[^>]+>\s+)?([\w<>,\[\]]+)\s+(\w+)\s*\("

    @staticmethod
    def parse(file_path: str, repo_root: str) -> Tuple[List[str], List[str], List[Dict], List[Dict]]:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                source = f.read()
        except (UnicodeDecodeError, IOError):
            return [], [], [], []

        internal = []
        external = []

        for match in re.finditer(JavaParser.IMPORT_PATTERN, source):
            module = match.group(1)
            # Java packages - check if starts with project package
            if JavaParser._is_internal(module, repo_root):
                internal.append(module)
            else:
                external.append(module.split('.')[0])

        functions = []
        for match in re.finditer(JavaParser.METHOD_PATTERN, source):
            functions.append({
                'name': match.group(2),
                'line': source[:match.start()].count('\n') + 1,
                'args': []
            })

        classes = []
        for match in re.finditer(JavaParser.CLASS_PATTERN, source):
            bases = []
            if match.group(2):
                bases.append(match.group(2))
            if match.group(3):
                bases.extend([b.strip() for b in match.group(3).split(',')])
            classes.append({
                'name': match.group(1),
                'line': source[:match.start()].count('\n') + 1,
                'methods': [],
                'bases': bases
            })

        return internal, list(set(external)), functions, classes

    @staticmethod
    def _is_internal(module: str, repo_root: str) -> bool:
        """Heuristic: if there's a matching directory structure, it's internal."""
        parts = module.split('.')
        for root, dirs, _ in os.walk(repo_root):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            if parts[0] in dirs:
                return True
        return False


class GoParser:
    """Parse Go files to extract imports."""

    IMPORT_PATTERN = r'import\s*\(\s*([^)]+)\)'
    SINGLE_IMPORT = r'import\s+["']([^"']+)["']'
    FUNC_PATTERN = r"func\s+(?:\([^)]+\)\s+)?(\w+)\s*\("

    @staticmethod
    def parse(file_path: str, repo_root: str) -> Tuple[List[str], List[str], List[Dict], List[Dict]]:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                source = f.read()
        except (UnicodeDecodeError, IOError):
            return [], [], [], []

        internal = []
        external = []

        # Multi-line imports
        for match in re.finditer(GoParser.IMPORT_PATTERN, source, re.DOTALL):
            imports_block = match.group(1)
            for imp in re.finditer(r'["']([^"']+)["']', imports_block):
                module = imp.group(1)
                if module.startswith(repo_root.split('/')[-1]) or module.startswith('.'):
                    internal.append(module)
                else:
                    external.append(module.split('/')[0] if '/' in module else module)

        # Single imports
        for match in re.finditer(GoParser.SINGLE_IMPORT, source):
            module = match.group(1)
            if module.startswith(repo_root.split('/')[-1]) or module.startswith('.'):
                internal.append(module)
            else:
                external.append(module.split('/')[0] if '/' in module else module)

        functions = []
        for match in re.finditer(GoParser.FUNC_PATTERN, source):
            functions.append({
                'name': match.group(1),
                'line': source[:match.start()].count('\n') + 1,
                'args': []
            })

        return internal, list(set(external)), functions, []


class RustParser:
    """Parse Rust files to extract imports."""

    USE_PATTERN = r'use\s+([^;]+);'
    MOD_PATTERN = r'mod\s+(\w+);'
    FN_PATTERN = r"fn\s+(\w+)\s*\("
    STRUCT_PATTERN = r"struct\s+(\w+)"
    IMPL_PATTERN = r"impl\s+(?:<[^>]+>\s+)?(\w+)"

    @staticmethod
    def parse(file_path: str, repo_root: str) -> Tuple[List[str], List[str], List[Dict], List[Dict]]:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                source = f.read()
        except (UnicodeDecodeError, IOError):
            return [], [], [], []

        internal = []
        external = []

        for match in re.finditer(RustParser.USE_PATTERN, source):
            module = match.group(1).strip()
            if module.startswith('crate::') or module.startswith('self::') or module.startswith('super::'):
                internal.append(module)
            elif '::' in module:
                external.append(module.split('::')[0])

        for match in re.finditer(RustParser.MOD_PATTERN, source):
            internal.append(f"mod::{match.group(1)}")

        functions = []
        for match in re.finditer(RustParser.FN_PATTERN, source):
            functions.append({
                'name': match.group(1),
                'line': source[:match.start()].count('\n') + 1,
                'args': []
            })

        classes = []
        for match in re.finditer(RustParser.STRUCT_PATTERN, source):
            classes.append({
                'name': match.group(1),
                'line': source[:match.start()].count('\n') + 1,
                'methods': [],
                'bases': []
            })

        return internal, list(set(external)), functions, classes


# Parser registry
PARSERS = {
    'python': PythonParser,
    'javascript': JavaScriptParser,
    'typescript': JavaScriptParser,
    'java': JavaParser,
    'go': GoParser,
    'rust': RustParser,
}

# =============================================================================
# GRAPH BUILDER
# =============================================================================

def get_language(file_path: str) -> str:
    """Detect programming language from file extension."""
    ext = Path(file_path).suffix.lower()
    return LANGUAGE_MAP.get(ext, 'unknown')

def should_include_file(file_path: str) -> bool:
    """Check if a file should be included in the graph."""
    basename = os.path.basename(file_path)
    if basename in IGNORE_FILES:
        return False
    if basename.startswith('.'):
        return False
    lang = get_language(file_path)
    return lang != 'unknown'

def should_include_dir(dir_name: str) -> bool:
    """Check if a directory should be traversed."""
    return dir_name not in IGNORE_DIRS and not dir_name.startswith('.')

def scan_repository(repo_path: str) -> Tuple[List[FileNode], List[DependencyEdge], Set[str]]:
    """Scan repository and build dependency graph."""
    nodes = {}
    edges = []
    external_libs = set()

    # First pass: create file nodes
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if should_include_dir(d)]
        rel_root = os.path.relpath(root, repo_path)

        # Create directory nodes
        if rel_root != '.':
            dir_id = rel_root.replace('\', '/')
            if dir_id not in nodes:
                nodes[dir_id] = FileNode(
                    id=dir_id,
                    path=dir_id,
                    name=os.path.basename(dir_id),
                    type='directory',
                    language='',
                    size=0,
                    children=[],
                    importsInternal=[],
                    importsExternal=[],
                    functions=[],
                    classes=[]
                )

        for file in files:
            file_path = os.path.join(root, file)
            if not should_include_file(file_path):
                continue

            rel_path = os.path.relpath(file_path, repo_path).replace('\', '/')
            lang = get_language(file_path)
            size = os.path.getsize(file_path)

            # Parse the file
            parser = PARSERS.get(lang)
            if parser:
                internal, external, functions, classes = parser.parse(file_path, repo_path)
            else:
                internal, external, functions, classes = [], [], [], []

            external_libs.update(external)

            node = FileNode(
                id=rel_path,
                path=rel_path,
                name=file,
                type='file',
                language=lang,
                size=size,
                children=[],
                importsInternal=internal,
                importsExternal=external,
                functions=functions,
                classes=classes
            )
            nodes[rel_path] = node

            # Link to parent directory
            parent = os.path.dirname(rel_path)
            if parent and parent != '.':
                if parent not in nodes:
                    nodes[parent] = FileNode(
                        id=parent,
                        path=parent,
                        name=os.path.basename(parent),
                        type='directory',
                        language='',
                        size=0,
                        children=[],
                        importsInternal=[],
                        importsExternal=[],
                        functions=[],
                        classes=[]
                    )
                nodes[parent].children.append(rel_path)
            elif parent == '.':
                # Root-level file
                pass

    # Second pass: build edges from internal imports
    for node_id, node in nodes.items():
        if node.type != 'file':
            continue

        for imp in node.importsInternal:
            target = resolve_import(imp, node_id, nodes, repo_path)
            if target and target != node_id:
                edges.append(DependencyEdge(
                    source=node_id,
                    target=target,
                    type='import',
                    line=0
                ))

        # Add inheritance edges
        for cls in node.classes:
            for base in cls.get('bases', []):
                target = find_class_definition(base, nodes)
                if target and target != node_id:
                    edges.append(DependencyEdge(
                        source=node_id,
                        target=target,
                        type='inheritance',
                        line=cls.get('line', 0)
                    ))

    return list(nodes.values()), edges, external_libs

def resolve_import(import_str: str, source_file: str, nodes: Dict[str, FileNode], repo_path: str) -> Optional[str]:
    """Resolve an import string to a file node ID."""
    # Python: convert module path to file path
    if import_str.startswith('.'):
        # Relative import
        source_dir = os.path.dirname(source_file)
        dots = 0
        for c in import_str:
            if c == '.':
                dots += 1
            else:
                break

        parts = import_str[dots:].split('.') if import_str[dots:] else []
        current = source_dir
        for _ in range(dots - 1):
            current = os.path.dirname(current) if current else ''

        candidate = '/'.join(([current] if current else []) + parts)
    else:
        candidate = import_str.replace('.', '/')

    # Try various extensions and __init__ files
    candidates = [
        candidate,
        candidate + '.py',
        candidate + '.js',
        candidate + '.ts',
        candidate + '.jsx',
        candidate + '.tsx',
        candidate + '.java',
        candidate + '.go',
        candidate + '.rs',
        candidate + '/__init__.py',
        candidate + '/index.js',
        candidate + '/index.ts',
        candidate + '/mod.rs',
        candidate + '/lib.rs',
    ]

    for c in candidates:
        if c in nodes:
            return c

    # Fuzzy match: find any node that ends with the import name
    parts = candidate.split('/')
    if parts:
        target_name = parts[-1]
        for node_id in nodes:
            if nodes[node_id].type == 'file':
                node_name = os.path.splitext(os.path.basename(node_id))[0]
                if node_name == target_name:
                    return node_id

    return None

def find_class_definition(class_name: str, nodes: Dict[str, FileNode]) -> Optional[str]:
    """Find which file defines a given class."""
    for node_id, node in nodes.items():
        if node.type == 'file':
            for cls in node.classes:
                if cls['name'] == class_name:
                    return node_id
    return None

# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/analyze', methods=['POST'])
def analyze_repo():
    """Main endpoint: clone repo, parse, return dependency graph."""
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'GitHub URL is required'}), 400

    url = data['url']
    try:
        owner, repo = parse_github_url(url)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    repo_path = None
    try:
        # Clone the repository
        repo_path = clone_repo(owner, repo)

        # Scan and parse
        nodes, edges, external_libs = scan_repository(repo_path)

        # Calculate stats
        total_files = sum(1 for n in nodes if n.type == 'file')
        total_dirs = sum(1 for n in nodes if n.type == 'directory')
        total_lines = 0
        lang_counts = {}

        for node in nodes:
            if node.type == 'file':
                lang_counts[node.language] = lang_counts.get(node.language, 0) + 1
                try:
                    with open(os.path.join(repo_path, node.path), 'r', encoding='utf-8', errors='ignore') as f:
                        total_lines += len(f.readlines())
                except:
                    pass

        # Build response
        graph_data = GraphData(
            nodes=[asdict(n) for n in nodes],
            edges=[asdict(e) for e in edges],
            externalLibraries=sorted(external_libs),
            stats={
                'totalFiles': total_files,
                'totalDirectories': total_dirs,
                'totalLines': total_lines,
                'totalNodes': len(nodes),
                'totalEdges': len(edges),
                'languages': lang_counts,
                'repoName': repo,
                'owner': owner
            }
        )

        return jsonify(asdict(graph_data))

    except RuntimeError as e:
        return jsonify({'error': f'Failed to clone repository: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500
    finally:
        # Cleanup
        if repo_path and os.path.exists(repo_path):
            shutil.rmtree(repo_path, ignore_errors=True)

@app.route('/api/demo', methods=['GET'])
def demo_data():
    """Return demo graph data for testing without cloning."""
    demo = GraphData(
        nodes=[
            {'id': 'src', 'path': 'src', 'name': 'src', 'type': 'directory', 'language': '', 'size': 0, 'children': ['src/main.py', 'src/utils.py', 'src/models.py'], 'importsInternal': [], 'importsExternal': [], 'functions': [], 'classes': []},
            {'id': 'src/main.py', 'path': 'src/main.py', 'name': 'main.py', 'type': 'file', 'language': 'python', 'size': 1200, 'children': [], 'importsInternal': ['src.utils', 'src.models'], 'importsExternal': ['flask', 'requests'], 'functions': [{'name': 'main', 'line': 10, 'args': []}, {'name': 'run_app', 'line': 25, 'args': ['host', 'port']}], 'classes': []},
            {'id': 'src/utils.py', 'path': 'src/utils.py', 'name': 'utils.py', 'type': 'file', 'language': 'python', 'size': 800, 'children': [], 'importsInternal': [], 'importsExternal': ['os', 'json'], 'functions': [{'name': 'load_config', 'line': 5, 'args': ['path']}, {'name': 'validate', 'line': 20, 'args': ['data']}], 'classes': []},
            {'id': 'src/models.py', 'path': 'src/models.py', 'name': 'models.py', 'type': 'file', 'language': 'python', 'size': 1500, 'children': [], 'importsInternal': ['src.utils'], 'importsExternal': ['sqlalchemy'], 'functions': [{'name': 'init_db', 'line': 15, 'args': []}], 'classes': [{'name': 'User', 'line': 25, 'methods': ['save', 'delete'], 'bases': ['BaseModel']}, {'name': 'BaseModel', 'line': 8, 'methods': ['to_dict'], 'bases': []}]},
            {'id': 'tests', 'path': 'tests', 'name': 'tests', 'type': 'directory', 'language': '', 'size': 0, 'children': ['tests/test_main.py'], 'importsInternal': [], 'importsExternal': [], 'functions': [], 'classes': []},
            {'id': 'tests/test_main.py', 'path': 'tests/test_main.py', 'name': 'test_main.py', 'type': 'file', 'language': 'python', 'size': 600, 'children': [], 'importsInternal': ['src.main', 'src.models'], 'importsExternal': ['pytest'], 'functions': [{'name': 'test_main', 'line': 5, 'args': []}], 'classes': []},
        ],
        edges=[
            {'source': 'src/main.py', 'target': 'src/utils.py', 'type': 'import', 'line': 1},
            {'source': 'src/main.py', 'target': 'src/models.py', 'type': 'import', 'line': 2},
            {'source': 'src/models.py', 'target': 'src/utils.py', 'type': 'import', 'line': 3},
            {'source': 'tests/test_main.py', 'target': 'src/main.py', 'type': 'import', 'line': 1},
            {'source': 'tests/test_main.py', 'target': 'src/models.py', 'type': 'import', 'line': 2},
        ],
        externalLibraries=['flask', 'requests', 'sqlalchemy', 'pytest', 'os', 'json'],
        stats={
            'totalFiles': 4,
            'totalDirectories': 2,
            'totalLines': 4100,
            'totalNodes': 6,
            'totalEdges': 5,
            'languages': {'python': 4},
            'repoName': 'demo-repo',
            'owner': 'demo'
        }
    )
    return jsonify(asdict(demo))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
