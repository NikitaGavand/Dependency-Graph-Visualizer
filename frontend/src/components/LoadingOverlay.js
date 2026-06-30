import React from 'react';
import { Loader2, GitBranch, Terminal } from 'lucide-react';

function LoadingOverlay() {
  const steps = [
    { icon: GitBranch, label: 'Cloning repository...', delay: '0s' },
    { icon: Terminal, label: 'Parsing AST...', delay: '0.5s' },
    { icon: Loader2, label: 'Building graph...', delay: '1s' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center">
        {/* Animated loader */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-2 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-slate-800" />
          <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-blue-500 border-b-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <GitBranch className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2">Analyzing Repository</h3>
        <p className="text-slate-500 text-sm mb-8">This may take a moment for large repositories</p>

        {/* Progress steps */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/50 w-64 mx-auto"
              style={{ animationDelay: step.delay }}
            >
              <step.icon className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
              <span className="text-sm text-slate-300">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoadingOverlay;
