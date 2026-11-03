// ── Electric network overlay ──────────────────────────────────────────────────
// TypeScript port of PORTFOLIO- origin/main lib/vision/visualizers/electric-
// network.js (the live papagedon.com/app Vision mode). A lightning grid over
// the hex field: beat impacts surge through a node graph (shortest-path from
// the impact point) and light links, junctions and spark bolts. Only visible
// for the electric-nexus pack. Math is verbatim from the original.
import * as THREE from 'three';
import type { NanoImpact, PlatePosition } from './packs';

const MAX_SPARKS = 24;
const object = new THREE.Object3D();
const color = new THREE.Color();

type ElectricImpact = NanoImpact & { electricDistances?: Float32Array };

interface Edge {
  a: number;
  b: number;
  length: number;
  x: number;
  z: number;
  seed: number;
}

export interface ElectricNetwork {
  group: THREE.Group;
  update: (impacts: NanoImpact[], now: number, bass: number) => void;
}

export function createElectricNetwork(plates: PlatePosition[]): ElectricNetwork {
  const nodes = plates.filter((plate) => plate.row % 3 === 0 && plate.col % 3 === 0);
  const edges: Edge[] = [];
  const adjacency: number[][] = nodes.map(() => []);

  for (let a = 0; a < nodes.length; a += 1) {
    for (let b = a + 1; b < nodes.length; b += 1) {
      const length = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
      if (length < 1.9 || length > 2.85) continue;
      const edge: Edge = {
        a,
        b,
        length,
        x: (nodes[a].x + nodes[b].x) * 0.5,
        z: (nodes[a].z + nodes[b].z) * 0.5,
        seed: ((a * 37 + b * 71) % 101) / 101,
      };
      adjacency[a].push(edges.length);
      adjacency[b].push(edges.length);
      edges.push(edge);
    }
  }

  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const links = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.012, 0.022), material, edges.length);
  links.frustumCulled = false;
  edges.forEach((edge, index) => {
    const from = nodes[edge.a];
    const to = nodes[edge.b];
    object.position.set(edge.x, 0.18, edge.z);
    object.rotation.set(0, -Math.atan2(to.z - from.z, to.x - from.x), 0);
    object.scale.set(edge.length, 1, 1);
    object.updateMatrix();
    links.setMatrixAt(index, object.matrix);
  });
  links.instanceMatrix.needsUpdate = true;

  const junctions = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.105, 0.105, 0.03, 6, 1, false),
    material,
    nodes.length,
  );
  junctions.frustumCulled = false;
  nodes.forEach((node, index) => {
    object.position.set(node.x, 0.2, node.z);
    object.rotation.set(0, 0, 0);
    object.scale.setScalar(1);
    object.updateMatrix();
    junctions.setMatrixAt(index, object.matrix);
  });
  junctions.instanceMatrix.needsUpdate = true;

  const sparks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.065, 0), material, MAX_SPARKS);
  sparks.frustumCulled = false;
  sparks.count = 0;

  const group = new THREE.Group();
  group.add(links, junctions, sparks);
  group.visible = false;

  function distancesFor(impact: NanoImpact): Float32Array {
    const distances = new Float32Array(nodes.length).fill(Infinity);
    const visited = new Uint8Array(nodes.length);
    let origin = 0;
    let nearest = Infinity;
    nodes.forEach((node, index) => {
      const distance = Math.hypot(node.x - impact.x, node.z - impact.z);
      if (distance < nearest) {
        nearest = distance;
        origin = index;
      }
    });
    distances[origin] = 0;

    for (let step = 0; step < nodes.length; step += 1) {
      let current = -1;
      let best = Infinity;
      for (let index = 0; index < nodes.length; index += 1) {
        if (!visited[index] && distances[index] < best) {
          best = distances[index];
          current = index;
        }
      }
      if (current < 0) break;
      visited[current] = 1;
      for (const edgeIndex of adjacency[current]) {
        const edge = edges[edgeIndex];
        const other = edge.a === current ? edge.b : edge.a;
        const distance = best + edge.length * (0.85 + edge.seed * 0.3);
        if (distance < distances[other]) distances[other] = distance;
      }
    }
    return distances;
  }

  function surge(age: number, arrival: number, strength: number, width: number): number {
    const offset = (age - arrival) / width;
    return Math.exp(-offset * offset) * strength * Math.max(0, 1 - age / 3);
  }

  function update(impacts: NanoImpact[], now: number, bass: number): void {
    for (const impact of impacts as ElectricImpact[]) {
      if (!impact.electricDistances) impact.electricDistances = distancesFor(impact);
    }

    let sparkCount = 0;
    edges.forEach((edge, index) => {
      let charge = 0;
      let sparkProgress = 0;
      let forward = true;
      for (const impact of impacts as ElectricImpact[]) {
        const age = (now - impact.started) / 1000;
        const distances = impact.electricDistances ?? distancesFor(impact);
        const fromA = distances[edge.a] <= distances[edge.b];
        const arrival = Math.min(distances[edge.a], distances[edge.b]) / 7.4 + edge.seed * 0.12;
        const pulse = surge(age, arrival, impact.strength, 0.22);
        if (pulse > charge) {
          charge = pulse;
          sparkProgress = Math.min(1, Math.max(0, (age - arrival) * 4));
          forward = fromA;
        }
      }
      const brightness = Math.min(1, 0.065 + bass * 0.035 + charge * 0.88);
      color.setRGB(brightness * 0.9, brightness * 0.93, brightness * 0.95);
      links.setColorAt(index, color);

      if (charge > 0.32 && edge.seed > 0.35 && sparkCount < MAX_SPARKS) {
        const from = nodes[forward ? edge.a : edge.b];
        const to = nodes[forward ? edge.b : edge.a];
        object.position.set(
          from.x + (to.x - from.x) * sparkProgress,
          0.24,
          from.z + (to.z - from.z) * sparkProgress,
        );
        object.rotation.set(0, 0, 0);
        object.scale.setScalar(0.5 + charge * 1.25);
        object.updateMatrix();
        sparks.setMatrixAt(sparkCount, object.matrix);
        color.setRGB(charge, charge, charge);
        sparks.setColorAt(sparkCount, color);
        sparkCount += 1;
      }
    });

    nodes.forEach((node, index) => {
      void node;
      let charge = 0;
      for (const impact of impacts as ElectricImpact[]) {
        const age = (now - impact.started) / 1000;
        const distances = impact.electricDistances ?? distancesFor(impact);
        charge = Math.max(charge, surge(age, distances[index] / 7.4, impact.strength, 0.26));
      }
      const brightness = Math.min(1, 0.11 + charge * 0.85);
      color.setRGB(brightness * 0.9, brightness * 0.93, brightness * 0.95);
      junctions.setColorAt(index, color);
    });

    if (links.instanceColor) links.instanceColor.needsUpdate = true;
    if (junctions.instanceColor) junctions.instanceColor.needsUpdate = true;
    sparks.count = sparkCount;
    if (sparkCount) {
      sparks.instanceMatrix.needsUpdate = true;
      if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
    }
  }

  update([], performance.now(), 0);
  return { group, update };
}
