// ── Immersive 3D scenes ─────────────────────────────────────────────────────────
// TypeScript port of PORTFOLIO- origin/main lib/vision/visualizers/immersive3d.ts
// (the live papagedon.com/app Vision mode, N/G/R/L): four real Three.js scenes
// with depth, moving cameras, fog, particles and UnrealBloom. Geometry, motion
// and signal math are verbatim; palettes are fixed (no color reactivity).
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type ImmersiveId = 'neon-tunnel' | 'particle-galaxy' | 'audio-terrain' | 'light-cathedral';

export interface ImmersiveSignals {
  energy: number;
  bass: number;
  mid: number;
  treble: number;
  beat: number;
  room: number;
  crowd: number;
}

interface Built {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update: (t: number, dt: number, s: ImmersiveSignals) => void;
  bloom: number;
  dispose: () => void;
}

const NOISE = /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
`;

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
  });
}

function dustPoints(count: number, spread: THREE.Vector3, color: number, size: number): THREE.Points {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    p[i * 3] = (Math.random() - 0.5) * spread.x;
    p[i * 3 + 1] = (Math.random() - 0.5) * spread.y;
    p[i * 3 + 2] = (Math.random() - 0.5) * spread.z;
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(g, m);
}

// ── 1. Neon tunnel flythrough ────────────────────────────────────────────────
function neonTunnel(aspect: number): Built {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020008);
  scene.fog = new THREE.FogExp2(0x020008, 0.028);
  const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 200);
  const RINGS = 70;
  const GAP = 2.2;
  const ringGeo = new THREE.TorusGeometry(4, 0.06, 8, 6);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, RINGS);
  const color = new THREE.Color();
  for (let i = 0; i < RINGS; i++) rings.setColorAt(i, color.setHSL((i / RINGS) * 0.6 + 0.5, 1, 0.55));
  scene.add(rings);
  // Wall streaks: long thin boxes running along the tunnel.
  const STREAKS = 48;
  const streakGeo = new THREE.BoxGeometry(0.04, 0.04, 6);
  const streaks = new THREE.InstancedMesh(streakGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), STREAKS);
  const streakState = Array.from({ length: STREAKS }, () => ({
    a: Math.random() * Math.PI * 2,
    z: -Math.random() * RINGS * GAP,
    r: 3.2 + Math.random() * 0.6,
  }));
  for (let i = 0; i < STREAKS; i++) streaks.setColorAt(i, color.setHSL(Math.random() < 0.5 ? 0.85 : 0.52, 1, 0.6));
  scene.add(streaks);
  const dust = dustPoints(2500, new THREE.Vector3(6, 6, RINGS * GAP), 0x88ccff, 0.05);
  scene.add(dust);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  let travel = 0;
  return {
    scene,
    camera,
    bloom: 1.25,
    update(t, dt, s) {
      travel += dt * (6 + s.energy * 22 + s.room * 10 + s.beat * 8);
      const path = (z: number) => new THREE.Vector3(Math.sin(z * 0.045) * 3, Math.cos(z * 0.037) * 2, -z);
      const cp = path(travel);
      camera.position.copy(cp);
      camera.lookAt(path(travel + 6));
      camera.rotateZ(Math.sin(t * 0.3) * 0.25 + s.bass * 0.15);
      camera.fov = 75 + s.beat * 10 + s.energy * 8;
      camera.updateProjectionMatrix();
      const base = Math.floor(travel / GAP);
      for (let i = 0; i < RINGS; i++) {
        const k = base + i;
        const z = k * GAP;
        const p = path(z);
        const pulse = 1 + s.bass * 0.35 * Math.sin(k * 0.7 + t * 6) + s.beat * 0.12;
        q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), k * 0.12 + t * (0.2 + s.mid));
        m4.compose(p, q, scl.set(pulse, pulse, 1));
        rings.setMatrixAt(i, m4);
        rings.setColorAt(i, color.setHSL((k * 0.013 + t * 0.03) % 1, 1, 0.45 + s.treble * 0.35));
      }
      rings.instanceMatrix.needsUpdate = true;
      if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
      for (let i = 0; i < STREAKS; i++) {
        const st = streakState[i];
        if (-st.z < travel - 4) st.z = -(travel + RINGS * GAP * (0.6 + Math.random() * 0.4));
        const zz = -st.z;
        const p = path(zz);
        pos.set(p.x + Math.cos(st.a) * st.r, p.y + Math.sin(st.a) * st.r, p.z);
        m4.compose(pos, q.identity(), scl.set(1, 1, 0.5 + s.energy * 2));
        streaks.setMatrixAt(i, m4);
      }
      streaks.instanceMatrix.needsUpdate = true;
      dust.position.set(cp.x, cp.y, cp.z - (RINGS * GAP) / 2);
    },
    dispose() {
      disposeScene(scene);
    },
  };
}

// ── 2. Particle galaxy ───────────────────────────────────────────────────────
function particleGalaxy(aspect: number): Built {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x01010a);
  scene.fog = new THREE.FogExp2(0x01010a, 0.01);
  const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 400);
  const N = 60000;
  const ARMS = 4;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  const inner = new THREE.Color(0xffc27a);
  const outer = new THREE.Color(0x3a6bff);
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = Math.pow(Math.random(), 1.6) * 40;
    const arm = ((i % ARMS) / ARMS) * Math.PI * 2;
    const spin = r * 0.28;
    const rnd = () => Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? -1 : 1) * (1 + r * 0.12);
    pos[i * 3] = Math.cos(arm + spin) * r + rnd();
    pos[i * 3 + 1] = rnd() * 0.5;
    pos[i * 3 + 2] = Math.sin(arm + spin) * r + rnd();
    c.copy(inner).lerp(outer, r / 40);
    if (Math.random() < 0.04) c.setHSL(0.85, 1, 0.65);
    col.set([c.r, c.g, c.b], i * 3);
    seed[i] = Math.random();
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uBeat: { value: 0 },
      uTreble: { value: 0 },
      uPx: { value: Math.min(devicePixelRatio, 1.5) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uBass, uBeat, uTreble, uPx; attribute float seed; varying vec3 vC; varying float vA;
      void main(){
        vec3 p = position; float r = length(p.xz);
        float ang = uTime * (0.6 / (1.0 + r * 0.15)) ;
        float cs = cos(ang), sn = sin(ang); p.xz = mat2(cs, -sn, sn, cs) * p.xz;
        p *= 1.0 + uBeat * 0.08 * (1.0 - r / 45.0);
        p.y += sin(r * 0.5 - uTime * 2.0) * uBass * 1.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = 0.6 + 0.4 * sin(uTime * 3.0 + seed * 40.0) * (0.3 + uTreble);
        gl_PointSize = (1.4 + seed * 2.2) * tw * uPx * (60.0 / -mv.z);
        vC = color; vA = clamp(1.0 - (-mv.z) / 160.0, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, vA * pow(1.0 - d * 2.0, 1.6)); }`,
  });
  scene.add(new THREE.Points(g, mat));
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffe2b0 }));
  scene.add(core);
  const stars = dustPoints(4000, new THREE.Vector3(300, 300, 300), 0xffffff, 0.35);
  scene.add(stars);
  return {
    scene,
    camera,
    bloom: 1.1,
    update(t, dt, s) {
      mat.uniforms.uTime.value += dt * (0.25 + s.energy * 0.9 + s.room * 0.5);
      mat.uniforms.uBass.value = s.bass;
      mat.uniforms.uBeat.value = s.beat;
      mat.uniforms.uTreble.value = s.treble;
      const a = t * 0.07;
      const dist = 34 - s.room * 12 + Math.sin(t * 0.13) * 8;
      camera.position.set(Math.cos(a) * dist, 6 + Math.sin(t * 0.21) * 9, Math.sin(a) * dist);
      camera.lookAt(0, 0, 0);
      core.scale.setScalar(1 + s.bass * 0.6 + s.beat * 0.4);
      stars.rotation.y = t * 0.005;
    },
    dispose() {
      disposeScene(scene);
    },
  };
}

