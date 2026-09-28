import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, ArrowRight, Headphones, GitCompare, Satellite, Sparkles } from 'lucide-react';
import { NavTabId } from './Header';

interface AIRobotGuideProps {
  currentTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
}

type GuideTopic = 'sound' | 'delta' | 'gpm' | null;

const pageGuidance: Record<NavTabId, { title: string; description: string; next: NavTabId }> = {
  explore: {
    title: 'Map Dashboard',
    description: 'Explore Bangladesh rainfall by year or divisional city. Select a year or place to update the shared selection used across the app.',
    next: 'listen',
  },
  listen: {
    title: 'Listen & Sonification',
    description: 'Choose a recorded WAV or synthesize the daily rainfall series. Play, pause, restart, change speed, and follow the live day and frequency readouts.',
    next: 'creative',
  },
  compare: {
    title: 'Compare & Delta',
    description: 'Choose observations A and B. Delta is calculated from the selected verified rainfall values as B minus A; its direction and size shape the rain-pitch sweep and drop density.',
    next: 'science',
  },
  risk: {
    title: 'Risk Lens',
    description: 'The selected year’s peak daily rainfall is matched to the BMD Light, Heavy, and Very Heavy reference bands. These are contextual categories, not forecasts or emergency warnings.',
    next: 'history',
  },
  anomaly: {
    title: 'Anomaly & Baseline',
    description: 'Read each annual departure from its climatological baseline. Surplus bars rise above zero; deficit bars fall below. Select or focus a bar to inspect its rainfall, baseline, and anomaly.',
    next: 'science',
  },
  history: {
    title: 'Historical Events',
    description: 'Review documented flood and landslide context with source links. Selecting an event synchronizes its year with the rest of the application.',
    next: 'passport',
  },
  passport: {
    title: 'Data Passport',
    description: 'Inspect dataset provenance, spatial and temporal coverage, audio specifications, and the mathematical transformations used by the instrument.',
    next: 'science',
  },
  creative: {
    title: 'Creative Mode',
    description: 'Choose a rain preset, then shape register, stereo pan, tempo, and ambience level. Preview the soundscape; rainfall data and scientific values remain unchanged.',
    next: 'listen',
  },
  science: {
    title: 'Science & Method',
    description: 'Follow the pipeline from NASA GPM IMERG observations through normalization and frequency mapping to risk interpretation and data traceability.',
    next: 'passport',
  },
};

const topicGuidance: Record<Exclude<GuideTopic, null>, { title: string; body: string; tab: NavTabId }> = {
  sound: {
    title: 'How to play sound',
    body: 'Open Listen, select Daily Synthesis or Master WAV, then press Play. Daily synthesis sonifies the selected year’s measured rainfall day by day. Use the speed and volume controls to adjust playback.',
    tab: 'listen',
  },
  delta: {
    title: 'What Delta Sound means',
    body: 'Delta is observation B minus observation A. The actual rainfall rates determine the start and end pitches within 220–880 Hz; the magnitude controls how densely impacts arrive. Positive changes rise and build; negative changes descend and thin out.',
    tab: 'compare',
  },
  gpm: {
    title: 'What is GPM IMERG?',
    body: 'NASA’s Global Precipitation Measurement (GPM) IMERG combines satellite microwave and infrared observations to estimate precipitation. This project uses the Early Run daily product and shows its spatial and temporal limits in the Data Passport.',
    tab: 'passport',
  },
};

