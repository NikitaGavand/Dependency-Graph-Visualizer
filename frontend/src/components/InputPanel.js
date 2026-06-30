import React, { useState } from 'react';
import { Github, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

function InputPanel({ onAnalyze, onDemo, error }) {
  const [url, setUrl] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onAnalyze(url.trim());
    }
  };

  const examples = [
    'https://github.com/facebook/react',
    'https://github.com/vercel/next.js',
    'https://github.com/torvalds/linux',
  ];

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-2xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Interactive Dependency Analysis
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Visualize Your Code's
            <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Hidden Architecture
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-lg mx-auto">
            Enter a GitHub repository URL to generate an interactive dependency graph. 
            Discover how your files, modules, and classes connect.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className={`
            relative flex items-center gap-3 rounded-2xl border-2 transition-all duration-300
            ${isFocused 
              ? 'border-cyan-500/50 bg-slate-900/90 shadow-lg shadow-cyan-500/10' 
              : 'border-slate-800 bg-slate-900/50'}
          `}>
            <Github className="w-6 h-6 text-slate-500 ml-5" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="https://github.com/owner/repository"
              className="flex-1 bg-transparent py-5 pr-4 text-white placeholder-slate-500 outline-none text-lg"
            />
            <button
              type="submit"
              disabled={!url.trim()}
              className="mr-3 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl
                hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              Analyze
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Examples */}
        <div className="mt-8">
          <p className="text-sm text-slate-500 mb-3 font-medium">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => setUrl(ex)}
                className="px-4 py-2 text-sm text-slate-400 bg-slate-900/50 border border-slate-800 rounded-lg
                  hover:text-cyan-400 hover:border-cyan-500/30 transition-all duration-200 font-mono"
              >
                {ex.replace('https://github.com/', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Demo Button */}
        <div className="mt-8 text-center">
          <button
            onClick={onDemo}
            className="text-sm text-slate-500 hover:text-cyan-400 transition-colors duration-200 underline underline-offset-4"
          >
            Or load demo data to explore the visualization
          </button>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🔍', title: 'AST Parsing', desc: 'Deep analysis using Abstract Syntax Trees for accurate dependency extraction' },
            { icon: '🕸️', title: 'Interactive Graph', desc: 'Drag, zoom, pan, and explore your codebase with D3.js force-directed layouts' },
            { icon: '📊', title: 'Multi-Language', desc: 'Support for Python, JavaScript, TypeScript, Java, Go, and Rust' },
          ].map((feature) => (
            <div key={feature.title} className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/50 hover:border-slate-700/50 transition-colors">
              <div className="text-2xl mb-3">{feature.icon}</div>
              <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-slate-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InputPanel;