// ── 3. Audio-driven terrain ──────────────────────────────────────────────────
function audioTerrain(aspect: number): Built {
  const scene = new THREE.Scene();
  const FOG = new THREE.Color(0x12021c);
  scene.background = FOG;
  const camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 300);
  const geo = new THREE.PlaneGeometry(220, 220, 220, 220);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uScroll: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uBeat: { value: 0 },
      uHue: { value: 0 },
      uFog: { value: FOG },
    },
    vertexShader: /* glsl */ `
      uniform float uScroll, uBass, uMid, uBeat; varying float vH; varying vec2 vW; varying float vD;
      ${NOISE}
      void main(){
        vec3 p = position; vec2 w = vec2(p.x, p.z - uScroll); vW = w;
        float valley = smoothstep(4.0, 26.0, abs(p.x));
        float h = fbm(w * 0.045) * 18.0 * valley * (0.6 + uBass * 0.9) + fbm(w * 0.2) * (1.0 + uMid * 2.5) * valley;
        h += uBeat * 1.5 * valley * sin(length(w) * 0.3);
        p.y = h - 4.0; vH = h;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vD = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTreble, uHue, uBeat; uniform vec3 uFog; varying float vH; varying vec2 vW; varying float vD;
      vec3 hsl(float h){ return clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0); }
      void main(){
        vec2 gr = abs(fract(vW * 0.5) - 0.5) / fwidth(vW * 0.5);
        float line = 1.0 - min(min(gr.x, gr.y), 1.0);
        vec3 base = mix(vec3(0.03,0.0,0.08), hsl(uHue + 0.6) * 0.25, clamp(vH / 18.0, 0.0, 1.0));
        vec3 neon = mix(hsl(uHue), hsl(uHue + 0.2), clamp(vH / 14.0, 0.0, 1.0)) * (1.2 + uTreble * 2.0 + uBeat);
        vec3 c = base + neon * line;
        float f = 1.0 - exp(-pow(vD * 0.012, 1.6));
        gl_FragColor = vec4(mix(c, uFog, f), 1.0);
      }`,
  });
  const ground = new THREE.Mesh(geo, mat);
  scene.add(ground);
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(22, 64),
    new THREE.MeshBasicMaterial({ color: 0xff3d8b, fog: false }),
  );
  sun.position.set(0, 18, -150);
  scene.add(sun);
  const motes = dustPoints(3000, new THREE.Vector3(80, 30, 160), 0xff9ef0, 0.12);
  motes.position.set(0, 8, -60);
  scene.add(motes);
  let scroll = 0;
  return {
    scene,
    camera,
    bloom: 1.0,
    update(t, dt, s) {
      scroll += dt * (10 + s.energy * 30 + s.room * 14);
      const u = mat.uniforms;
      u.uScroll.value = scroll;
      u.uBass.value = s.bass;
      u.uMid.value = s.mid;
      u.uTreble.value = s.treble;
      u.uBeat.value = s.beat;
      u.uHue.value = (0.78 + t * 0.01 + s.room * 0.15) % 1;
      camera.position.set(Math.sin(t * 0.17) * 3, 3.5 + Math.sin(t * 0.4) * 1.2 + s.bass * 1.5, 30);
      camera.lookAt(Math.sin(t * 0.11) * 4, 4, -40);
      camera.rotateZ(Math.sin(t * 0.23) * 0.06);
      sun.scale.setScalar(1 + s.bass * 0.15 + s.beat * 0.1);
      sun.material.color.setHSL(u.uHue.value + 0.15, 1, 0.55);
      motes.position.z = -60 + ((scroll * 0.5) % 40);
    },
    dispose() {
      disposeScene(scene);
    },
  };
}

