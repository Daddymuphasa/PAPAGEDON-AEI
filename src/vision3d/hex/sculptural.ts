// ── Sculptural scenes ─────────────────────────────────────────────────────────
// TypeScript port of the createSculpturalModes harness plus the liquid + tunnel
// builders from PORTFOLIO- origin/main lib/vision/visualizers/sculptural-
// modes.js (the live /app Vision mode). Only the two sculptural
// originals are ported (Liquid Mirror, Wave Tunnel); the other eight modes
// are out of scope. Geometry and motion math are verbatim from the original.
import * as THREE from 'three';
import type { OriginalSignals } from '../adapter';
import type { SculpturalModeId } from './packs';

const TAU = Math.PI * 2;

function level(value: number): number {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function makeStars(): THREE.Points {
  const count = 440;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const seed = i * 17.271;
    positions[i * 3] = Math.sin(seed * 1.3) * 9;
    positions[i * 3 + 1] = Math.sin(seed * 2.7) * 6;
    positions[i * 3 + 2] = -7 - (i % 8) * 0.5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xaac2b9,
      size: 0.018,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
}

export interface SculpturalMode {
  group: THREE.Group;
  camera: [number, number, number];
  lookAt?: [number, number, number];
  mobileFraming?: number;
  update: (signals: OriginalSignals, time: number, delta: number) => void;
}

// ── Liquid Mirror ─────────────────────────────────────────────────────────────
function liquidMode(): SculpturalMode {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(10.5, 10.5, 72, 72);
  geometry.rotateX(-Math.PI / 2);
  const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
  const base = new Float32Array(positionAttr.array);
  const surface = new THREE.Mesh(
    geometry,
    new THREE.MeshPhysicalMaterial({
      color: 0x9bbac5,
      metalness: 0.72,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      emissive: 0x1c5157,
      emissiveIntensity: 0.2,
    }),
  );
  const grid = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0xc5e9e1,
      wireframe: true,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    }),
  );
  grid.scale.setScalar(1.003);
  group.add(surface, grid);
  return {
    group,
    camera: [0, 5.6, 10.2],
    update(signals, time) {
      const position = geometry.attributes.position as THREE.BufferAttribute;
      const bass = level(signals.bass);
      const mid = level(signals.mid);
      const treble = level(signals.treble);
      for (let i = 0; i < position.count; i += 1) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        const radius = Math.hypot(x, z);
        const broad = Math.sin(radius * 2.2 - time * 2.1) * (0.12 + bass * 0.45);
        const crossing = Math.sin(x * 2.6 + time * 1.6) * Math.cos(z * 2.2 - time) * (0.06 + mid * 0.22);
        const detail = Math.sin((x + z) * 6 - time * 4) * treble * 0.05;
        position.setY(i, broad + crossing + detail);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      surface.material.emissiveIntensity = 0.12 + level(signals.beat) * 0.42;
      grid.material.opacity = 0.11 + level(signals.energy) * 0.16;
    },
  };
}

// ── Wave Tunnel ───────────────────────────────────────────────────────────────
function tunnelMode(): SculpturalMode {
  const group = new THREE.Group();
  const rings = Array.from({ length: 24 }, (_, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.025 + (i % 4) * 0.006, 8, 96),
      new THREE.MeshBasicMaterial({
        color: [0x91d5b6, 0xd9bd7e, 0x8bbbd2, 0xb9a1d5][i % 4],
        transparent: true,
        opacity: 0.35 + (i % 4) * 0.07,
      }),
    );
    group.add(ring);
    return ring;
  });
  return {
    group,
    camera: [0, 0, 10.5],
    lookAt: [0, 0, -5],
    update(signals, time) {
      const bass = level(signals.bass);
      const beat = level(signals.beat);
      const treble = level(signals.treble);
      rings.forEach((ring, i) => {
        const travel = (time * (0.85 + bass * 1.7) + i * 1.35) % 32;
        ring.position.z = -26 + travel;
        ring.position.x = Math.sin(i * 0.32 + time * 0.3) * 0.14;
        ring.position.y = Math.cos(i * 0.38 + time * 0.26) * 0.14;
        ring.rotation.z = time * 0.08 + i * 0.11;
        ring.scale.setScalar(1 + beat * 0.08 + treble * 0.08);
        ring.material.opacity = Math.min(0.84, 0.2 + (travel / 32) * 0.5 + beat * 0.15);
      });
    },
  };
}

const builders: Record<SculpturalModeId, () => SculpturalMode> = {
  liquid: liquidMode,
  tunnel: tunnelMode,
};

export const SCULPTURAL_BUILDERS = builders;

export interface SculpturalModes {
  resize: (width: number, height: number) => void;
  setMode: (mode: SculpturalModeId | null, accent?: number) => void;
  render: (signals: OriginalSignals, time: number, delta: number) => void;
}

export function createSculpturalModes(renderer: THREE.WebGLRenderer): SculpturalModes {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07100f);
  scene.add(makeStars());
  scene.add(new THREE.AmbientLight(0xc4d7d0, 1.4));
  const key = new THREE.PointLight(0xe7c894, 62, 28);
  key.position.set(-3, 5, 7);
  scene.add(key);
  const rim = new THREE.PointLight(0x81cbb8, 44, 30);
  rim.position.set(4, -2, -2);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const cache = new Map<SculpturalModeId, SculpturalMode>();
  let active: SculpturalMode | null = null;
  let aspect = 1;

  function resize(width: number, height: number): void {
    aspect = width / Math.max(1, height);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  function setMode(mode: SculpturalModeId | null, accent?: number): void {
    if (active) active.group.visible = false;
    if (!mode) {
      active = null;
      return;
    }
    if (!cache.has(mode)) {
      const created = builders[mode]();
      scene.add(created.group);
      cache.set(mode, created);
    }
    active = cache.get(mode) ?? null;
    if (active) active.group.visible = true;
    key.color.setHex(accent ?? 0xe7c894);
    // Only liquid + tunnel are ported, so the rim tint is constant.
    rim.color.setHex(0x91b8d1);
  }

  function render(signals: OriginalSignals, time: number, delta: number): void {
    if (!active) return;
    const framing = aspect < 0.9 ? (active.mobileFraming ?? 1.15) : 1;
    const [cx, cy, cz] = active.camera;
    camera.position.set(cx * framing, cy * framing, cz * framing);
    const look = active.lookAt ?? [0, 0, 0];
    camera.lookAt(look[0], look[1], look[2]);
    active.update(signals, time, delta);
    key.intensity = 45 + level(signals.bass) * 35;
    rim.intensity = 32 + level(signals.treble) * 28;
    renderer.render(scene, camera);
  }

  return { resize, setMode, render };
}
