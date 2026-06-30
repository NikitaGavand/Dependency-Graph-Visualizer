import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import GraphVisualization from './components/GraphVisualization';
import Sidebar from './components/Sidebar';
import StatsPanel from './components/StatsPanel';
import LoadingOverlay from './components/LoadingOverlay';
import { analyzeRepo, getDemoData } from './api';

function App() {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('force'); // 'force' | 'tree' | 'cluster'

  const handleAnalyze = useCallback(async (url) => {
    setLoading(true);
    setError(null);
    setGraphData(null);
    setSelectedNode(null);

    try {
      const data = await analyzeRepo(url);
      setGraphData(data);
    } catch (err) {
      setError(err.message || 'Failed to analyze repository');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDemo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDemoData();
      setGraphData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col">
        {!graphData && !loading && (
          <InputPanel 
            onAnalyze={handleAnalyze} 
            onDemo={handleDemo}
            error={error}
          />
        )}

        {graphData && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col">
              <StatsPanel 
                stats={graphData.stats} 
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                externalLibraries={graphData.externalLibraries}
              />
              <GraphVisualization 
                data={graphData}
                viewMode={viewMode}
                onNodeSelect={handleNodeSelect}
                selectedNode={selectedNode}
              />
            </div>
            <Sidebar 
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              allNodes={graphData.nodes}
              edges={graphData.edges}
            />
          </div>
        )}
      </main>

      {loading && <LoadingOverlay />}
    </div>
  );
}

export default App;
