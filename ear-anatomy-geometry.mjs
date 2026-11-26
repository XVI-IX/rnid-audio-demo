// Sculpted 3D Human Ear Anatomical Model for Three.js
// Designed for an open, un-caged museum-gallery 3D hero space:
//   01 pinna      — Sculpted Auricle (Helix, Antihelix Crura, Concha, Tragus, Antitragus, Lobule)
//   02 canal      — S-curved External Auditory Meatus (cutaway cartilaginous-to-bony lumen)
//   03 earplug    — Canal Protection Site (Expanding PU Foam vs 3-Flange −15 dB Musicians' Filter)
//   04 eardrum    — Oblique Conical Tympanic Membrane (Pars tensa, Umbo & Annulus)
//   05 ossicles   — Articulated Malleus, Incus & Stirrup-shaped Stapes in Oval Window + Eustachian tube
//   06 vestibular — Vestibule & 3 Orthogonal Semicircular Canals with Ampullae
//   07 cochlea    — 2.75-Turn Cutaway Snail Cochlea, Basilar Membrane & 48 Tonotopic Hair-Cell Bundles
//   08 nerve      — Braided Cochlear & Vestibular Nerve Fascicles (Cranial Nerve VIII)

export const ANATOMY_PARTS = Object.freeze([
  {
    id: 'pinna',
    index: '01',
    region: 'Outer ear',
    shortLabel: 'Pinna',
    title: 'Pinna (Auricle)',
    latin: 'Auricula · Elastic cartilage & concha bowl',
    icon: '01',
    accent: '#d96b52',
    explodeOffset: [-1.65, 0.0, 0.0],
    pinAnchor: [-4.85, 0.85, 0.35],
    pinLabelOffset: [-6.15, 1.72, 0.35],
    camTarget: [-4.55, 0.08, 0.08],
    camSpherical: { radius: 5.8, theta: -0.34, phi: 1.44 },
  },
  {
    id: 'canal',
    index: '02',
    region: 'Outer ear',
    shortLabel: 'Ear canal',
    title: 'External Auditory Canal',
    latin: 'Meatus acusticus externus · 2.5 cm S-curve',
    icon: '02',
    accent: '#2563eb',
    explodeOffset: [-0.9, 0.0, 0.0],
    pinAnchor: [-3.25, 0.42, 0.25],
    pinLabelOffset: [-3.55, 1.65, 0.25],
    camTarget: [-2.95, 0.06, 0.05],
    camSpherical: { radius: 5.1, theta: -0.12, phi: 1.4 },
  },
  {
    id: 'earplug',
    index: '03',
    region: 'Protection site',
    shortLabel: 'Earplug seal',
    title: 'Canal Protection Zone',
    latin: 'Outer cartilaginous seal · Foam vs −15 dB filter',
    icon: '03',
    accent: '#0d9488',
    explodeOffset: [-0.65, -0.18, 0.22],
    pinAnchor: [-2.88, -0.32, 0.28],
    pinLabelOffset: [-3.35, -1.55, 0.3],
    camTarget: [-2.85, 0.02, 0.08],
    camSpherical: { radius: 4.4, theta: -0.18, phi: 1.45 },
  },
  {
    id: 'eardrum',
    index: '04',
    region: 'Middle ear',
    shortLabel: 'Eardrum',
    title: 'Tympanic Membrane',
    latin: 'Membrana tympani · Oblique conical umbo',
    icon: '04',
    accent: '#ca8a04',
    explodeOffset: [-0.15, 0.0, 0.0],
    pinAnchor: [-1.28, -0.44, 0.22],
    pinLabelOffset: [-1.45, -1.62, 0.25],
    camTarget: [-1.28, 0.04, 0.0],
    camSpherical: { radius: 4.2, theta: -0.26, phi: 1.42 },
  },
  {
    id: 'ossicles',
    index: '05',
    region: 'Middle ear',
    shortLabel: 'Ossicles',
    title: 'Malleus, Incus & Stapes',
    latin: 'Ossicula auditus · Three-bone mechanical lever',
    icon: '05',
    accent: '#4f4cad',
    explodeOffset: [0.38, 0.14, 0.0],
    pinAnchor: [-0.68, 0.66, 0.12],
    pinLabelOffset: [-0.85, 1.78, 0.15],
    camTarget: [-0.68, 0.26, 0.0],
    camSpherical: { radius: 4.1, theta: 0.06, phi: 1.34 },
  },
  {
    id: 'vestibular',
    index: '06',
    region: 'Inner ear',
    shortLabel: 'Balance canals',
    title: 'Vestibule & Semicircular Canals',
    latin: 'Labyrinthus vestibularis · Three orthogonal loops',
    icon: '06',
    accent: '#7c3aed',
    explodeOffset: [0.92, 0.36, -0.15],
    pinAnchor: [0.46, 1.48, -0.08],
    pinLabelOffset: [1.05, 2.05, -0.08],
    camTarget: [0.45, 0.82, -0.05],
    camSpherical: { radius: 4.9, theta: 0.15, phi: 1.26 },
  },
  {
    id: 'cochlea',
    index: '07',
    region: 'Inner ear',
    shortLabel: 'Cochlea',
    title: 'Cochlea & Hair Cells',
    latin: 'Organ of Corti · Tonotopic spiral (high base → bass tip)',
    icon: '07',
    accent: '#059669',
    explodeOffset: [1.45, -0.08, 0.14],
    pinAnchor: [1.55, -0.82, 0.48],
    pinLabelOffset: [1.85, -1.68, 0.45],
    camTarget: [1.48, -0.02, 0.16],
    camSpherical: { radius: 4.5, theta: 0.14, phi: 1.4 },
  },
  {
    id: 'nerve',
    index: '08',
    region: 'Neural pathway',
    shortLabel: 'Auditory nerve',
    title: 'Vestibulocochlear Nerve',
    latin: 'Cranial Nerve VIII · Cochlear & vestibular fibres',
    icon: '08',
    accent: '#d97706',
    explodeOffset: [2.25, 0.12, 0.0],
    pinAnchor: [3.45, 0.56, 0.12],
    pinLabelOffset: [3.95, 1.48, 0.15],
    camTarget: [3.15, 0.3, 0.05],
    camSpherical: { radius: 5.2, theta: 0.18, phi: 1.4 },
  },
]);

export const ANATOMY_PART_BY_ID = Object.freeze(
  Object.fromEntries(ANATOMY_PARTS.map((part) => [part.id, part])),
);

export function normalisePartId(partId = 'cochlea') {
  const clean = String(partId || 'cochlea').toLowerCase().trim();
  if (clean === 'middle') return 'ossicles';
  if (clean === 'hair_cells') return 'cochlea';
  return ANATOMY_PART_BY_ID[clean] ? clean : 'cochlea';
}

export function tagAnatomyHierarchy(object3D, partId, extraUserData = {}) {
  object3D.userData = { ...object3D.userData, anatomyPart: partId, ...extraUserData };
  object3D.traverse?.((child) => {
    child.userData = { ...child.userData, anatomyPart: partId, ...extraUserData };
  });
  return object3D;
}

