import React from 'react';
import { GitBranch, Network } from 'lucide-react';

function Header() {
  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              CodeAtlas
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Dependency Graph Visualizer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <GitBranch className="w-4 h-4" />
          <span className="font-mono">v1.0</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
