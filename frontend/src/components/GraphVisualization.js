import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Grid3x3, Network, GitFork } from 'lucide-react';

const LANGUAGE_COLORS = {
  python: '#fbbf24',
  javascript: '#facc15',
  typescript: '#60a5fa',
  java: '#f87171',
  go: '#67e8f9',
  rust: '#fb923c',
  unknown: '#94a3b8',
};

const TYPE_ICONS = {
  file: '📄',
  directory: '📁',
};

function GraphVisualization({ data, viewMode, onNodeSelect, selectedNode }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomRef = useRef(null);
  const simulationRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Prepare graph data
  const prepareGraphData = useCallback(() => {
    const nodes = data.nodes.map((n) => ({
      ...n,
      radius: n.type === 'directory' ? 25 : 18,
      color: LANGUAGE_COLORS[n.language] || LANGUAGE_COLORS.unknown,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links = data.edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        ...e,
        source: e.source,
        target: e.target,
      }));

    return { nodes, links };
  }, [data]);

  // Main D3 rendering effect
  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const { nodes, links } = prepareGraphData();

    // Create main group for zoom
    const g = svg.append('g').attr('class', 'main-group');

    // Zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setTransform(event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Arrow markers for directed edges
    const defs = svg.append('defs');

    // Gradient for links
    const gradient = defs.append('linearGradient')
      .attr('id', 'link-gradient')
      .attr('gradientUnits', 'userSpaceOnUse');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#334155');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#475569');

    // Arrow marker
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#64748b');

    // Glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Simulation setup
    let simulation;

    if (viewMode === 'force') {
      simulation = d3
        .forceSimulation(nodes)
        .force(
          'link',
          d3
            .forceLink(links)
            .id((d) => d.id)
            .distance(120)
            .strength(0.5)
        )
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius((d) => d.radius + 10))
        .force('x', d3.forceX(width / 2).strength(0.05))
        .force('y', d3.forceY(height / 2).strength(0.05));
    } else if (viewMode === 'tree') {
      // Hierarchical tree layout
      const root = buildHierarchy(nodes, links);
      const treeLayout = d3.tree().size([height - 100, width - 200]);
      treeLayout(root);

      nodes.forEach((n) => {
        const d = root.descendants().find((d) => d.data.id === n.id);
        if (d) {
          n.x = d.y + 100;
          n.y = d.x + 50;
          n.fx = n.x;
          n.fy = n.y;
        }
      });

      simulation = d3.forceSimulation(nodes).force('charge', d3.forceManyBody().strength(-50));
    } else if (viewMode === 'cluster') {
      // Cluster by language
      const langGroups = {};
      nodes.forEach((n) => {
        const lang = n.language || 'unknown';
        if (!langGroups[lang]) langGroups[lang] = [];
        langGroups[lang].push(n);
      });

      const centers = {};
      const langs = Object.keys(langGroups);
      const angleStep = (2 * Math.PI) / langs.length;
      const radius = Math.min(width, height) * 0.3;

      langs.forEach((lang, i) => {
        centers[lang] = {
          x: width / 2 + radius * Math.cos(i * angleStep),
          y: height / 2 + radius * Math.sin(i * angleStep),
        };
      });

      simulation = d3
        .forceSimulation(nodes)
        .force('link', d3.forceLink(links).id((d) => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius((d) => d.radius + 5))
        .force('cluster', (alpha) => {
          nodes.forEach((n) => {
            const center = centers[n.language || 'unknown'];
            if (center) {
              n.vx += (center.x - n.x) * alpha * 0.5;
              n.vy += (center.y - n.y) * alpha * 0.5;
            }
          });
        });
    }

    simulationRef.current = simulation;

    // Draw links
    const linkGroup = g.append('g').attr('class', 'links');

    const link = linkGroup
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link-line')
      .attr('stroke', '#334155')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)')
      .on('mouseover', function () {
        d3.select(this).attr('stroke', '#60a5fa').attr('stroke-width', 2.5).attr('stroke-opacity', 1);
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke', '#334155').attr('stroke-width', 1.5).attr('stroke-opacity', 0.6);
      });

    // Draw nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const node = nodeGroup
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active && simulation) simulation.alphaTarget(0);
            if (viewMode === 'force') {
              d.fx = null;
              d.fy = null;
            }
          })
      );

    // Node circles with glow effect
    node
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.15)
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8)
      .style('filter', (d) =>
        selectedNode && selectedNode.id === d.id ? 'url(#glow)' : 'none'
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeSelect(d);
      })
      .on('mouseover', function (event, d) {
        setHoveredNode(d);
        d3.select(this)
          .attr('fill-opacity', 0.3)
          .attr('stroke-width', 3)
          .attr('r', d.radius + 3);
      })
      .on('mouseout', function (event, d) {
        setHoveredNode(null);
        d3.select(this)
          .attr('fill-opacity', 0.15)
          .attr('stroke-width', 2)
          .attr('r', d.radius);
      });

    // Inner dot for file nodes
    node
      .filter((d) => d.type === 'file')
      .append('circle')
      .attr('r', 4)
      .attr('fill', (d) => d.color)
      .attr('pointer-events', 'none');

    // Folder icon for directory nodes
    node
      .filter((d) => d.type === 'directory')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '14px')
      .attr('pointer-events', 'none')
      .text('📁');

    // Labels
    const labels = nodeGroup
      .selectAll('.label')
      .data(nodes)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.radius + 16)
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#e2e8f0')
      .attr('font-weight', '500')
      .text((d) => {
        const name = d.name;
        return name.length > 20 ? name.substring(0, 18) + '...' : name;
      })
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 4px rgba(0,0,0,0.8)');

    // Language badges
    node
      .filter((d) => d.type === 'file' && d.language)
      .append('rect')
      .attr('x', (d) => d.radius - 8)
      .attr('y', (d) => -d.radius - 6)
      .attr('width', 16)
      .attr('height', 6)
      .attr('rx', 3)
      .attr('fill', (d) => d.color)
      .attr('opacity', 0.8)
      .attr('pointer-events', 'none');

    // Update positions on tick
    if (simulation) {
      simulation.on('tick', () => {
        link
          .attr('x1', (d) => d.source.x)
          .attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x)
          .attr('y2', (d) => d.target.y);

        node.attr('transform', (d) => `translate(${d.x},${d.y})`);
        labels.attr('x', (d) => d.x).attr('y', (d) => d.y);
      });
    }

    // Background click to deselect
    svg.on('click', () => {
      onNodeSelect(null);
    });

    // Initial zoom to fit
    if (nodes.length > 0) {
      const xExtent = d3.extent(nodes, (d) => d.x || 0);
      const yExtent = d3.extent(nodes, (d) => d.y || 0);
      const graphWidth = (xExtent[1] || width) - (xExtent[0] || 0);
      const graphHeight = (yExtent[1] || height) - (yExtent[0] || 0);
      const scale = Math.min(
        (width - 100) / (graphWidth || width),
        (height - 100) / (graphHeight || height),
        1.5
      );
      const tx = width / 2 - ((xExtent[0] || 0) + graphWidth / 2) * scale;
      const ty = height / 2 - ((yExtent[0] || 0) + graphHeight / 2) * scale;

      svg.call(
        zoom.transform,
        d3.zoomIdentity.translate(tx, ty).scale(Math.max(scale, 0.3))
      );
    }

    return () => {
      if (simulation) simulation.stop();
    };
  }, [data, viewMode, dimensions, onNodeSelect, selectedNode, prepareGraphData]);

  // Helper to build hierarchy for tree view
  const buildHierarchy = (nodes, links) => {
    const nodeMap = new Map(nodes.map((n) => [n.id, { ...n, children: [] }]));
    const roots = [];

    nodes.forEach((n) => {
      const node = nodeMap.get(n.id);
      const parent = n.path.includes('/') ? n.path.substring(0, n.path.lastIndexOf('/')) : null;

      if (parent && nodeMap.has(parent)) {
        nodeMap.get(parent).children.push(node);
      } else {
        roots.push(node);
      }
    });

    // If multiple roots, create a virtual root
    if (roots.length > 1) {
      return d3.hierarchy({ id: 'root', children: roots }, (d) => d.children);
    }
    return d3.hierarchy(roots[0] || { id: 'root' }, (d) => d.children);
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
    }
  };

  const handleReset = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleFit = () => {
    if (!svgRef.current || !data) return;
    const svg = d3.select(svgRef.current);
    const nodes = data.nodes;
    if (nodes.length === 0) return;

    const padding = 50;
    const xExtent = d3.extent(nodes, (d) => d.x || 0);
    const yExtent = d3.extent(nodes, (d) => d.y || 0);
    const graphWidth = (xExtent[1] || dimensions.width) - (xExtent[0] || 0);
    const graphHeight = (yExtent[1] || dimensions.height) - (yExtent[0] || 0);
    const scale = Math.min(
      (dimensions.width - padding * 2) / (graphWidth || dimensions.width),
      (dimensions.height - padding * 2) / (graphHeight || dimensions.height),
      2
    );
    const tx = dimensions.width / 2 - ((xExtent[0] || 0) + graphWidth / 2) * scale;
    const ty = dimensions.height / 2 - ((yExtent[0] || 0) + graphHeight / 2) * scale;

    svg.transition().duration(500).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(tx, ty).scale(Math.max(scale, 0.2))
    );
  };

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-950">
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{ background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)' }}
      />

      {/* Zoom Controls */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2">
        <div className="glass-panel rounded-xl p-2 flex flex-col gap-1 shadow-xl">
          <button onClick={handleZoomIn} className="p-2 rounded-lg hover:bg-slate-800/80 transition-colors" title="Zoom In">
            <ZoomIn className="w-5 h-5 text-slate-400" />
          </button>
          <button onClick={handleZoomOut} className="p-2 rounded-lg hover:bg-slate-800/80 transition-colors" title="Zoom Out">
            <ZoomOut className="w-5 h-5 text-slate-400" />
          </button>
          <button onClick={handleReset} className="p-2 rounded-lg hover:bg-slate-800/80 transition-colors" title="Reset">
            <RotateCcw className="w-5 h-5 text-slate-400" />
          </button>
          <button onClick={handleFit} className="p-2 rounded-lg hover:bg-slate-800/80 transition-colors" title="Fit to Screen">
            <Maximize2 className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* View Mode Indicator */}
      <div className="absolute top-6 left-6">
        <div className="glass-panel rounded-xl px-4 py-2 flex items-center gap-2">
          {viewMode === 'force' && <Network className="w-4 h-4 text-cyan-400" />}
          {viewMode === 'tree' && <GitFork className="w-4 h-4 text-cyan-400" />}
          {viewMode === 'cluster' && <Grid3x3 className="w-4 h-4 text-cyan-400" />}
          <span className="text-sm font-medium text-slate-300 capitalize">{viewMode} Layout</span>
        </div>
      </div>

      {/* Node count */}
      <div className="absolute bottom-6 right-6">
        <div className="glass-panel rounded-xl px-4 py-2 text-xs text-slate-500 font-mono">
          {data.nodes.length} nodes · {data.edges.length} edges · {transform.k.toFixed(2)}x
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute pointer-events-none z-50" style={{ left: 20, top: 20 }}>
          <div className="glass-panel rounded-xl px-4 py-3 shadow-2xl border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{hoveredNode.type === 'directory' ? '📁' : '📄'}</span>
              <span className="font-semibold text-white text-sm">{hoveredNode.name}</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">{hoveredNode.path}</div>
            {hoveredNode.language && (
              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: LANGUAGE_COLORS[hoveredNode.language] }}
                />
                <span className="text-xs text-slate-400 capitalize">{hoveredNode.language}</span>
                <span className="text-xs text-slate-600">·</span>
                <span className="text-xs text-slate-400">{(hoveredNode.size / 1024).toFixed(1)} KB</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GraphVisualization;