function buildVariableTubeGeometry(THREE, curve, tubularSegments, radialSegments, radiusFn, arcAngle = Math.PI * 2, arcOffset = 0) {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i += 1) {
    const u = i / tubularSegments;
    const p = curve.getPointAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const r = radiusFn(u);

    for (let j = 0; j <= radialSegments; j += 1) {
      const v = arcOffset + (j / radialSegments) * arcAngle;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);

      normal.x = cos * N.x + sin * B.x;
      normal.y = cos * N.y + sin * B.y;
      normal.z = cos * N.z + sin * B.z;
      normal.normalize();

      vertex.x = p.x + r * normal.x;
      vertex.y = p.y + r * normal.y;
      vertex.z = p.z + r * normal.z;

      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(u, j / radialSegments);
    }
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < tubularSegments; i += 1) {
    for (let j = 0; j < radialSegments; j += 1) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

export function createStudioEnvironmentTexture(THREE, renderer, isDark = false) {
  if (!renderer || typeof THREE.PMREMGenerator !== 'function') return null;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(isDark ? 0x0c0f1d : 0xeef0f9);

    const panelGeo = new THREE.SphereGeometry(1.1, 14, 12);
    const addGlowPanel = (color, intensity, pos, scale) => {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
      });
      const m = new THREE.Mesh(panelGeo, mat);
      m.position.set(...pos);
      m.scale.set(...scale);
      envScene.add(m);
    };

    if (isDark) {
      addGlowPanel(0xfff4e6, 2.6, [4, 8, 6], [4.8, 1.6, 4.0]);
      addGlowPanel(0x60a5fa, 2.0, [-7, 2.5, 5], [2.4, 4.2, 3.0]);
      addGlowPanel(0xfda4af, 1.6, [-5, -2.5, 4], [2.8, 2.2, 2.5]);
      addGlowPanel(0xa78bfa, 1.7, [6, 3, -5], [3.5, 3.2, 2.0]);
    } else {
      addGlowPanel(0xffffff, 2.4, [4, 9, 6], [5.5, 1.8, 4.5]);
      addGlowPanel(0xfff1e6, 1.7, [-6, 3, 5], [3.0, 4.0, 3.0]);
      addGlowPanel(0xdbeafe, 1.5, [6, 2, -5], [4.0, 3.5, 2.0]);
      addGlowPanel(0xf3e8ff, 1.2, [0, -6, 2], [6.0, 1.2, 5.0]);
    }

    const rt = pmrem.fromScene(envScene, 0.04);
    pmrem.dispose();
    return rt.texture;
  } catch {
    return null;
  }
}

export function buildSpatialLabFloor(THREE) {
  const floorGroup = new THREE.Group();
  floorGroup.position.set(-0.2, -2.18, 0);

  // Soft gallery contact shadow beneath the floating anatomical sculpture
  let shadowTex = null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext?.('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 64, 8, 128, 64, 118);
      grad.addColorStop(0, 'rgba(30, 33, 64, 0.20)');
      grad.addColorStop(0.55, 'rgba(30, 33, 64, 0.08)');
      grad.addColorStop(1, 'rgba(30, 33, 64, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 128);
      shadowTex = new THREE.CanvasTexture(c);
    }
  }

  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    color: shadowTex ? 0xffffff : 0xcbd5e1,
    transparent: true,
    opacity: shadowTex ? 1 : 0.14,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 5.4), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  floorGroup.add(shadowPlane);

  // Minimal architectural hair-line acoustic axis ring
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  });
  const subtleRing = new THREE.Mesh(new THREE.RingGeometry(5.18, 5.21, 96), ringMat);
  subtleRing.rotation.x = -Math.PI / 2;
  subtleRing.position.y = 0.01;
  floorGroup.add(subtleRing);

  return floorGroup;
}

export function tonotopicFrequencyForSlot(u = 0.5) {
  // Greenwood-inspired cochlear map from ~9,000 Hz at basal entrance (u=0) to ~150 Hz at helicotrema apex (u=1)
  const clamped = Math.max(0, Math.min(1, Number(u) || 0));
  return Math.round(140 * Math.pow(64, 1 - clamped));
}

