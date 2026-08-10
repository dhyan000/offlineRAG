import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RotateCcw, Layers, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { vectorsApi } from '@/services/api';
import type { VectorNode } from '@/services/api';

// ── colour map ────────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, number> = {
  pdf:   0x2563eb,  // blue
  txt:   0x2563eb,
  docx:  0x2563eb,
  audio: 0xd97706,  // amber
  mp3:   0xd97706,
  wav:   0xd97706,
  m4a:   0xd97706,
  flac:  0xd97706,
  video: 0x7c3aed,  // violet
  mp4:   0x7c3aed,
  mov:   0x7c3aed,
  mkv:   0x7c3aed,
};

function nodeColor(type: string): number {
  return TYPE_COLOR[type.toLowerCase()] ?? 0x94a3b8;
}

// ── component ─────────────────────────────────────────────────────────────────

export const SpatialEmbeddingVisualizer: React.FC = () => {
  const mountRef    = useRef<HTMLDivElement>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef    = useRef<number>(0);
  const angleRef    = useRef<number>(0);
  const nodesRef    = useRef<VectorNode[]>([]);

  const [nodes,      setNodes]      = useState<VectorNode[]>([]);
  const [totalStore, setTotalStore] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [hovered,    setHovered]    = useState<VectorNode | null>(null);

  // ── fetch real PCA data ──────────────────────────────────────────────────
  const fetchVectors = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await vectorsApi.getProjected(200);
      setNodes(data.nodes);
      setTotalStore(data.total_in_store);
      nodesRef.current = data.nodes;
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVectors(); }, [fetchVectors]);

  // ── three.js scene setup ─────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene    = new THREE.Scene();
    scene.fog      = new THREE.FogExp2(0x07080b, 0.018);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 500);
    camera.position.set(0, 12, 30);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x07080b, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Grid
    const grid = new THREE.GridHelper(40, 20, 0x1d3a6e, 0x10141f);
    grid.position.y = -8;
    scene.add(grid);

    // Animate loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (isRotating) {
        angleRef.current += 0.003;
        camera.position.x = Math.sin(angleRef.current) * 30;
        camera.position.z = Math.cos(angleRef.current) * 30;
        camera.lookAt(0, 0, 0);
      }
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── update isRotating without remounting ─────────────────────────────────
  useEffect(() => {
    // isRotating change is picked up by the closure via angleRef pattern
  }, [isRotating]);

  // ── rebuild point cloud when nodes change ────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing point objects
    scene.children
      .filter(c => c.userData.isChunkCloud)
      .forEach(c => { scene.remove(c); (c as THREE.Points).geometry?.dispose(); });

    if (nodes.length === 0) return;

    const positions: number[] = [];
    const colors: number[]    = [];

    nodes.forEach(n => {
      positions.push(n.x, n.y, n.z);
      const c = new THREE.Color(nodeColor(n.type));
      colors.push(c.r, c.g, c.b);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
    });

    const cloud      = new THREE.Points(geo, mat);
    cloud.userData   = { isChunkCloud: true };
    scene.add(cloud);

    // Faint connecting lines among nearby pairs (max 80 pairs for perf)
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1e2540, transparent: true, opacity: 0.35 });
    const linePos: number[] = [];
    const limit = Math.min(nodes.length, 80);
    for (let i = 0; i < limit - 1; i += 2) {
      const a = nodes[i], b = nodes[i + 1];
      const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (dist < 8) {
        linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    if (linePos.length > 0) {
      const lineGeo  = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
      const lines      = new THREE.LineSegments(lineGeo, lineMat);
      lines.userData   = { isChunkCloud: true };
      scene.add(lines);
    }
  }, [nodes]);

  // ── mouse raycasting for hover ───────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    const renderer  = rendererRef.current;
    const camera    = cameraRef.current;
    if (!container || !renderer || !camera) return;

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points!.threshold = 1.5;
    const mouse = new THREE.Vector2();

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const cloud = sceneRef.current?.children.find(c => c.userData.isChunkCloud && c instanceof THREE.Points) as THREE.Points | undefined;
      if (!cloud) { setHovered(null); return; }

      const hits = raycaster.intersectObject(cloud);
      if (hits.length > 0 && hits[0].index != null) {
        setHovered(nodesRef.current[hits[0].index] ?? null);
        container.style.cursor = 'pointer';
      } else {
        setHovered(null);
        container.style.cursor = 'default';
      }
    };

    container.addEventListener('mousemove', onMove);
    return () => container.removeEventListener('mousemove', onMove);
  }, [nodes]);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-[380px] bg-studio-950 border border-white/8 rounded-sm overflow-hidden tactile-card">
      <div ref={mountRef} className="w-full h-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-studio-950/80 gap-2">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
            Fetching vector projections…
          </span>
        </div>
      )}

      {/* Error overlay */}
      {!loading && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <span className="text-[11px] text-slate-500 font-mono">Failed to load vectors</span>
          <button
            onClick={fetchVectors}
            className="text-[10px] border border-white/10 px-3 py-1 rounded-sm text-slate-400 hover:text-white hover:border-white/30 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Layers className="w-8 h-8 text-slate-700" />
          <span className="text-[11px] text-slate-600 font-mono uppercase tracking-wider">
            No vectors indexed yet
          </span>
          <span className="text-[10px] text-slate-700">Upload a document to populate the vector space</span>
        </div>
      )}

      {/* Header overlay */}
      {!loading && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 bg-studio-900/90 border border-white/10 px-3 py-1.5 rounded-sm pointer-events-auto backdrop-blur-md">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-[11px] font-semibold text-slate-200 uppercase tracking-wide">
              3D Vector Space
            </span>
            {nodes.length > 0 && (
              <span className="font-mono text-[10px] text-amber-bright bg-amber-tactile/15 border border-amber-tactile/25 px-1.5 py-0.5 rounded-sm">
                {nodes.length} / {totalStore} CHUNKS  · 384-D PCA
              </span>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={fetchVectors}
              className="p-1.5 text-slate-500 hover:text-slate-300 bg-studio-900/90 border border-white/10 rounded-sm backdrop-blur-md transition-colors"
              title="Refresh vectors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsRotating(r => !r)}
              className={`px-2.5 py-1 text-[11px] font-mono border rounded-sm transition-colors flex items-center gap-1.5 ${
                isRotating
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                  : 'bg-studio-900/90 border-white/10 text-slate-400 hover:text-white backdrop-blur-md'
              }`}
            >
              <RotateCcw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} />
              {isRotating ? 'ORBIT' : 'PAUSED'}
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && nodes.length > 0 && (
        <div className="absolute bottom-3 left-3 flex items-center gap-4 bg-studio-900/90 border border-white/10 px-3 py-1.5 rounded-sm text-[10px] font-mono backdrop-blur-md">
          {[
            { label: 'PDF / TXT', color: 'bg-blue-500' },
            { label: 'AUDIO',     color: 'bg-amber-500' },
            { label: 'VIDEO',     color: 'bg-violet-500' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute top-14 right-3 max-w-xs bg-studio-900/95 border border-blue-500/40 p-3 rounded-sm text-[11px] font-mono shadow-klein backdrop-blur-md pointer-events-none">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-bold text-slate-100 truncate">{hovered.filename}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border uppercase font-bold ${
              ['audio','mp3','wav','m4a','flac'].includes(hovered.type)
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : ['video','mp4','mov','mkv'].includes(hovered.type)
                ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
            }`}>
              {hovered.type}
            </span>
          </div>
          {hovered.text && (
            <div className="text-slate-400 text-[10px] line-clamp-2 mb-1.5 font-sans">
              "{hovered.text}"
            </div>
          )}
          <div className="text-[10px] text-slate-600 border-t border-white/8 pt-1.5">
            CHUNK #{hovered.chunk_idx} · [{hovered.x.toFixed(2)}, {hovered.y.toFixed(2)}, {hovered.z.toFixed(2)}]
          </div>
        </div>
      )}
    </div>
  );
};