// ── 4. Volumetric light cathedral ────────────────────────────────────────────
function lightCathedral(aspect: number): Built {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040306);
  scene.fog = new THREE.FogExp2(0x040306, 0.03);
  const camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 200);
  scene.add(new THREE.AmbientLight(0x221a30, 1));
  const key = new THREE.PointLight(0xffd29a, 60, 40, 1.6);
  scene.add(key);
  const PAIRS = 16;
  const SPACING = 7;
  const colGeo = new THREE.CylinderGeometry(0.7, 0.9, 22, 12);
  const colMat = new THREE.MeshStandardMaterial({ color: 0x2a2530, roughness: 0.6, metalness: 0.2 });
  const cols = new THREE.InstancedMesh(colGeo, colMat, PAIRS * 2);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < PAIRS; i++)
    for (let side = 0; side < 2; side++) {
      m4.makeTranslation(side ? 7 : -7, 7, -i * SPACING);
      cols.setMatrixAt(i * 2 + side, m4);
    }
  scene.add(cols);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, PAIRS * SPACING + 40),
    new THREE.MeshStandardMaterial({ color: 0x111014, roughness: 0.25, metalness: 0.6 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -4, (-PAIRS * SPACING) / 2);
  scene.add(floor);
  // Light shafts: additive cones with a vertical falloff, one per bay from high windows.
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(0xffd7a0) },
      uGain: { value: 0.5 },
      uTime: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uGain, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float rim = pow(abs(dot(vN, vV)), 1.5); float fall = pow(vUv.y, 1.3);
        float dust = 0.85 + 0.15 * sin(vUv.y * 40.0 - uTime * 2.0 + vUv.x * 20.0);
        gl_FragColor = vec4(uColor * rim * fall * dust * uGain, 1.0); }`,
  });
  const shafts: THREE.Mesh[] = [];
  const shaftGeo = new THREE.ConeGeometry(3.2, 26, 24, 1, true);
  for (let i = 0; i < PAIRS; i++) {
    const s = new THREE.Mesh(shaftGeo, shaftMat);
    s.position.set(i % 2 ? 3.5 : -3.5, 8, -i * SPACING - SPACING / 2);
    s.rotation.z = i % 2 ? -0.35 : 0.35;
    scene.add(s);
    shafts.push(s);
  }
  const rose = new THREE.Mesh(
    new THREE.RingGeometry(2, 6, 48, 1),
    new THREE.MeshBasicMaterial({ color: 0xff6bd5, side: THREE.DoubleSide }),
  );
  rose.position.set(0, 12, -PAIRS * SPACING - 4);
  scene.add(rose);
  const dust = dustPoints(5000, new THREE.Vector3(14, 20, PAIRS * SPACING), 0xffe6c0, 0.06);
  dust.position.set(0, 5, (-PAIRS * SPACING) / 2);
  scene.add(dust);
  const nave = PAIRS * SPACING - 20;
  let z = 0;
  return {
    scene,
    camera,
    bloom: 0.9,
    update(t, dt, s) {
      z = (z + dt * (1.5 + s.energy * 4 + s.room * 3)) % nave;
      camera.position.set(Math.sin(t * 0.15) * 2, 1 + Math.sin(t * 0.2) * 1.5, 6 - z);
      camera.lookAt(Math.sin(t * 0.1) * 3, 6 + Math.sin(t * 0.13) * 3, -z - 20);
      key.position.set(0, 10, -z - 10);
      key.intensity = 40 + s.bass * 120 + s.beat * 60;
      shaftMat.uniforms.uTime.value = t;
      shaftMat.uniforms.uGain.value = 0.35 + s.mid * 0.6 + s.beat * 0.4 + s.room * 0.3;
      (shaftMat.uniforms.uColor.value as THREE.Color).setHSL(
        0.08 + s.room * 0.7 + Math.sin(t * 0.05) * 0.05,
        0.8,
        0.6,
      );
      shafts.forEach((sh, i) => (sh.rotation.y = Math.sin(t * 0.2 + i) * 0.2));
      rose.rotation.z = t * 0.2;
      rose.scale.setScalar(1 + s.bass * 0.3);
      dust.rotation.y = Math.sin(t * 0.05) * 0.05;
      dust.position.y = 5 + Math.sin(t * 0.3) * 0.5 + s.treble;
    },
    dispose() {
      disposeScene(scene);
    },
  };
}

const BUILDERS: Record<ImmersiveId, (aspect: number) => Built> = {
  'neon-tunnel': neonTunnel,
  'particle-galaxy': particleGalaxy,
  'audio-terrain': audioTerrain,
  'light-cathedral': lightCathedral,
};

export const IMMERSIVE_BUILDERS = BUILDERS;

export interface ImmersiveViz {
  setScene: (id: ImmersiveId) => void;
  render: (s: ImmersiveSignals) => void;
  dispose: () => void;
}

export function createImmersiveVisualizer(canvas: HTMLCanvasElement): ImmersiveViz {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 1, 0.6, 0.15);
  let built: Built | null = null;
  let current: ImmersiveId | null = null;
  let last = performance.now();
  const start = last;
  let w = 0;
  let h = 0;

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const cw = canvas.clientWidth || window.innerWidth;
    const ch = canvas.clientHeight || window.innerHeight;
    if (cw === w && ch === h) return;
    w = cw;
    h = ch;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    if (built) {
      built.camera.aspect = w / h;
      built.camera.updateProjectionMatrix();
    }
  };

  function setScene(id: ImmersiveId): void {
    if (id === current) return;
    built?.dispose();
    composer.passes.slice().forEach((p) => composer.removePass(p));
    built = BUILDERS[id]((canvas.clientWidth || 16) / (canvas.clientHeight || 9));
    current = id;
    composer.addPass(new RenderPass(built.scene, built.camera));
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    w = 0;
    resize();
  }

  function render(s: ImmersiveSignals): void {
    if (!built) return;
    resize();
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    built.update((now - start) / 1000, dt, s);
    bloom.strength = built.bloom * (0.8 + s.energy * 0.6 + s.beat * 0.4);
    composer.render(dt);
  }

  function dispose(): void {
    built?.dispose();
    bloom.dispose();
    composer.dispose();
    renderer.dispose();
  }

  return { setScene, render, dispose };
}
