import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ProcessingOrbProps {
  status: 'scanning' | 'embedding' | 'indexing' | 'completed' | 'idle';
  progress?: number;
}

export const ProcessingOrb: React.FC<ProcessingOrbProps> = ({ status, progress = 0 }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Color Mapping
    let primaryColor = 0x1d4ed8; // Klein Blue (Embedding)
    if (status === 'scanning') primaryColor = 0xd97706; // Safety Amber
    if (status === 'indexing') primaryColor = 0x059669; // Emerald Green
    if (status === 'completed') primaryColor = 0x3b82f6; // Bright Blue

    // 3. Central Wireframe Icosahedron Orb
    const orbGeometry = new THREE.IcosahedronGeometry(2, 2);
    const orbMaterial = new THREE.MeshBasicMaterial({
      color: primaryColor,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
    scene.add(orbMesh);

    // 4. Inner Solid Core
    const coreGeometry = new THREE.IcosahedronGeometry(1.1, 1);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: primaryColor,
      wireframe: false,
      transparent: true,
      opacity: 0.25,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 5. Outer Gyroscope Rings
    const ring1Geom = new THREE.TorusGeometry(3.1, 0.03, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: primaryColor, transparent: true, opacity: 0.8 });
    const ring1 = new THREE.Mesh(ring1Geom, ring1Mat);
    scene.add(ring1);

    const ring2Geom = new THREE.TorusGeometry(3.6, 0.02, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.4 });
    const ring2 = new THREE.Mesh(ring2Geom, ring2Mat);
    ring2.rotation.x = Math.PI / 3;
    scene.add(ring2);

    // 6. Animation Loop
    let reqId: number;
    let speedMultiplier = status === 'idle' ? 0.5 : 1.5;

    const animate = () => {
      reqId = requestAnimationFrame(animate);

      orbMesh.rotation.y += 0.008 * speedMultiplier;
      orbMesh.rotation.x += 0.005 * speedMultiplier;

      coreMesh.rotation.y -= 0.012 * speedMultiplier;

      ring1.rotation.z += 0.015 * speedMultiplier;
      ring1.rotation.y += 0.005 * speedMultiplier;

      ring2.rotation.x += 0.01 * speedMultiplier;
      ring2.rotation.z -= 0.008 * speedMultiplier;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      orbGeometry.dispose();
      orbMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      ring1Geom.dispose();
      ring1Mat.dispose();
      ring2Geom.dispose();
      ring2Mat.dispose();
      renderer.dispose();
    };
  }, [status]);

  return (
    <div className="relative w-full h-[220px] flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-studio-900/90 border border-white/10 rounded-sm font-mono text-xs backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
        <span className="text-slate-200 uppercase tracking-wider font-semibold">
          AI ENGINE ORB // {status} ({progress}%)
        </span>
      </div>
    </div>
  );
};