export const AIRobotGuide: React.FC<AIRobotGuideProps> = ({ currentTab, onSelectTab }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<GuideTopic>(null);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const guidance = pageGuidance[currentTab];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (error) {
      console.error('3D guide could not initialize WebGL; showing the accessible fallback icon.', error);
      setWebglAvailable(false);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(96, 96, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.z = 4.2;

    const robot = new THREE.Group();
    scene.add(robot);
    scene.add(new THREE.AmbientLight(0x91dfff, 1.9));
    const keyLight = new THREE.PointLight(0x38bdf8, 5, 12);
    keyLight.position.set(2, 2, 3);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x818cf8, 3, 10);
    fillLight.position.set(-2, -1, 2);
    scene.add(fillLight);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.86, 48, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x14243b,
        metalness: 0.72,
        roughness: 0.22,
        clearcoat: 0.9,
        clearcoatRoughness: 0.18,
      })
    );
    robot.add(core);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.035, 10, 96),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.82 })
    );
    halo.rotation.x = 0.72;
    halo.rotation.y = -0.28;
    robot.add(halo);

    const face = new THREE.Group();
    face.position.z = 0.78;
    robot.add(face);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x8be9ff });
    for (const x of [-0.3, 0.3]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 20), eyeMaterial);
      eye.position.set(x, 0.12, 0);
      face.add(eye);
    }
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.018, 8, 32, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
    );
    smile.position.set(0, -0.2, 0);
    smile.rotation.z = Math.PI;
    face.add(smile);

    const nodeGeometry = new THREE.SphereGeometry(0.11, 16, 16);
    for (const [x, y] of [[-1.05, 0.08], [1.05, 0.08], [0, 1.05]] as const) {
      const node = new THREE.Mesh(
        nodeGeometry,
        new THREE.MeshBasicMaterial({ color: x === 0 ? 0xa5b4fc : 0x38bdf8 })
      );
      node.position.set(x, y, 0.12);
      robot.add(node);
    }

    let frame = 0;
    let pointerInside = false;
    const onPointerEnter = () => { pointerInside = true; };
    const onPointerLeave = () => { pointerInside = false; };
    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointerleave', onPointerLeave);

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = motionPreference.matches;
    const animate = (time: number) => {
      if (document.visibilityState === 'hidden') {
        frame = requestAnimationFrame(animate);
        return;
      }
      frame = requestAnimationFrame(animate);
      if (!prefersReducedMotion) {
        robot.position.y = Math.sin(time * 0.0015) * 0.07;
        robot.rotation.y += (pointerInside ? 0.012 : 0.0025);
        halo.rotation.z += pointerInside ? 0.009 : 0.002;
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') renderer.render(scene, camera);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('pointerenter', onPointerEnter);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    };
  }, []);

  const openTopic = (selectedTopic: Exclude<GuideTopic, null>) => {
    setTopic(selectedTopic);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="robot-guide-title"
          className="w-[min(23rem,calc(100vw-2rem))] rounded-3xl border border-rain-300/20 bg-space-900/85 p-5 shadow-2xl shadow-cyan-950/50 backdrop-blur-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-rain-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              SonifyEarth guide
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close guide"
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rain-300"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <h2 id="robot-guide-title" className="mt-3 text-lg font-bold font-display text-white">
            {topic ? topicGuidance[topic].title : `Guide to ${guidance.title}`}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {topic ? topicGuidance[topic].body : guidance.description}
          </p>
          {!topic && (
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Data foundation: NASA GPM IMERG Early Daily V07. Explore the Data Passport for provenance and coverage details.
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button type="button" onClick={() => openTopic('sound')} className="guide-action">
              <Headphones className="h-4 w-4" aria-hidden="true" />
              How to play sound?
            </button>
            <button type="button" onClick={() => openTopic('delta')} className="guide-action">
              <GitCompare className="h-4 w-4" aria-hidden="true" />
              Explain Delta Sound
            </button>
            <button type="button" onClick={() => openTopic('gpm')} className="guide-action">
              <Satellite className="h-4 w-4" aria-hidden="true" />
              What is GPM IMERG?
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectTab(topic ? topicGuidance[topic].tab : guidance.next);
              setTopic(null);
              setOpen(false);
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-rain-300/25 bg-rain-400/10 px-4 py-2.5 text-xs font-semibold text-rain-100 transition-colors hover:bg-rain-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rain-300"
          >
            {topic ? `Open ${topicGuidance[topic].tab}` : `Continue to ${guidance.next}`}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>
      )}
      <button
        type="button"
        aria-label={open ? 'Close SonifyEarth guide' : 'Open SonifyEarth guide'}
        aria-expanded={open}
        onClick={() => {
          setOpen((isOpen) => !isOpen);
          setTopic(null);
        }}
        className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-rain-300/30 bg-space-900/80 shadow-lg shadow-cyan-950/40 transition-all hover:scale-105 hover:shadow-glow-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rain-300"
      >
        <span className="absolute inset-0 rounded-full bg-cyan-400/10 blur-xl transition-opacity group-hover:opacity-100" />
        <canvas ref={canvasRef} width={96} height={96} aria-hidden="true" className={`relative h-16 w-16 ${webglAvailable ? '' : 'hidden'}`} />
        {!webglAvailable && <Sparkles className="relative h-7 w-7 text-rain-200" aria-hidden="true" />}
      </button>
    </div>
  );
};
