// Planet Rings 3D: a real shaded planet with tilted rings, moons and a
// starfield. True geometry (three.js) on the same uniform contract as the
// fragment shaders: palette drives every material, beats punch the camera.
import * as THREE from 'three';
import type { Scene3DDefinition, Scene3DHandle, SceneUniforms } from '../../src/types';

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const planetRings3d: Scene3DDefinition = {
  kind: 'scene3d',
  id: 'planet-rings-3d',
  name: 'Planet Rings 3D',
  tags: ['shader-library', 'scene3d'],
  params: [
    { key: 'p1', label: 'Ring tilt', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Glow halo', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Star drift', min: 0, max: 2, def: 1 },
  ],
  meta: {
    themeTags: ['cosmic', 'planet', 'orbit'],
    energyRange: [0.2, 0.7],
    moods: ['floating', 'vast', 'slow'],
  },
  create(): Scene3DHandle {
    const root = new THREE.Group();

    const starGeo = new THREE.BufferGeometry();
    const N = 900;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 20 + Math.random() * 40;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.35,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    root.add(stars);

    const glowTex = glowTexture();
    const haloMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(9, 9, 1);
    root.add(halo);

    const planetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.15 });
    const planet = new THREE.Mesh(new THREE.SphereGeometry(1.6, 48, 32), planetMat);
    root.add(planet);
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.66, 2), shellMat);
    root.add(shell);

    const ringMatA = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringA = new THREE.Mesh(new THREE.RingGeometry(2.1, 3.1, 128), ringMatA);
    const ringMatB = ringMatA.clone();
    const ringB = new THREE.Mesh(new THREE.RingGeometry(3.25, 3.8, 128), ringMatB);
    const rings = new THREE.Group();
    rings.add(ringA, ringB);
    rings.rotation.x = Math.PI / 2.4;
    root.add(rings);

    const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const moonGeo = new THREE.SphereGeometry(0.16, 16, 12);
    const moon1 = new THREE.Mesh(moonGeo, moonMat);
    const moon2 = new THREE.Mesh(moonGeo, moonMat.clone());
    root.add(moon1, moon2);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-4, 3, 5);
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    root.add(key, amb);

    let moonA1 = 0;
    let moonA2 = Math.PI;
    const camPos = new THREE.Vector3();
    return {
      object: root,
      update(dt: number, u: SceneUniforms, cam: unknown): void {
        const camera = cam as THREE.PerspectiveCamera;
        planetMat.color.set(u.palette[1]);
        shellMat.color.set(u.palette[3]);
        ringMatA.color.set(u.palette[2]);
        ringMatB.color.set(u.palette[3]);
        starMat.color.set(u.palette[3]);
        moonMat.color.set(u.palette[0]);
        (moon2.material as THREE.MeshBasicMaterial).color.set(u.palette[2]);
        haloMat.color.set(u.palette[1]);
        haloMat.opacity = Math.min(1, (0.3 + 0.3 * u.energy + 0.25 * u.pulse) * u.p2 * (0.35 + 0.65 * u.intensity));
        starMat.opacity = 0.9 * (0.35 + 0.65 * u.intensity);
        key.color.set(u.palette[3]);
        key.intensity = 2.2 * (0.75 + 0.5 * u.bass);
        amb.color.set(u.palette[0]);
        shellMat.opacity = 0.05 + 0.07 * u.mid;

        planet.rotation.y += dt * (0.15 + 0.5 * u.energy) * u.speed;
        shell.rotation.y -= dt * 0.1;
        const pulse = 1 + u.beat * 0.06;
        planet.scale.set(pulse, pulse, pulse);
        rings.rotation.x = Math.PI / 2.4 + Math.sin(u.time * 0.2) * 0.08 * u.p1;
        rings.rotation.z += dt * 0.05;
        const shimmer = 0.45 + 0.25 * u.high + 0.2 * u.beat;
        ringMatA.opacity = shimmer;
        ringMatB.opacity = shimmer * 0.7;
        stars.rotation.y += dt * 0.01 * u.p3 * u.speed;

        moonA1 += dt * (0.4 + u.energy * 0.8) * (1 + u.motion);
        moonA2 += dt * (0.25 + u.energy * 0.5) * (1 + u.motion);
        moon1.position.set(Math.cos(moonA1) * 4.4, Math.sin(moonA1 * 0.7) * 0.8, Math.sin(moonA1) * 4.4);
        moon2.position.set(Math.cos(moonA2) * 5.4, Math.sin(moonA2 * 0.5 + 2) * 1.0, Math.sin(moonA2) * 5.4);

        const orbit = u.time * 0.08;
        camPos.set(Math.sin(orbit) * 7.6, Math.sin(u.time * 0.05) * 1.6, Math.cos(orbit) * 7.6);
        camera.position.copy(camPos);
        camera.lookAt(0, 0, 0);
        camera.fov = 55 + u.beat * 9 + u.energy * 4;
        camera.updateProjectionMatrix();
      },
      dispose(): void {
        root.traverse((o) => {
          const mesh = o as THREE.Mesh;
          const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
          (mesh.geometry as THREE.BufferGeometry | undefined)?.dispose();
        });
        glowTex.dispose();
      },
    };
  },
};
