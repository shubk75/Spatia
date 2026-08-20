import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { 
  Compass, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  Layers, 
  Plus, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Sparkles,
  DoorOpen,
  Info
} from 'lucide-react';

export default function PanoramaViewer360({
  equirectangularUrl,
  crossCubemapUrl,
  roomName,
  hotspots = [],
  onNavigateRoom,
  onAddHotspotRequest,
  allRooms = []
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const sphereMeshRef = useRef(null);
  const hotspotSpritesRef = useRef([]);
  const animFrameIdRef = useRef(null);

  // Viewer State
  const [viewMode, setViewMode] = useState('3d'); // '3d' or 'cross'
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fov, setFov] = useState(75);
  const [headingDeg, setHeadingDeg] = useState(0);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);
  const [isAddingHotspot, setIsAddingHotspot] = useState(false);
  const [hotspotClickPos, setHotspotClickPos] = useState(null);

  // Mouse interaction state
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const lon = useRef(0);
  const lat = useRef(0);
  const phi = useRef(0);
  const theta = useRef(0);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container || !equirectangularUrl || viewMode !== '3d') return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 1, 1100);
    camera.target = new THREE.Vector3(0, 0, 0);
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Texture & Photosphere Mesh
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(equirectangularUrl, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;

      const geometry = new THREE.SphereGeometry(500, 60, 40);
      // Invert geometry so faces point inwards
      geometry.scale(-1, 1, 1);

      const material = new THREE.MeshBasicMaterial({ map: texture });
      const sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);
      sphereMeshRef.current = sphere;
    });

    // 4. Hotspot Sprites creation
    hotspotSpritesRef.current = [];
    const createHotspotTexture = (label) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Glowing outer ring
      ctx.beginPath();
      ctx.arc(128, 128, 90, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
      ctx.fill();

      // Inner circular badge
      ctx.beginPath();
      ctx.arc(128, 128, 65, 0, 2 * Math.PI);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Doorway icon / text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 50px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚪', 128, 128);

      const tex = new THREE.CanvasTexture(canvas);
      return tex;
    };

    hotspots.forEach((hs) => {
      const spriteTex = createHotspotTexture(hs.label);
      const spriteMat = new THREE.SpriteMaterial({ map: spriteTex, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(40, 40, 1);

      // Convert yaw/pitch to Cartesian on sphere radius 450
      const hsPhi = THREE.MathUtils.degToRad(90 - hs.pitch_deg);
      const hsTheta = THREE.MathUtils.degToRad(hs.yaw_deg);
      const r = 450;

      sprite.position.x = r * Math.sin(hsPhi) * Math.sin(hsTheta);
      sprite.position.y = r * Math.cos(hsPhi);
      sprite.position.z = r * Math.sin(hsPhi) * Math.cos(hsTheta);

      sprite.userData = hs;
      scene.add(sprite);
      hotspotSpritesRef.current.push(sprite);
    });

    // 5. Animation Render Loop
    let lastTime = performance.now();
    const animate = (time) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (isAutoRotating && !isDragging.current) {
        lon.current += 0.08;
      }

      // Clamp latitude
      lat.current = Math.max(-85, Math.min(85, lat.current));
      phi.current = THREE.MathUtils.degToRad(90 - lat.current);
      theta.current = THREE.MathUtils.degToRad(lon.current);

      // Update heading for Compass HUD (0° = North)
      const currentHeading = (Math.round(-lon.current) % 360 + 360) % 360;
      setHeadingDeg(currentHeading);

      const targetX = 500 * Math.sin(phi.current) * Math.cos(theta.current);
      const targetY = 500 * Math.cos(phi.current);
      const targetZ = 500 * Math.sin(phi.current) * Math.sin(theta.current);

      camera.lookAt(targetX, targetY, targetZ);
      renderer.render(scene, camera);
    };
    animate(performance.now());

    // 6. Resize Observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (renderer) renderer.dispose();
    };
  }, [equirectangularUrl, viewMode, hotspots, isAutoRotating]);

  // Handle Mouse / Touch Orbit Controls
  const handlePointerDown = (e) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    // Check Raycast on Hotspots for hover effect
    if (rendererRef.current && cameraRef.current && sceneRef.current && !isDragging.current) {
      const rect = mountRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);
        const intersects = raycaster.intersectObjects(hotspotSpritesRef.current);
        if (intersects.length > 0) {
          setHoveredHotspot(intersects[0].object.userData);
        } else {
          setHoveredHotspot(null);
        }
      }
    }

    if (!isDragging.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    lon.current -= deltaX * 0.15;
    lat.current += deltaY * 0.15;

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;

    // Check click on hotspot or drop new hotspot
    if (rendererRef.current && cameraRef.current && mountRef.current) {
      const rect = mountRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

      if (isAddingHotspot) {
        // Calculate spherical yaw/pitch clicked
        const currentYaw = (lon.current % 360 + 360) % 360;
        const currentPitch = lat.current;
        onAddHotspotRequest({
          yaw_deg: Math.round(currentYaw),
          pitch_deg: Math.round(currentPitch)
        });
        setIsAddingHotspot(false);
        return;
      }

      // Check click on existing hotspot
      const intersects = raycaster.intersectObjects(hotspotSpritesRef.current);
      if (intersects.length > 0) {
        const clickedHs = intersects[0].object.userData;
        onNavigateRoom(clickedHs.target_room_id);
      }
    }
  };

  // Wheel Zoom / FOV
  const handleWheel = (e) => {
    e.preventDefault();
    const newFov = Math.max(30, Math.min(100, fov + e.deltaY * 0.05));
    setFov(newFov);
    if (cameraRef.current) {
      cameraRef.current.fov = newFov;
      cameraRef.current.updateProjectionMatrix();
    }
  };

  // Compass Heading Name
  const getCompassHeadingName = (deg) => {
    if (deg >= 337.5 || deg < 22.5) return 'N (0°)';
    if (deg >= 22.5 && deg < 67.5) return 'NE (45°)';
    if (deg >= 67.5 && deg < 112.5) return 'E (90°)';
    if (deg >= 112.5 && deg < 157.5) return 'SE (135°)';
    if (deg >= 157.5 && deg < 202.5) return 'S (180°)';
    if (deg >= 202.5 && deg < 247.5) return 'SW (225°)';
    if (deg >= 247.5 && deg < 292.5) return 'W (270°)';
    return 'NW (315°)';
  };

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl transition-all ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[650px]'
    }`}>
      
      {/* 3D WebGL Canvas View */}
      {viewMode === '3d' ? (
        <div
          ref={mountRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          className={`w-full h-full cursor-grab active:cursor-grabbing ${
            isAddingHotspot ? 'cursor-crosshair' : ''
          }`}
        />
      ) : (
        /* Cross-unfold 2D Cubemap View */
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-950 overflow-auto">
          {crossCubemapUrl ? (
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                6-Face Cubemap Cross Layout (Unfolded Geometry)
              </span>
              <img
                src={crossCubemapUrl}
                alt="Cubemap Cross Unfold"
                className="max-h-[500px] max-w-full rounded-2xl border border-slate-800 shadow-2xl mx-auto"
              />
            </div>
          ) : (
            <div className="text-slate-400 text-xs">Cross layout unavailable</div>
          )}
        </div>
      )}

      {/* Top Floating HUD: Room Title & Live Compass Widget */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        
        {/* Room Info Pill */}
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-slate-800 text-white shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <div className="text-xs font-bold leading-tight">{roomName || 'Panoramic View'}</div>
            <div className="text-[10px] text-slate-400">Fixed-Position 3D Photosphere</div>
          </div>
        </div>

        {/* Directional HUD Compass Ring */}
        <div className="pointer-events-auto flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-slate-800 text-slate-200 shadow-xl">
          <Compass className="w-4 h-4 text-brand-400" />
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-white">{getCompassHeadingName(headingDeg)}</div>
            <div className="text-[9px] text-slate-400 font-mono">{headingDeg}° Azimuth</div>
          </div>
        </div>
      </div>

      {/* Adding Hotspot Mode Indicator Banner */}
      {isAddingHotspot && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-brand-600/90 backdrop-blur-md text-white text-xs font-bold shadow-2xl border border-white/20 animate-bounce">
          🎯 Click anywhere on a wall or door to drop a doorway portal!
        </div>
      )}

      {/* Hovered Hotspot Tooltip */}
      {hoveredHotspot && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none px-4 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-brand-500/50 text-white text-xs shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95">
          <DoorOpen className="w-4 h-4 text-brand-400" />
          <div>
            <span className="font-bold text-brand-300 block">{hoveredHotspot.label}</span>
            <span className="text-[10px] text-slate-400">Click to walk through portal</span>
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-slate-800 shadow-2xl flex-wrap">
        
        {/* Toggle 3D vs Cross Layout */}
        <button
          onClick={() => setViewMode(viewMode === '3d' ? 'cross' : '3d')}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="Toggle 3D Sphere vs Cubemap Cross Unfold"
        >
          <Layers className="w-4 h-4 text-brand-400" />
          <span className="hidden sm:inline">{viewMode === '3d' ? 'Cubemap Cross' : '3D Sphere'}</span>
        </button>

        {/* Auto Rotate Toggle */}
        <button
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold ${
            isAutoRotating 
              ? 'bg-brand-600 text-white border-brand-400' 
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
          title="Toggle Auto 360° Rotation"
        >
          {isAutoRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
          <span className="hidden sm:inline">Tour Spin</span>
        </button>

        {/* Add Hotspot Portal Button */}
        {allRooms.length > 1 && (
          <button
            onClick={() => setIsAddingHotspot(!isAddingHotspot)}
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
              isAddingHotspot
                ? 'bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-500/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Link Doorway Hotspot to another room"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Add Doorway</span>
          </button>
        )}

        {/* Zoom In & Out */}
        <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-0.5 border border-slate-800">
          <button
            onClick={() => {
              const newFov = Math.max(30, fov - 10);
              setFov(newFov);
              if (cameraRef.current) {
                cameraRef.current.fov = newFov;
                cameraRef.current.updateProjectionMatrix();
              }
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              const newFov = Math.min(100, fov + 10);
              setFov(newFov);
              if (cameraRef.current) {
                cameraRef.current.fov = newFov;
                cameraRef.current.updateProjectionMatrix();
              }
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Download Photosphere Image */}
        <a
          href={equirectangularUrl}
          download={`${roomName || 'photosphere'}_360.jpg`}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          title="Download 360° Photosphere Image (JPG)"
        >
          <Download className="w-4 h-4 text-brand-400" />
        </a>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

    </div>
  );
}
