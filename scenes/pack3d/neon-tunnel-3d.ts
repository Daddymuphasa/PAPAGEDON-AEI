// Neon Tunnel 3D: real torus rings rushing past the camera. True geometry
// (three.js) on the same uniform contract: palette cycles the rings,
// energy drives travel speed, beats punch scale and camera roll.
import * as THREE from 'three';
import type { Scene3DDefinition, Scene3DHandle, SceneUniforms } from '../../src/types';

const RING_COUNT = 26;
const SPAN = 70;

export const neonTunnel3d: Scene3DDefinition = {
  kind: 'scene3d',
  id: 'neon-tunnel-3d',
  name: 'Neon Tunnel 3D',
  tags: ['shader-library', 'scene3d'],
  params: [
    { key: 'p1', label: 'Tunnel width', min: 0.4, max: 1.6, def: 1 },
    { key: 'p2', label: 'Core glow', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Sway', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['tunnel', 'neon', 'rush'],
    energyRange: [0.4, 1.0],
    moods: ['rushing', 'deep', 'fast'],
  },
  create(): Scene3DHandle {
    const root = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(2.3, 0.045, 8, 56);
    const rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; seed: number }[] = [];
    for (let i = 0; i < RING_COUNT; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.position.z = 5 - (i / RING_COUNT) * SPAN;
      mesh.userData.hue = i % 4;
      root.add(mesh);
      rings.push({ mesh, mat, seed: i * 1.37 });
    }
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), coreMat);
    core.position.z = -14;
    root.add(core);

    return {
      object: root,
      update(dt: number, u: SceneUniforms, cam: unknown): void {
        const camera = cam as THREE.PerspectiveCamera;
        const travel = dt * (3 + 14 * u.energy) * u.speed * (1 + 0.5 * u.motion);
        for (const r of rings) {
          let z = r.mesh.position.z + travel;
          if (z > 6) z -= SPAN;
          r.mesh.position.z = z;
          const depth = Math.min(1, Math.max(0, (6 - z) / SPAN)); // 0 near, 1 far
          const breathe = 1 + (u.beat * 0.18 + u.pulse * 0.1) * (1 - depth * 0.5);
          r.mesh.scale.set(breathe * u.p1, breathe * u.p1, 1);
          r.mesh.position.x = Math.sin(u.time * 0.7 + r.seed) * 0.35 * u.p3 * (0.4 + u.bass);
          r.mesh.position.y = Math.cos(u.time * 0.55 + r.seed * 1.3) * 0.3 * u.p3 * (0.4 + u.bass);
          r.mat.color.set(u.palette[r.mesh.userData.hue as number]);
          r.mat.opacity = (1 - depth) * (0.45 + 0.55 * (0.4 + 0.6 * u.energy)) * (0.85 + 0.3 * u.high) * (0.35 + 0.65 * u.intensity);
        }
        coreMat.color.set(u.palette[3]);
        coreMat.opacity = (0.3 + 0.4 * u.mid) * u.p2 * (0.35 + 0.65 * u.intensity);
        core.rotation.x += dt * (0.6 + 2.2 * u.energy);
        core.rotation.y += dt * (0.4 + 1.6 * u.energy);
        const cs = 1 + u.beat * 0.35;
        core.scale.set(cs, cs, cs);

        camera.position.set(Math.sin(u.time * 0.4) * 0.5 * u.bass, Math.cos(u.time * 0.33) * 0.4 * u.bass, 5);
        camera.lookAt(0, 0, -20);
        camera.rotation.z += u.beat * 0.06;
        camera.fov = 62 + u.beat * 8;
        camera.updateProjectionMatrix();
      },
      dispose(): void {
        ringGeo.dispose();
        core.geometry.dispose();
        for (const r of rings) r.mat.dispose();
        coreMat.dispose();
      },
    };
  },
};
