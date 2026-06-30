const API_BASE = process.env.REACT_APP_API_URL || '';

export async function analyzeRepo(url) {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Analysis failed');
  }

  return response.json();
}

export async function getDemoData() {
  const response = await fetch(`${API_BASE}/api/demo`);
  if (!response.ok) {
    throw new Error('Failed to load demo data');
  }
  return response.json();
}
