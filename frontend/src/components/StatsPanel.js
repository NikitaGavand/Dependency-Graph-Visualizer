import React from 'react';
import { Network, GitFork, Grid3x3, FileCode, FolderTree, Link2, Layers } from 'lucide-react';

function StatsPanel({ stats, viewMode, onViewModeChange, externalLibraries }) {
  const viewModes = [
    { id: 'force', label: 'Force', icon: Network },
    { id: 'tree', label: 'Tree', icon: GitFork },
    { id: 'cluster', label: 'Cluster', icon: Grid3x3 },
  ];

  const statItems = [
    { label: 'Files', value: stats?.totalFiles || 0, icon: FileCode },
    { label: 'Dirs', value: stats?.totalDirectories || 0, icon: FolderTree },
    { label: 'Lines', value: stats?.totalLines?.toLocaleString() || 0, icon: Layers },
    { label: 'Edges', value: stats?.totalEdges || 0, icon: Link2 },
  ];

  return (
    <div className="glass-panel border-b border-slate-800/50 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Stats */}
        <div className="flex items-center gap-6">
          {statItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <item.icon className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-lg font-bold text-white leading-tight">{item.value}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{item.label}</div>
              </div>
            </div>
          ))}

          {/* Languages */}
          {stats?.languages && Object.keys(stats.languages).length > 0 && (
            <div className="flex items-center gap-2 pl-4 border-l border-slate-800/50">
              {Object.entries(stats.languages).slice(0, 4).map(([lang, count]) => (
                <span
                  key={lang}
                  className="px-2 py-1 rounded-md bg-slate-800/50 text-xs text-slate-400 font-mono capitalize"
                >
                  {lang} <span className="text-slate-600">{count}</span>
                </span>
              ))}
              {Object.keys(stats.languages).length > 4 && (
                <span className="text-xs text-slate-600">+{Object.keys(stats.languages).length - 4}</span>
              )}
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-900/60 rounded-xl p-1 border border-slate-800/50">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onViewModeChange(mode.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                ${viewMode === mode.id
                  ? 'bg-cyan-500/20 text-cyan-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }
              `}
            >
              <mode.icon className="w-3.5 h-3.5" />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* External Libraries Bar */}
      {externalLibraries && externalLibraries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800/30 flex items-center gap-3">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold flex-shrink-0">
            External Libraries
          </span>
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
            {externalLibraries.slice(0, 20).map((lib) => (
              <span
                key={lib}
                className="px-2 py-0.5 rounded-md bg-slate-800/40 border border-slate-700/20 text-[11px] text-slate-500 font-mono"
              >
                {lib}
              </span>
            ))}
            {externalLibraries.length > 20 && (
              <span className="text-[11px] text-slate-600">+{externalLibraries.length - 20} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StatsPanel;