export function buildHumanEarAnatomy(THREE) {
  const rootGroup = new THREE.Group();
  const partGroups = {};
  const partBasePositions = {};
  const xrayMaterials = [];
  const highlightMeshesByPart = {};

  function registerPart(id, group, primaryMeshes = []) {
    tagAnatomyHierarchy(group, id);
    partGroups[id] = group;
    partBasePositions[id] = group.position.clone();
    highlightMeshesByPart[id] = primaryMeshes;
    rootGroup.add(group);
  }

  // =========================================================================
  // 01. OUTER EAR: SCULPTED HUMAN PINNA (AURICLE) + TEMPORAL BONE CUTAWAY
  // =========================================================================
  const pinnaGroup = new THREE.Group();
  pinnaGroup.position.set(-4.72, 0.04, 0.08);

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8a594,
    emissive: 0x5c241c,
    emissiveIntensity: 0.08,
    roughness: 0.48,
    metalness: 0.01,
    clearcoat: 0.14,
    clearcoatRoughness: 0.52,
    side: THREE.DoubleSide,
  });

  const radSteps = 34;
  const angSteps = 72;
  const pinnaPos = [];
  const pinnaColors = [];
  const pinnaIdx = [];
  const colTmp = new THREE.Color();

  for (let ir = 0; ir <= radSteps; ir += 1) {
    const rNorm = ir / radSteps;
    for (let ia = 0; ia <= angSteps; ia += 1) {
      const theta = (ia / angSteps) * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      const topStretch = sinT > 0 ? 1.62 : 1.42;
      const anteriorIndent = cosT > 0.18 ? 0.7 - 0.15 * Math.exp(-((sinT - 0.04) ** 2) / 0.16) : 1.03;
      const lobePlump = sinT < -0.52 ? 0.9 + 0.14 * Math.abs(sinT) : 1.0;

      const localY = sinT * topStretch * rNorm * lobePlump;
      const localZ = -cosT * 0.96 * rNorm * anteriorIndent;

      // Deep concha cavum funnel + antihelix fold + triangular fossa + scapha + curled helix margin
      const conchaFunnel = -0.72 * Math.exp(-(rNorm * rNorm) / 0.09);
      const antihelixMask = cosT < 0.38 ? 1 : 0.18;
      const antihelixRidge = 0.2 * antihelixMask * Math.exp(-((rNorm - 0.58) ** 2) / 0.016);
      const fossaDip = sinT > 0.45 && cosT > -0.2 ? -0.1 * Math.exp(-((rNorm - 0.72) ** 2) / 0.014) : 0;
      const scaphaGroove = -0.1 * Math.exp(-((rNorm - 0.81) ** 2) / 0.011) * (sinT > -0.45 ? 1 : 0.1);
      const helixCurl = 0.26 * Math.exp(-((rNorm - 0.96) ** 2) / 0.008) * (sinT > -0.55 ? 1 : 0.38);
      const localX = conchaFunnel + antihelixRidge + fossaDip + scaphaGroove + helixCurl - 0.12 * rNorm;

      pinnaPos.push(localX, localY, localZ);

      const shade = Math.max(0, Math.min(1, 0.52 + localX * 0.6));
      colTmp.setRGB(0.86 + shade * 0.1, 0.54 + shade * 0.17, 0.47 + shade * 0.16);
      pinnaColors.push(colTmp.r, colTmp.g, colTmp.b);
    }
  }

  const pStride = angSteps + 1;
  for (let ir = 2; ir < radSteps; ir += 1) {
    for (let ia = 0; ia < angSteps; ia += 1) {
      const a = ir * pStride + ia;
      const b = (ir + 1) * pStride + ia;
      const c = (ir + 1) * pStride + (ia + 1);
      const d = ir * pStride + (ia + 1);
      pinnaIdx.push(a, b, d, b, c, d);
    }
  }

  const pinnaBowlGeo = new THREE.BufferGeometry();
  pinnaBowlGeo.setIndex(pinnaIdx);
  pinnaBowlGeo.setAttribute('position', new THREE.Float32BufferAttribute(pinnaPos, 3));
  pinnaBowlGeo.setAttribute('color', new THREE.Float32BufferAttribute(pinnaColors, 3));
  pinnaBowlGeo.computeVertexNormals();

  const pinnaVertexMat = skinMat.clone();
  pinnaVertexMat.vertexColors = true;
  const pinnaBowlMesh = new THREE.Mesh(pinnaBowlGeo, pinnaVertexMat);
  pinnaBowlMesh.rotation.y = 0.22;
  pinnaGroup.add(pinnaBowlMesh);

  const helixCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.24, 0.12, -0.1),
    new THREE.Vector3(-0.02, 0.58, -0.58),
    new THREE.Vector3(0.09, 1.4, -0.45),
    new THREE.Vector3(0.13, 1.66, 0.16),
    new THREE.Vector3(0.07, 1.16, 0.88),
    new THREE.Vector3(-0.02, 0.24, 0.98),
    new THREE.Vector3(-0.08, -0.68, 0.74),
    new THREE.Vector3(-0.12, -1.36, 0.18),
    new THREE.Vector3(-0.14, -1.2, -0.34),
  ]);
  const helixMesh = new THREE.Mesh(
    buildVariableTubeGeometry(
      THREE,
      helixCurve,
      80,
      18,
      (u) => (u > 0.75 ? 0.19 + 0.085 * Math.sin(((u - 0.75) / 0.25) * Math.PI) : 0.12 + 0.036 * Math.sin(u * Math.PI)),
    ),
    skinMat,
  );
  helixMesh.rotation.y = 0.22;
  pinnaGroup.add(helixMesh);

  // Antihelix stem + Superior & Inferior Crura Y-fork
  const antihelixCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.06, -0.54, 0.34),
    new THREE.Vector3(0.03, 0.18, 0.48),
    new THREE.Vector3(0.05, 0.8, 0.3),
    new THREE.Vector3(0.03, 1.16, -0.08),
  ]);
  const antihelixInfCrus = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.04, 0.68, 0.34),
    new THREE.Vector3(0.02, 0.86, -0.02),
    new THREE.Vector3(-0.04, 0.78, -0.34),
  ]);
  const antihelixMesh = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, antihelixCurve, 38, 12, (u) => 0.098 * (1 - 0.25 * u)),
    skinMat,
  );
  const infCrusMesh = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, antihelixInfCrus, 22, 10, (u) => 0.072 * (1 - 0.2 * u)),
    skinMat,
  );
  antihelixMesh.rotation.y = 0.22;
  infCrusMesh.rotation.y = 0.22;
  pinnaGroup.add(antihelixMesh, infCrusMesh);

  // Tragus + Antitragus flanking the intertragal notch
  const tragusGeo = new THREE.SphereGeometry(0.24, 20, 16);
  tragusGeo.scale(0.6, 1.08, 0.8);
  const tragusMesh = new THREE.Mesh(tragusGeo, skinMat);
  tragusMesh.position.set(-0.07, -0.06, -0.52);

  const antitragusGeo = new THREE.SphereGeometry(0.19, 18, 14);
  antitragusGeo.scale(0.65, 0.85, 0.95);
  const antitragusMesh = new THREE.Mesh(antitragusGeo, skinMat);
  antitragusMesh.position.set(-0.09, -0.56, 0.12);
  pinnaGroup.add(tragusMesh, antitragusMesh);

  // Sculpted rounded Temporal Bone cross-section arch (subtle warm alabaster)
  const temporalBoneMat = new THREE.MeshPhysicalMaterial({
    color: 0xe7dfd3,
    roughness: 0.68,
    metalness: 0.01,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  temporalBoneMat.userData = { baseOpacity: 0.34 };
  xrayMaterials.push(temporalBoneMat);

  const supBoneCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.45, 0.92, -0.24),
    new THREE.Vector3(1.85, 1.08, -0.26),
    new THREE.Vector3(3.45, 0.96, -0.24),
  ]);
  const infBoneCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.45, -0.86, -0.24),
    new THREE.Vector3(1.85, -0.98, -0.26),
    new THREE.Vector3(3.35, -0.88, -0.24),
  ]);
  const temporalSuperior = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, supBoneCurve, 28, 14, (u) => 0.32 - 0.06 * u),
    temporalBoneMat,
  );
  const temporalInferior = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, infBoneCurve, 28, 14, (u) => 0.34 - 0.07 * u),
    temporalBoneMat,
  );
  pinnaGroup.add(temporalSuperior, temporalInferior);

  registerPart('pinna', pinnaGroup, [pinnaBowlMesh, helixMesh, antihelixMesh, infCrusMesh, tragusMesh, antitragusMesh]);

  // =========================================================================
  // 02. EXTERNAL AUDITORY CANAL (S-CURVED CUTAWAY LUMEN)
  // =========================================================================
  const canalGroup = new THREE.Group();
  const canalCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.68, 0.02, 0.06),
    new THREE.Vector3(-3.75, 0.16, 0.12),
    new THREE.Vector3(-2.55, 0.11, -0.04),
    new THREE.Vector3(-1.32, 0.02, 0.0),
  ]);

  const canalRadiusFn = (u) => {
    const flare = 0.12 * Math.exp(-(u * u) / 0.04);
    const isthmusDip = -0.075 * Math.exp(-((u - 0.64) ** 2) / 0.035);
    return 0.47 + flare + isthmusDip;
  };

  const canalBackMat = new THREE.MeshPhysicalMaterial({
    color: 0xd98a7c,
    emissive: 0x451a1a,
    emissiveIntensity: 0.08,
    roughness: 0.4,
    metalness: 0.02,
    transparent: true,
    opacity: 0.84,
    side: THREE.DoubleSide,
  });
  canalBackMat.userData = { baseOpacity: 0.84 };
  xrayMaterials.push(canalBackMat);

  const canalBackMesh = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, canalCurve, 56, 22, canalRadiusFn, Math.PI * 1.24, Math.PI * 0.38),
    canalBackMat,
  );

  const canalGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbfdbfe,
    roughness: 0.1,
    clearcoat: 0.9,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  canalGlassMat.userData = { baseOpacity: 0.16 };
  xrayMaterials.push(canalGlassMat);

  const canalFrontMesh = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, canalCurve, 56, 14, canalRadiusFn, Math.PI * 0.76, -Math.PI * 0.38),
    canalGlassMat,
  );

  canalGroup.add(canalBackMesh, canalFrontMesh);
  registerPart('canal', canalGroup, [canalBackMesh]);

  // =========================================================================
  // 03. EARPLUG PROTECTION SITE (FOAM + MUSICIANS' −15 dB + SUBTLE RING)
  // =========================================================================
  const earplugGroup = new THREE.Group();

  const plugSlotMat = new THREE.MeshBasicMaterial({
    color: 0x0d9488,
    transparent: true,
    opacity: 0.34,
  });
  const plugSlotRing = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.02, 12, 40), plugSlotMat);
  plugSlotRing.rotation.y = Math.PI / 2;
  plugSlotRing.position.set(-2.95, 0.13, 0.04);
  earplugGroup.add(plugSlotRing);

  const foamPlugGroup = new THREE.Group();
  const foamMat = new THREE.MeshPhysicalMaterial({
    color: 0xeab308,
    emissive: 0x713f12,
    emissiveIntensity: 0.14,
    roughness: 0.88,
  });
  const foamBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.18, 28), foamMat);
  foamBody.rotation.z = Math.PI / 2;
  const foamNose = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), foamMat);
  foamNose.scale.set(0.75, 1, 1);
  foamNose.position.x = 0.58;
  foamPlugGroup.add(foamBody, foamNose);
  foamPlugGroup.position.set(-6.4, 0.13, 0.04);
  foamPlugGroup.visible = false;
  earplugGroup.add(foamPlugGroup);

  const musicianPlugGroup = new THREE.Group();
  const siliconeMat = new THREE.MeshPhysicalMaterial({
    color: 0x14b8a6,
    emissive: 0x115e59,
    emissiveIntensity: 0.18,
    roughness: 0.15,
    clearcoat: 0.7,
    transparent: true,
    opacity: 0.78,
  });
  for (let f = 0; f < 3; f += 1) {
    const flangeGeo = new THREE.SphereGeometry(0.45 - f * 0.055, 24, 16);
    flangeGeo.scale(0.48, 1, 1);
    const flange = new THREE.Mesh(flangeGeo, siliconeMat);
    flange.position.x = f * 0.34 - 0.28;
    musicianPlugGroup.add(flange);
  }
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x0284c7,
    emissiveIntensity: 0.28,
    metalness: 0.85,
    roughness: 0.18,
  });
  const filterStem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.48, 20), coreMat);
  filterStem.rotation.z = Math.PI / 2;
  const filterCap = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.038, 10, 24), coreMat);
  filterCap.rotation.y = Math.PI / 2;
  filterCap.position.x = -0.74;
  musicianPlugGroup.add(filterStem, filterCap);
  musicianPlugGroup.position.set(-6.4, 0.13, 0.04);
  musicianPlugGroup.visible = false;
  earplugGroup.add(musicianPlugGroup);

  registerPart('earplug', earplugGroup, [foamBody, foamNose, filterStem, plugSlotRing]);

  // =========================================================================
  // 04. TYMPANIC MEMBRANE (CONICAL OBLIQUE EARDRUM + UMBO + ANNULUS)
  // =========================================================================
  const eardrumGroup = new THREE.Group();
  eardrumGroup.position.set(-1.28, 0.03, 0.0);
  eardrumGroup.rotation.z = 0.28;
  eardrumGroup.rotation.y = 0.12;

  const drumRings = 16;
  const drumSegs = 40;
  const drumPos = [];
  const drumIdx = [];
  for (let ir = 0; ir <= drumRings; ir += 1) {
    const rFrac = ir / drumRings;
    const rad = rFrac * 0.49;
    const umboPull = 0.17 * Math.pow(1 - rFrac, 1.35);
    for (let is = 0; is <= drumSegs; is += 1) {
      const a = (is / drumSegs) * Math.PI * 2;
      const radialFiber = 0.006 * Math.sin(a * 18) * rFrac;
      drumPos.push(umboPull + radialFiber, Math.sin(a) * rad * 1.08, Math.cos(a) * rad * 0.96);
    }
  }
  const dStride = drumSegs + 1;
  for (let ir = 0; ir < drumRings; ir += 1) {
    for (let is = 0; is < drumSegs; is += 1) {
      const a = ir * dStride + is;
      const b = (ir + 1) * dStride + is;
      const c = (ir + 1) * dStride + (is + 1);
      const d = ir * dStride + (is + 1);
      drumIdx.push(a, b, d, b, c, d);
    }
  }
  const drumConeGeo = new THREE.BufferGeometry();
  drumConeGeo.setIndex(drumIdx);
  drumConeGeo.setAttribute('position', new THREE.Float32BufferAttribute(drumPos, 3));
  drumConeGeo.computeVertexNormals();

  const eardrumMat = new THREE.MeshPhysicalMaterial({
    color: 0xfde68a,
    emissive: 0x92400e,
    emissiveIntensity: 0.12,
    roughness: 0.22,
    clearcoat: 0.85,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  const eardrumMesh = new THREE.Mesh(drumConeGeo, eardrumMat);

  const annulusMat = new THREE.MeshStandardMaterial({
    color: 0xf5ebe0,
    roughness: 0.42,
    metalness: 0.05,
  });
  const annulusRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.036, 12, 40), annulusMat);
  annulusRing.rotation.y = Math.PI / 2;
  annulusRing.scale.set(1, 1.08, 0.96);

  eardrumGroup.add(eardrumMesh, annulusRing);
  registerPart('eardrum', eardrumGroup, [eardrumMesh, annulusRing]);

  // =========================================================================
  // 05. MIDDLE-EAR OSSICLES (MALLEUS, INCUS & STAPES) + EUSTACHIAN TUBE
  // =========================================================================
  const ossiclesGroup = new THREE.Group();
  const boneMat = new THREE.MeshPhysicalMaterial({
    color: 0xfaf7f2,
    emissive: 0x475569,
    emissiveIntensity: 0.08,
    roughness: 0.34,
    metalness: 0.04,
    clearcoat: 0.38,
  });

  const ossicleChain = new THREE.Group();
  ossicleChain.position.set(-0.92, 0.42, 0.0);

  const malleusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.21, -0.38, 0.0),
    new THREE.Vector3(-0.26, -0.14, 0.02),
    new THREE.Vector3(-0.14, 0.08, 0.01),
    new THREE.Vector3(-0.04, 0.28, 0.0),
  ]);
  const malleusShaft = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, malleusCurve, 28, 14, (u) => (u > 0.72 ? 0.085 + (u - 0.72) * 0.28 : 0.052 + u * 0.02)),
    boneMat,
  );
  const malleusHead = new THREE.Mesh(new THREE.SphereGeometry(0.155, 20, 16), boneMat);
  malleusHead.scale.set(0.92, 1.15, 0.88);
  malleusHead.position.set(-0.03, 0.32, 0.0);
  ossicleChain.add(malleusShaft, malleusHead);

  const incusBody = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), boneMat);
  incusBody.scale.set(1.05, 1.0, 0.88);
  incusBody.position.set(0.14, 0.3, -0.02);

  const incusShortCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.16, 0.32, -0.02),
    new THREE.Vector3(0.28, 0.38, -0.22),
  ]);
  const incusShortCrus = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, incusShortCurve, 14, 10, (u) => 0.085 * (1 - 0.58 * u)),
    boneMat,
  );

  const incusLongCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.15, 0.26, -0.01),
    new THREE.Vector3(0.2, -0.08, 0.02),
    new THREE.Vector3(0.24, -0.28, 0.02),
    new THREE.Vector3(0.35, -0.3, 0.01),
  ]);
  const incusLongCrus = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, incusLongCurve, 26, 12, (u) => (u > 0.88 ? 0.058 : 0.072 * (1 - 0.35 * u))),
    boneMat,
  );
  ossicleChain.add(incusBody, incusShortCrus, incusLongCrus);

  const stapesGroup = new THREE.Group();
  stapesGroup.position.set(0.38, -0.3, 0.01);

  const stapesHead = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.07, 14), boneMat);
  stapesHead.rotation.z = Math.PI / 2;

  const antCrusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, 0, 0.02),
    new THREE.Vector3(0.22, 0.08, 0.11),
    new THREE.Vector3(0.44, 0.05, 0.07),
  ]);
  const postCrusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, 0, -0.02),
    new THREE.Vector3(0.22, -0.07, -0.11),
    new THREE.Vector3(0.44, -0.05, -0.07),
  ]);
  const stapesAntCrus = new THREE.Mesh(buildVariableTubeGeometry(THREE, antCrusCurve, 18, 10, () => 0.028), boneMat);
  const stapesPostCrus = new THREE.Mesh(buildVariableTubeGeometry(THREE, postCrusCurve, 18, 10, () => 0.028), boneMat);

  const footplateGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 22);
  footplateGeo.rotateZ(Math.PI / 2);
  footplateGeo.scale(1, 0.72, 1.15);
  const stapesFootplate = new THREE.Mesh(footplateGeo, boneMat);
  stapesFootplate.position.set(0.46, 0, 0);

  const ovalWindowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.022, 10, 26),
    new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.65 }),
  );
  ovalWindowRing.rotation.y = Math.PI / 2;
  ovalWindowRing.scale.set(1, 0.75, 1.16);
  ovalWindowRing.position.set(0.47, 0, 0);

  stapesGroup.add(stapesHead, stapesAntCrus, stapesPostCrus, stapesFootplate, ovalWindowRing);
  ossicleChain.add(stapesGroup);
  ossiclesGroup.add(ossicleChain);

  const eustachianCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.78, -0.38, -0.08),
    new THREE.Vector3(-0.42, -1.05, -0.12),
    new THREE.Vector3(0.12, -1.72, -0.18),
  ]);
  const eustachianMat = new THREE.MeshPhysicalMaterial({
    color: 0xdf9a8c,
    roughness: 0.45,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });
  eustachianMat.userData = { baseOpacity: 0.42 };
  xrayMaterials.push(eustachianMat);
  const eustachianMesh = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, eustachianCurve, 24, 14, (u) => 0.16 * (1 - 0.35 * u)),
    eustachianMat,
  );
  ossiclesGroup.add(eustachianMesh);

  registerPart('ossicles', ossiclesGroup, [malleusShaft, malleusHead, incusBody, incusLongCrus, stapesAntCrus, stapesPostCrus, stapesFootplate]);

  // =========================================================================
  // 06. VESTIBULE & 3 ORTHOGONAL SEMICIRCULAR CANALS
  // =========================================================================
  const vestibularGroup = new THREE.Group();
  const labyrinthMat = new THREE.MeshPhysicalMaterial({
    color: 0xa78bfa,
    emissive: 0x4c1d95,
    emissiveIntensity: 0.14,
    roughness: 0.24,
    clearcoat: 0.7,
    transparent: true,
    opacity: 0.82,
  });
  labyrinthMat.userData = { baseOpacity: 0.82 };
  xrayMaterials.push(labyrinthMat);

  const vestibuleBulb = new THREE.Mesh(new THREE.SphereGeometry(0.44, 24, 20), labyrinthMat);
  vestibuleBulb.scale.set(1.12, 0.96, 0.92);
  vestibuleBulb.position.set(0.32, 0.22, -0.02);
  vestibularGroup.add(vestibuleBulb);

  const supCanalCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.16, 0.52, 0.14),
    new THREE.Vector3(-0.08, 1.38, 0.32),
    new THREE.Vector3(0.45, 1.78, 0.04),
    new THREE.Vector3(0.78, 1.22, -0.22),
    new THREE.Vector3(0.56, 0.52, -0.14),
  ]);
  const postCanalCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.56, 0.52, -0.14),
    new THREE.Vector3(0.92, 1.24, -0.58),
    new THREE.Vector3(0.68, 0.78, -1.08),
    new THREE.Vector3(0.35, 0.18, -0.78),
    new THREE.Vector3(0.28, 0.16, -0.32),
  ]);
  const latCanalCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.08, 0.36, 0.22),
    new THREE.Vector3(-0.22, 0.48, -0.45),
    new THREE.Vector3(0.22, 0.46, -0.88),
    new THREE.Vector3(0.54, 0.32, -0.34),
  ]);

  const canalTubeRadius = (u) => 0.095 + 0.065 * Math.exp(-(u * u) / 0.018);
  const supCanalMesh = new THREE.Mesh(buildVariableTubeGeometry(THREE, supCanalCurve, 38, 14, canalTubeRadius), labyrinthMat);
  const postCanalMesh = new THREE.Mesh(buildVariableTubeGeometry(THREE, postCanalCurve, 38, 14, canalTubeRadius), labyrinthMat);
  const latCanalMesh = new THREE.Mesh(buildVariableTubeGeometry(THREE, latCanalCurve, 34, 14, canalTubeRadius), labyrinthMat);

  vestibularGroup.add(supCanalMesh, postCanalMesh, latCanalMesh);
  registerPart('vestibular', vestibularGroup, [vestibuleBulb, supCanalMesh, postCanalMesh, latCanalMesh]);

  // =========================================================================
  // 07. COCHLEA (2.75-TURN SNAIL SHELL + CUTAWAY BASILAR MEMBRANE + 48 TONOTOPIC BUNDLES)
  // =========================================================================
  const cochleaGroup = new THREE.Group();
  cochleaGroup.position.set(1.52, -0.08, 0.14);

  const spiralPts = [];
  const numSpiralPts = 150;
  for (let i = 0; i <= numSpiralPts; i += 1) {
    const u = i / numSpiralPts;
    const angle = Math.PI * 0.92 + u * Math.PI * 5.45;
    const rad = 1.24 * Math.pow(1 - 0.8 * u, 1.08);
    const z = u * 1.12 - 0.22;
    spiralPts.push(new THREE.Vector3(Math.cos(angle) * rad, Math.sin(angle) * rad, z));
  }
  const cochleaCurve = new THREE.CatmullRomCurve3(spiralPts);
  const shellRadiusFn = (u) => 0.34 * (1 - 0.66 * u);

  const cochleaShellMat = new THREE.MeshPhysicalMaterial({
    color: 0x6366f1,
    emissive: 0x312e81,
    emissiveIntensity: 0.16,
    roughness: 0.22,
    clearcoat: 0.85,
    transparent: true,
    opacity: 0.66,
    side: THREE.DoubleSide,
  });
  cochleaShellMat.userData = { baseOpacity: 0.66 };
  xrayMaterials.push(cochleaShellMat);

  const cochleaBackShell = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, cochleaCurve, 130, 20, shellRadiusFn, Math.PI * 1.32, Math.PI * 0.34),
    cochleaShellMat,
  );

  const cochleaGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe0e7ff,
    roughness: 0.08,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  cochleaGlassMat.userData = { baseOpacity: 0.18 };
  xrayMaterials.push(cochleaGlassMat);

  const cochleaFrontWindow = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, cochleaCurve, 130, 12, shellRadiusFn, Math.PI * 0.68, -Math.PI * 0.34),
    cochleaGlassMat,
  );

  const basilarMat = new THREE.MeshStandardMaterial({
    color: 0x0d9488,
    emissive: 0x115e59,
    emissiveIntensity: 0.32,
    roughness: 0.28,
  });
  const basilarMesh = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, cochleaCurve, 120, 8, (u) => 0.048 + 0.038 * u),
    basilarMat,
  );
  cochleaGroup.add(cochleaBackShell, cochleaFrontWindow, basilarMesh);

  const roundWindow = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 20),
    new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.68, side: THREE.DoubleSide }),
  );
  roundWindow.position.set(-1.12, -0.24, -0.18);
  roundWindow.rotation.y = -0.5;
  cochleaGroup.add(roundWindow);

  const hairCells = [];
  const ciliumGeo = new THREE.CylinderGeometry(0.019, 0.027, 0.29, 7);
  ciliumGeo.translate(0, 0.145, 0);

  for (let h = 0; h < 48; h += 1) {
    const u = (h + 0.5) / 48;
    const hz = tonotopicFrequencyForSlot(u);
    const pt = cochleaCurve.getPointAt(u);
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.55,
      roughness: 0.22,
    });

    const bundle = new THREE.Group();
    const centerCil = new THREE.Mesh(ciliumGeo, hairMat);
    const leftCil = new THREE.Mesh(ciliumGeo, hairMat);
    leftCil.position.set(-0.032, 0, 0.022);
    leftCil.scale.set(0.88, 0.82, 0.88);
    const rightCil = new THREE.Mesh(ciliumGeo, hairMat);
    rightCil.position.set(0.032, 0, 0.022);
    rightCil.scale.set(0.88, 0.82, 0.88);
    bundle.add(centerCil, leftCil, rightCil);

    bundle.position.copy(pt);
    const outward = new THREE.Vector3(pt.x * 0.45, pt.y * 0.45, 0.88).normalize();
    bundle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward);
    bundle.userData = {
      u,
      hairSlot: h,
      tonotopicHz: hz,
      rippleBoost: 0,
      material: hairMat,
      baseQuat: bundle.quaternion.clone(),
    };

    cochleaGroup.add(bundle);
    hairCells.push(bundle);
  }

  registerPart('cochlea', cochleaGroup, [cochleaBackShell, basilarMesh]);
  // Preserve per-bundle tonotopic metadata on child cilium meshes for strum raycasting!
  for (const bundle of hairCells) {
    for (const child of bundle.children) {
      child.userData.hairSlot = bundle.userData.hairSlot;
      child.userData.tonotopicHz = bundle.userData.tonotopicHz;
      child.userData.hairU = bundle.userData.u;
    }
  }

  // =========================================================================
  // 08. VESTIBULOCOCHLEAR NERVE (CN VIII)
  // =========================================================================
  const nerveGroup = new THREE.Group();
  const nerveMat = new THREE.MeshPhysicalMaterial({
    color: 0xf5c96b,
    emissive: 0x92400e,
    emissiveIntensity: 0.16,
    roughness: 0.38,
    clearcoat: 0.3,
  });

  const cochlearNerveCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.55, -0.08, -0.08),
    new THREE.Vector3(2.45, 0.16, -0.05),
    new THREE.Vector3(3.65, 0.42, 0.04),
    new THREE.Vector3(4.85, 0.56, 0.1),
  ]);
  const mainNerveMesh = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, cochlearNerveCurve, 44, 16, (u) => 0.16 + 0.06 * u),
    nerveMat,
  );

  const vestibBranchCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.55, 0.42, -0.18),
    new THREE.Vector3(1.65, 0.52, -0.12),
    new THREE.Vector3(2.85, 0.36, -0.02),
    new THREE.Vector3(4.85, 0.58, 0.08),
  ]);
  const vestibBranchMesh = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, vestibBranchCurve, 36, 12, (u) => 0.095 + 0.03 * u),
    nerveMat,
  );

  const braidPts = [];
  for (let i = 0; i <= 48; i += 1) {
    const u = i / 48;
    const base = cochlearNerveCurve.getPointAt(u);
    const ang = u * Math.PI * 7;
    braidPts.push(new THREE.Vector3(base.x, base.y + Math.sin(ang) * 0.11, base.z + Math.cos(ang) * 0.11));
  }
  const braidCurve = new THREE.CatmullRomCurve3(braidPts);
  const braidMesh = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, braidCurve, 56, 10, () => 0.048),
    nerveMat,
  );

  nerveGroup.add(mainNerveMesh, vestibBranchMesh, braidMesh);

  const nerveSparks = [];
  const sparkGeo = new THREE.SphereGeometry(0.082, 12, 12);
  for (let s = 0; s < 16; s += 1) {
    const sMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.85 });
    const spark = new THREE.Mesh(sparkGeo, sMat);
    spark.userData = { offset: s / 16 };
    nerveGroup.add(spark);
    nerveSparks.push(spark);
  }

  registerPart('nerve', nerveGroup, [mainNerveMesh, vestibBranchMesh, braidMesh]);

  // =========================================================================
  // TRAVELLING ACOUSTIC WAVE RINGS ALONG THE S-CURVED EAR CANAL
  // =========================================================================
  const waveRings = [];
  for (let w = 0; w < 8; w += 1) {
    const rGeo = new THREE.TorusGeometry(0.32, 0.024, 10, 28);
    rGeo.rotateY(Math.PI / 2);
    const rMat = new THREE.MeshBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.78 });
    const ring = new THREE.Mesh(rGeo, rMat);
    ring.userData = { phase: w / 8, isTreble: w % 2 === 1, anatomyPart: 'canal' };
    rootGroup.add(ring);
    waveRings.push(ring);
  }

  // =========================================================================
  // DELICATE 3D SELECTION RING AT TOUCHED POINT
  // =========================================================================
  const touchBeacon = new THREE.Group();
  const beaconInner = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x4f4cad }),
  );
  const beaconHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.21, 0.016, 12, 36),
    new THREE.MeshBasicMaterial({ color: 0x4f4cad, transparent: true, opacity: 0.75 }),
  );
  touchBeacon.add(beaconInner, beaconHalo);
  touchBeacon.position.set(1.52, -0.08, 0.45);
  rootGroup.add(touchBeacon);

  return {
    rootGroup,
    partGroups,
    partBasePositions,
    highlightMeshesByPart,
    xrayMaterials,
    canalCurve,
    cochleaCurve,
    cochlearNerveCurve,
    foamPlugGroup,
    musicianPlugGroup,
    plugSlotRing,
    eardrumGroup,
    ossicleChain,
    stapesGroup,
    hairCells,
    nerveSparks,
    waveRings,
    touchBeacon,
    beaconHalo,
    beaconInner,
  };
}

