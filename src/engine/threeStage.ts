// Three.js stage: renders Scene3DDefinition entries (real geometry) on the
// same uniform contract as the fragment-shader Renderer. Owns its own
// canvas + WebGLRenderer; pages stack it under/over the fragment canvas
// and crossfade with CSS when a transition involves a 3D scene.
import * as THREE from 'three';
import type { AudioFeatures, Scene3DDefinition, Scene3DHandle, SceneUniforms } from '../types';
import type { RenderQuality } from './renderer';

export type { SceneUniforms };

export function featuresToSceneUniforms(
  time: number,
  f: AudioFeatures,
  palette: string[],
  intensity: number,
  speed: number,
  pulse: number,
  extra: [number, number, number],
  motion: number,
): SceneUniforms {
  const full = palette.length > 0 ? palette : ['#202020'];
  const p = [0, 1, 2, 3].map((i) => full[Math.min(i, full.length - 1)] as string) as [
    string,
    string,
    string,
    string,
  ];
  return {
    time,
    energy: f.energy,
    beat: f.beat ? 1 : 0,
    bass: f.bass,
    mid: f.mid,
    high: f.high,
    bpm: f.bpm,
    intensity,
    speed,
    pulse,
    p1: extra[0],
    p2: extra[1],
    p3: extra[2],
    palette: p,
    motion,
  };
}

export class ThreeStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private current: Scene3DHandle | null = null;
  private currentDef: Scene3DDefinition | null = null;
  private lastT = -1;
  quality: RenderQuality = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    this.camera.position.set(0, 0, 8);
    this.scene.background = new THREE.Color(0x000000);
  }

  get scene3D(): THREE.Scene {
    return this.scene;
  }

  get camera3D(): THREE.PerspectiveCamera {
    return this.camera;
  }

  get activeId(): string | null {
    return this.currentDef?.id ?? null;
  }

  setQuality(q: RenderQuality): void {
    this.quality = q;
  }

  setScene(def: Scene3DDefinition): void {
    if (this.currentDef?.id === def.id && this.current) return;
    this.clearScene();
    this.currentDef = def;
    this.current = def.create();
    this.scene.add(this.current.object as THREE.Object3D);
    this.scene.background = new THREE.Color(0x000000);
    this.camera.position.set(0, 0, 8);
    this.camera.rotation.set(0, 0, 0);
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
    this.lastT = -1;
  }

  render(
    time: number,
    f: AudioFeatures,
    palette: string[],
    intensity: number,
    speed: number,
    pulse: number,
    extra: [number, number, number],
    scale: number,
    motion = 0,
  ): void {
    if (!this.current) return;
    const canvas = this.renderer.domElement;
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      this.renderer.setSize(w, h, false);
    }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const dt = this.lastT < 0 ? 1 / 60 : Math.min(0.1, time - this.lastT);
    this.lastT = time;
    const u = featuresToSceneUniforms(time, f, palette, intensity, speed, pulse, extra, motion);
    this.current.update(dt, u, this.camera);
    this.renderer.render(this.scene, this.camera);
  }

  private clearScene(): void {
    if (this.current) {
      this.scene.remove(this.current.object as THREE.Object3D);
      try {
        this.current.dispose?.();
      } catch {
        /* best effort */
      }
      this.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
        (mesh.geometry as THREE.BufferGeometry | undefined)?.dispose();
      });
      this.scene.clear();
      this.current = null;
      this.currentDef = null;
    }
  }


  dispose(): void {
    this.clearScene();
    this.renderer.dispose();
  }
}
