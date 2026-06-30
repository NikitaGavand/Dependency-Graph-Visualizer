import React from 'react';
import { X, FileCode, Folder, FunctionSquare, Boxes, ArrowRight, Link2, ExternalLink } from 'lucide-react';

const LANGUAGE_COLORS = {
  python: '#fbbf24',
  javascript: '#facc15',
  typescript: '#60a5fa',
  java: '#f87171',
  go: '#67e8f9',
  rust: '#fb923c',
  unknown: '#94a3b8',
};

function Sidebar({ node, onClose, allNodes, edges }) {
  if (!node) {
    return (
      <div className="w-80 glass-panel border-l border-slate-800/50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
          <Boxes className="w-8 h-8 text-slate-600" />
        </div>
        <h3 className="text-white font-semibold mb-1">Select a Node</h3>
        <p className="text-sm text-slate-500">
          Click on any file or directory in the graph to see its details and dependencies.
        </p>
      </div>
    );
  }

  const incomingEdges = edges.filter((e) => e.target === node.id);
  const outgoingEdges = edges.filter((e) => e.source === node.id);

  const incomingNodes = incomingEdges
    .map((e) => allNodes.find((n) => n.id === e.source))
    .filter(Boolean);
  const outgoingNodes = outgoingEdges
    .map((e) => allNodes.find((n) => n.id === e.target))
    .filter(Boolean);

  return (
    <div className="w-80 glass-panel border-l border-slate-800/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800/50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${LANGUAGE_COLORS[node.language] || '#334155'}20` }}
            >
              {node.type === 'directory' ? (
                <Folder className="w-5 h-5 text-slate-400" />
              ) : (
                <FileCode className="w-5 h-5" style={{ color: LANGUAGE_COLORS[node.language] || '#94a3b8' }} />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-sm truncate">{node.name}</h3>
              <p className="text-xs text-slate-500 font-mono truncate">{node.path}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors text-slate-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/60 text-xs text-slate-400 font-mono capitalize">
            {node.type}
          </span>
          {node.language && (
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-mono capitalize flex items-center gap-1.5"
              style={{
                backgroundColor: `${LANGUAGE_COLORS[node.language]}15`,
                color: LANGUAGE_COLORS[node.language],
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: LANGUAGE_COLORS[node.language] }}
              />
              {node.language}
            </span>
          )}
          {node.size > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-800/60 text-xs text-slate-400 font-mono">
              {(node.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Functions */}
        {node.functions && node.functions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FunctionSquare className="w-3.5 h-3.5" />
              Functions ({node.functions.length})
            </h4>
            <div className="space-y-1.5">
              {node.functions.map((fn, i) => (
                <div
                  key={i}
                  className="px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-800/50 hover:border-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 font-mono">{fn.name}</span>
                    <span className="text-xs text-slate-600 font-mono">L{fn.line}</span>
                  </div>
                  {fn.args && fn.args.length > 0 && (
                    <div className="text-xs text-slate-500 font-mono mt-1">
                      ({fn.args.join(', ')})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classes */}
        {node.classes && node.classes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Boxes className="w-3.5 h-3.5" />
              Classes ({node.classes.length})
            </h4>
            <div className="space-y-2">
              {node.classes.map((cls, i) => (
                <div
                  key={i}
                  className="px-3 py-2.5 rounded-lg bg-slate-800/40 border border-slate-800/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-cyan-400 font-mono font-medium">{cls.name}</span>
                    <span className="text-xs text-slate-600 font-mono">L{cls.line}</span>
                  </div>
                  {cls.bases && cls.bases.length > 0 && (
                    <div className="text-xs text-slate-500 font-mono">
                      extends {cls.bases.join(', ')}
                    </div>
                  )}
                  {cls.methods && cls.methods.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {cls.methods.slice(0, 5).map((m, j) => (
                        <span key={j} className="px-1.5 py-0.5 rounded bg-slate-900/60 text-xs text-slate-400 font-mono">
                          {m}()
                        </span>
                      ))}
                      {cls.methods.length > 5 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900/60 text-xs text-slate-500">
                          +{cls.methods.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External Dependencies */}
        {node.importsExternal && node.importsExternal.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              External Libraries ({node.importsExternal.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {node.importsExternal.map((lib, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/30 text-xs text-slate-400 font-mono"
                >
                  {lib}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Dependencies */}
        {incomingNodes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              Imported By ({incomingNodes.length})
            </h4>
            <div className="space-y-1">
              {incomingNodes.slice(0, 10).map((n, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/30 text-sm">
                  <span className="text-xs">{n.type === 'directory' ? '📁' : '📄'}</span>
                  <span className="text-slate-400 font-mono text-xs truncate">{n.name}</span>
                </div>
              ))}
              {incomingNodes.length > 10 && (
                <p className="text-xs text-slate-600 pl-3">+{incomingNodes.length - 10} more</p>
              )}
            </div>
          </div>
        )}

        {/* Outgoing Dependencies */}
        {outgoingNodes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ArrowRight className="w-3.5 h-3.5" />
              Imports ({outgoingNodes.length})
            </h4>
            <div className="space-y-1">
              {outgoingNodes.slice(0, 10).map((n, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/30 text-sm">
                  <span className="text-xs">{n.type === 'directory' ? '📁' : '📄'}</span>
                  <span className="text-slate-400 font-mono text-xs truncate">{n.name}</span>
                </div>
              ))}
              {outgoingNodes.length > 10 && (
                <p className="text-xs text-slate-600 pl-3">+{outgoingNodes.length - 10} more</p>
              )}
            </div>
          </div>
        )}

        {/* Children (for directories) */}
        {node.children && node.children.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" />
              Contents ({node.children.length})
            </h4>
            <div className="space-y-1">
              {node.children.slice(0, 15).map((childId, i) => {
                const child = allNodes.find((n) => n.id === childId);
                if (!child) return null;
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/30 text-sm">
                    <span className="text-xs">{child.type === 'directory' ? '📁' : '📄'}</span>
                    <span className="text-slate-400 font-mono text-xs truncate">{child.name}</span>
                  </div>
                );
              })}
              {node.children.length > 15 && (
                <p className="text-xs text-slate-600 pl-3">+{node.children.length - 15} more</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