// =============================================================================
// SCULPTED 3D HUMAN PORTRAIT BUST & SPATIAL ACOUSTIC ROOM (FOR "SPATIAL CROWD")
// =============================================================================
function buildSideEarPinna(THREE, sideSign, material) {
  // sideSign = -1 for Left Ear (-X), +1 for Right Ear (+X)
  const earGroup = new THREE.Group();
  const rSteps = 14;
  const aSteps = 32;
  const pos = [];
  const idx = [];

  for (let ir = 0; ir <= rSteps; ir += 1) {
    const r = ir / rSteps;
    for (let ia = 0; ia <= aSteps; ia += 1) {
      const th = (ia / aSteps) * Math.PI * 2;
      const sinT = Math.sin(th);
      const cosT = Math.cos(th);
      const yScale = sinT > 0 ? 0.34 : 0.29;
      const zScale = cosT > 0 ? 0.16 : 0.21;
      const py = sinT * yScale * r;
      const pz = cosT * zScale * r;
      const concha = -0.09 * Math.exp(-(r * r) / 0.12);
      const helix = 0.055 * Math.exp(-((r - 0.94) ** 2) / 0.014) * (sinT > -0.5 ? 1 : 0.3);
      const antihelix = 0.035 * Math.exp(-((r - 0.58) ** 2) / 0.025) * (cosT < 0.2 ? 1 : 0.2);
      const px = sideSign * (concha + helix + antihelix + 0.04 * r);
      pos.push(px, py, pz);
    }
  }
  const stride = aSteps + 1;
  for (let ir = 0; ir < rSteps; ir += 1) {
    for (let ia = 0; ia < aSteps; ia += 1) {
      const a = ir * stride + ia;
      const b = (ir + 1) * stride + ia;
      const c = (ir + 1) * stride + (ia + 1);
      const d = ir * stride + (ia + 1);
      if (sideSign > 0) idx.push(a, b, d, b, c, d);
      else idx.push(a, d, b, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();

  const bowl = new THREE.Mesh(geo, material);
  earGroup.add(bowl);

  // Outer curled helix rim tube
  const rimPts = [];
  for (let i = 0; i <= 20; i += 1) {
    const t = -0.35 + (i / 20) * Math.PI * 1.45;
    const y = Math.sin(t) * 0.33;
    const z = Math.cos(t) * 0.18;
    rimPts.push(new THREE.Vector3(sideSign * 0.075, y, z));
  }
  const rimCurve = new THREE.CatmullRomCurve3(rimPts);
  const rimMesh = new THREE.Mesh(
    buildVariableTubeGeometry(THREE, rimCurve, 28, 10, (u) => (u > 0.8 ? 0.046 : 0.032)),
    material,
  );
  earGroup.add(rimMesh);

  earGroup.rotation.y = -sideSign * 0.22;
  earGroup.rotation.z = sideSign * 0.06;
  return earGroup;
}

export function buildSpatialHumanHeadScene(THREE) {
  const pubSpaceGroup = new THREE.Group();

  // Sculpted Museum Portrait Bust: Cranium, Brow, Eye Sockets & Eyelids, Nose, Cheekbones, Lips, Chin, Jaw, Neck & Bust Shoulders
  const vRings = 88;
  const uSegs = 96;
  const headPositions = [];
  const headColors = [];
  const headIndices = [];
  const cTmp = new THREE.Color();

  const yTop = 1.28;
  const yBot = -1.62;

  for (let iv = 0; iv <= vRings; iv += 1) {
    const v = iv / vRings;
    const y = yTop + (yBot - yTop) * v;

    for (let iu = 0; iu <= uSegs; iu += 1) {
      // phi = 0 is +Z (Front Face), +PI/2 is +X (Right Ear), -PI/2 is -X (Left Ear), +-PI is -Z (Occiput)
      const phi = ((iu / uSegs) - 0.5) * Math.PI * 2;
      const absPhi = Math.abs(phi);
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);

      let rx = 0.001;
      let rz = 0.001;
      let zCenter = 0;

      if (y >= -0.66) {
        // Cranium & Face envelope (y from +1.28 crown down to -0.66 chin base)
        const hNorm = Math.max(0, Math.min(1, (yTop - y) / (yTop - (-0.66))));
        const dome = Math.pow(Math.sin(hNorm * Math.PI), 0.62);

        // Skull width & depth
        rx = 0.78 * dome;
        rz = 0.92 * dome;

        // Back-of-skull occipital fullness (centered around y = +0.28, cosP < 0)
        if (cosP < 0) {
          const occiput = 0.14 * (-cosP) * Math.exp(-((y - 0.34) ** 2) / 0.28);
          rz += occiput;
        }

        // Jawline & chin V-taper below cheekbones (y < 0.05)
        if (y < 0.08) {
          const jawT = Math.min(1, (0.08 - y) / 0.74);
          rx *= 1 - 0.34 * Math.pow(jawT, 1.35);
          // Mandibular angle (gonion) definition at sides
          const gonion = 0.045 * Math.exp(-((y - (-0.28)) ** 2) / 0.045) * Math.exp(-((absPhi - 1.18) ** 2) / 0.18);
          rx += gonion;
        }

        // Temple slight anatomical flattening
        const templeDip = -0.032 * Math.exp(-((y - 0.42) ** 2) / 0.06) * Math.exp(-((absPhi - 0.92) ** 2) / 0.12);
        rx += templeDip;
      }

      // Smooth Cylindrical Neck & Sculpted Museum Bust Shoulders (blending cleanly below y = -0.32)
      let neckRx = 0;
      let neckRz = 0;
      let neckZShift = -0.14;
      if (y < -0.28) {
        const nT = Math.max(0, Math.min(1, (-0.28 - y) / 1.34));
        const collarFlareX = nT > 0.58 ? Math.pow((nT - 0.58) / 0.42, 1.55) * 0.86 : 0;
        const collarFlareZ = nT > 0.58 ? Math.pow((nT - 0.58) / 0.42, 1.55) * 0.26 : 0;
        neckRx = 0.41 + collarFlareX;
        neckRz = 0.43 + collarFlareZ;
        neckZShift = -0.14 + 0.08 * nT;
      }

      // Smooth union blend between Head/Jaw and Neck!
      if (y < -0.28 && y >= -0.66) {
        const blend = Math.max(0, Math.min(1, (-0.28 - y) / 0.38));
        const smoothB = blend * blend * (3 - 2 * blend);
        // Keep the proud chin projecting forward at cosP > 0.3 while back/sides transition into neck!
        const chinGuard = cosP > 0.25 ? Math.exp(-((absPhi) ** 2) / 0.35) * (1 - blend * 0.65) : 0;
        const wNeck = Math.max(0, smoothB - chinGuard * 0.55);
        rx = rx * (1 - wNeck) + neckRx * wNeck;
        rz = rz * (1 - wNeck) + neckRz * wNeck;
        zCenter = neckZShift * wNeck;
      } else if (y < -0.66) {
        rx = neckRx;
        rz = neckRz;
        zCenter = neckZShift;
      }

      // Base point before detailed facial sculpture
      let px = rx * sinP;
      let pz = zCenter + rz * cosP;

      // Detailed Anterior Facial Landmarks (cosP > 0)
      if (cosP > 0 && y > -0.72 && y < 0.85) {
        // 1. Supraorbital Brow Ridge + Glabella
        const browArch = 0.056 * Math.exp(-((y - 0.36) ** 2) / 0.0065) * Math.exp(-(phi * phi) / 0.26);
        const glabellaDip = -0.018 * Math.exp(-((y - 0.35) ** 2) / 0.005) * Math.exp(-(phi * phi) / 0.012);

        // 2. Paired Eye Sockets (Orbits) + Calm Closed Eyelids
        const eyeDist = absPhi - 0.28;
        const orbitScoop = -0.095 * Math.exp(-((y - 0.22) ** 2) / 0.011) * Math.exp(-(eyeDist * eyeDist) / 0.022);
        const eyelidMound = 0.058 * Math.exp(-((y - 0.20) ** 2) / 0.0032) * Math.exp(-(eyeDist * eyeDist) / 0.0085);
        const lidCrease = -0.016 * Math.exp(-((y - 0.185) ** 2) / 0.0004) * Math.exp(-(eyeDist * eyeDist) / 0.007);

        // 3. Sculpted Human Nose (Bridge -> Tip -> Columella + Nostril Alae)
        let noseProj = 0;
        if (y <= 0.34 && y >= -0.13) {
          const nProg = (0.32 - y) / 0.35; // 0 at nasion (0.32), 1.0 at pronasale tip (-0.03)
          let profile = 0;
          if (y >= -0.03) {
            profile = 0.04 + 0.195 * Math.pow(Math.max(0, nProg), 0.88);
          } else {
            // Smoothly tuck under tip to subnasale (-0.12)
            const under = (y - (-0.13)) / 0.1;
            profile = 0.235 * Math.max(0, Math.sin(Math.max(0, under) * Math.PI * 0.5));
          }
          const bridgeWidth = 0.058 + 0.036 * Math.max(0, Math.min(1, nProg));
          noseProj = profile * Math.exp(-(phi * phi) / (bridgeWidth * bridgeWidth));
        }
        const nostrilAlae = 0.064 * Math.exp(-((y - (-0.055)) ** 2) / 0.0022) * Math.exp(-((absPhi - 0.115) ** 2) / 0.0018);

        // 4. Zygomatic Cheekbones & Buccal Contour
        const cheekbone = 0.052 * Math.exp(-((y - 0.04) ** 2) / 0.018) * Math.exp(-((absPhi - 0.52) ** 2) / 0.045);
        const cheekHollow = -0.026 * Math.exp(-((y - (-0.23)) ** 2) / 0.016) * Math.exp(-((absPhi - 0.46) ** 2) / 0.032);

        // 5. Lips (Upper Lip, Mouth Line, Lower Lip) & Chin (Mentum)
        const upperLip = 0.066 * Math.exp(-((y - (-0.195)) ** 2) / 0.0014) * Math.exp(-(phi * phi) / 0.038)
          * (1 - 0.18 * Math.exp(-(phi * phi) / 0.0015));
        const mouthLine = -0.042 * Math.exp(-((y - (-0.242)) ** 2) / 0.00032) * Math.exp(-(phi * phi) / 0.042);
        const lowerLip = 0.072 * Math.exp(-((y - (-0.288)) ** 2) / 0.0016) * Math.exp(-(phi * phi) / 0.031);
        const labiomental = -0.038 * Math.exp(-((y - (-0.365)) ** 2) / 0.0025) * Math.exp(-(phi * phi) / 0.038);
        const chin = 0.088 * Math.exp(-((y - (-0.50)) ** 2) / 0.011) * Math.exp(-(phi * phi) / 0.065);

        const totalZRelief = browArch + glabellaDip + orbitScoop + eyelidMound + lidCrease
          + noseProj + nostrilAlae + cheekbone + cheekHollow
          + upperLip + mouthLine + lowerLip + labiomental + chin;

        pz += totalZRelief * cosP;
        px += cheekbone * sinP * 0.65;
      }

      // Subtle Clavicular / Sternocleidomastoid Collar Relief on Neck/Bust
      if (y < -0.75 && cosP > 0) {
        const clavicle = 0.035 * Math.exp(-((y - (-1.38)) ** 2) / 0.012) * Math.exp(-((absPhi - 0.42) ** 2) / 0.08);
        const sternalHollow = -0.028 * Math.exp(-((y - (-1.34)) ** 2) / 0.009) * Math.exp(-(phi * phi) / 0.025);
        pz += (clavicle + sternalHollow) * cosP;
      }

      // Close top crown cleanly at v = 0
      if (iv === 0) {
        px = 0;
        pz = 0;
      }

      headPositions.push(px, y, pz);

      // Warm alabaster-stone museum portrait bust vertex shading
      const frontWarmth = Math.max(0, cosP) * 0.035;
      const heightShade = 0.86 + 0.08 * ((y - yBot) / (yTop - yBot));
      cTmp.setRGB(
        Math.min(1, 0.90 * heightShade + frontWarmth),
        Math.min(1, 0.87 * heightShade + frontWarmth * 0.6),
        Math.min(1, 0.85 * heightShade + 0.02),
      );
      headColors.push(cTmp.r, cTmp.g, cTmp.b);
    }
  }

  const hStride = uSegs + 1;
  for (let iv = 0; iv < vRings; iv += 1) {
    for (let iu = 0; iu < uSegs; iu += 1) {
      const a = iv * hStride + iu;
      const b = (iv + 1) * hStride + iu;
      const c = (iv + 1) * hStride + (iu + 1);
      const d = iv * hStride + (iu + 1);
      headIndices.push(a, b, d, b, c, d);
    }
  }

  const bustGeo = new THREE.BufferGeometry();
  bustGeo.setIndex(headIndices);
  bustGeo.setAttribute('position', new THREE.Float32BufferAttribute(headPositions, 3));
  bustGeo.setAttribute('color', new THREE.Float32BufferAttribute(headColors, 3));
  bustGeo.computeVertexNormals();

  const bustMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.46,
    metalness: 0.02,
    clearcoat: 0.16,
    clearcoatRoughness: 0.55,
  });
  const bustMesh = new THREE.Mesh(bustGeo, bustMat);
  tagAnatomyHierarchy(bustMesh, 'pinna');

  // Bevelled Museum Pedestal Base Disc at y = -1.62
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x333752,
    roughness: 0.5,
    metalness: 0.15,
  });
  const plinthMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.2, 0.14, 48), plinthMat);
  plinthMesh.scale.set(1.02, 1, 0.64);
  plinthMesh.position.set(0, -1.68, -0.06);

  pubSpaceGroup.add(bustMesh, plinthMesh);

  // Actual Left & Right Sculpted Human Ears (Pinnae) mounted on both sides of the head!
  const earSkinMat = new THREE.MeshPhysicalMaterial({
    color: 0xe6a798,
    roughness: 0.45,
    clearcoat: 0.15,
    side: THREE.DoubleSide,
  });

  const leftEarGroup = buildSideEarPinna(THREE, -1, earSkinMat);
  leftEarGroup.position.set(-0.77, 0.10, -0.06);
  tagAnatomyHierarchy(leftEarGroup, 'canal', { headSide: 'left' });

  const rightEarGroup = buildSideEarPinna(THREE, 1, earSkinMat);
  rightEarGroup.position.set(0.77, 0.10, -0.06);
  tagAnatomyHierarchy(rightEarGroup, 'canal', { headSide: 'right' });
  pubSpaceGroup.add(leftEarGroup, rightEarGroup);

  // Miniature Earplugs nestled in both ears when Foam or Musicians' plugs are selected!
  const miniPlugGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.14, 14);
  miniPlugGeo.rotateZ(Math.PI / 2);
  const leftMiniPlugMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.3 });
  const leftMiniPlug = new THREE.Mesh(miniPlugGeo, leftMiniPlugMat);
  leftMiniPlug.position.set(-0.83, 0.08, -0.05);
  leftMiniPlug.visible = false;
  const rightMiniPlug = new THREE.Mesh(miniPlugGeo, leftMiniPlugMat);
  rightMiniPlug.position.set(0.83, 0.08, -0.05);
  rightMiniPlug.visible = false;
  pubSpaceGroup.add(leftMiniPlug, rightMiniPlug);

  // Subtle Left & Right Acoustic Reception Halos around the sculpted ears
  const leftEarHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.022, 12, 40),
    new THREE.MeshBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.72 }),
  );
  leftEarHalo.position.set(-0.88, 0.10, -0.06);
  leftEarHalo.rotation.y = Math.PI / 2;

  const rightEarHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.022, 12, 40),
    new THREE.MeshBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.72 }),
  );
  rightEarHalo.position.set(0.88, 0.10, -0.06);
  rightEarHalo.rotation.y = Math.PI / 2;
  pubSpaceGroup.add(leftEarHalo, rightEarHalo);

  // Front Stage Acoustic Source + Radiating Music Wavefronts!
  const stageSpeakerGroup = new THREE.Group();
  stageSpeakerGroup.position.set(0, 0.15, 3.15);
  const speakerCabinet = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.82, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x1e2238, roughness: 0.4, metalness: 0.25 }),
  );
  const speakerConeTop = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.022, 10, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
  );
  speakerConeTop.position.set(0, 0.18, -0.2);
  const speakerConeBot = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.026, 10, 28),
    new THREE.MeshBasicMaterial({ color: 0x10b981 }),
  );
  speakerConeBot.position.set(0, -0.15, -0.2);
  stageSpeakerGroup.add(speakerCabinet, speakerConeTop, speakerConeBot);
  tagAnatomyHierarchy(stageSpeakerGroup, 'cochlea');
  pubSpaceGroup.add(stageSpeakerGroup);

  const musicWaveArcs = [];
  for (let m = 0; m < 10; m += 1) {
    const isHigh = m % 2 === 0;
    const arcGeo = new THREE.TorusGeometry(0.55, 0.018, 10, 36, Math.PI * 0.72);
    const arcMat = new THREE.MeshBasicMaterial({
      color: isHigh ? 0x2563eb : 0x059669,
      transparent: true,
      opacity: 0.65,
    });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.rotation.x = Math.PI / 2;
    arc.rotation.z = -Math.PI * 0.86;
    arc.userData = { phase: m / 10, isHigh };
    pubSpaceGroup.add(arc);
    musicWaveArcs.push(arc);
  }

  // 360° Surrounding Bar Chatter Voice Rings closing in around the head!
  const chatterOrbs = [];
  for (let c = 0; c < 24; c += 1) {
    const cRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.018, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xd97706, transparent: true, opacity: 0 }),
    );
    cRing.userData = { seed: (c / 24) * Math.PI * 2 };
    tagAnatomyHierarchy(cRing, 'nerve');
    pubSpaceGroup.add(cRing);
    chatterOrbs.push(cRing);
  }

  return {
    pubSpaceGroup,
    bustMesh,
    leftEarGroup,
    rightEarGroup,
    leftEarHalo,
    rightEarHalo,
    leftMiniPlug,
    rightMiniPlug,
    leftMiniPlugMat,
    stageSpeakerGroup,
    musicWaveArcs,
    chatterOrbs,
  };
}
