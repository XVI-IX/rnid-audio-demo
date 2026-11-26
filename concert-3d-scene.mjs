// Sculpted Three.js 3D Live Concert Arena ("What Vanishes From a Live Concert?")
// Uses local `./vendor/three.module.min.js` (zero external network calls, CSP-safe).
// Builds 5 raycastable 3D band musicians & instruments, volumetric 3D spotlight cones,
// overhead truss lighting rig, line-array PA stacks, and swaying crowd silhouettes.

export function buildConcert3DScene(THREE) {
  const rootGroup = new THREE.Group();

  const tagStem = (root, stemId) => {
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.userData.concertStem = stemId;
      }
    });
  };

  // --- 1. Stage Deck, Curved Apron, PA Line-Arrays, Overhead Truss & Front-Row Crowd ---
  const stageGroup = new THREE.Group();
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x161a2e,
    roughness: 0.42,
    metalness: 0.22,
  });
  const mainDeck = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6.0, 0.36, 56, 1, false, -Math.PI * 0.52, Math.PI * 1.04), deckMat);
  mainDeck.scale.set(1.06, 1, 0.58);
  mainDeck.position.set(0, -0.22, -0.35);
  stageGroup.add(mainDeck);

  const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.36, 2.8), deckMat);
  rearDeck.position.set(0, -0.22, -1.75);
  stageGroup.add(rearDeck);

  // Glowing front stage apron trim
  const apronTrimMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.55 });
  const apronTrim = new THREE.Mesh(
    new THREE.TorusGeometry(5.82, 0.025, 10, 64, Math.PI * 0.92),
    apronTrimMat,
  );
  apronTrim.rotation.x = Math.PI / 2;
  apronTrim.rotation.z = Math.PI * 0.04;
  apronTrim.scale.set(1.06, 0.58, 1);
  apronTrim.position.set(0, -0.04, -0.35);
  stageGroup.add(apronTrim);

  // Overhead Lighting Truss & Pillars
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.32, metalness: 0.78 });
  const topBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 10.6, 14), trussMat);
  topBeam.rotation.z = Math.PI / 2;
  topBeam.position.set(0, 3.85, -0.55);
  stageGroup.add(topBeam);

  const rearBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 10.6, 14), trussMat);
  rearBeam.rotation.z = Math.PI / 2;
  rearBeam.position.set(0, 3.65, -1.75);
  stageGroup.add(rearBeam);

  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 4.2, 12), trussMat);
    pillar.position.set(side * 5.2, 1.85, -1.25);
    stageGroup.add(pillar);

    // Hanging Line-Array PA Speaker Stack (4 curved array boxes per side)
    const paGroup = new THREE.Group();
    const paMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.35 });
    for (let b = 0; b < 4; b += 1) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 0.46), paMat);
      box.position.set(0, -b * 0.31, b * 0.04);
      box.rotation.x = b * 0.08;
      paGroup.add(box);
    }
    paGroup.position.set(side * 4.85, 3.25, -0.65);
    paGroup.rotation.y = -side * 0.22;
    stageGroup.add(paGroup);
  }

  // Subtle Front-Row Audience Silhouettes in the Pit
  const crowdSilhouettes = [];
  const crowdMat = new THREE.MeshStandardMaterial({ color: 0x090c18, roughness: 0.85, metalness: 0.05 });
  for (let i = 0; i < 15; i += 1) {
    const u = (i / 14) * 2 - 1;
    const person = new THREE.Group();
    const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.18, 6, 10), crowdMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 10), crowdMat);
    head.position.y = 0.28;
    person.add(shoulders, head);
    person.position.set(u * 4.5, -0.58, 2.35 + Math.abs(u) * 0.38 + (i % 2) * 0.16);
    person.userData = { phase: i * 0.7, baseY: person.position.y };
    crowdSilhouettes.push(person);
    stageGroup.add(person);
  }

  // 3.4 kHz Phantom Tinnitus Halo Ring above Stage (visible only when ringing is active)
  const ringingHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const ringingHalo = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.72, 64), ringingHaloMat);
  ringingHalo.rotation.x = Math.PI / 2;
  ringingHalo.position.set(0, 3.1, -0.35);
  stageGroup.add(ringingHalo);

  rootGroup.add(stageGroup);

  // Helper to build a stylized sculpted 3D musician body + instrument material
  function makePerformerMaterials(hexColor) {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: new THREE.Color(hexColor),
      emissiveIntensity: 0.18,
      roughness: 0.36,
      metalness: 0.15,
      transparent: true,
      opacity: 1,
    });
    const instMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hexColor),
      emissive: new THREE.Color(hexColor),
      emissiveIntensity: 0.32,
      roughness: 0.25,
      metalness: 0.55,
      transparent: true,
      opacity: 1,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.65,
      transparent: true,
      opacity: 1,
    });
    return { bodyMat, instMat, darkTrimMat };
  }

  function buildMusicianFigure(bodyMat, { heightScale = 1 } = {}) {
    const fig = new THREE.Group();
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.72, 14), bodyMat);
    legs.position.y = 0.36;
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.42, 8, 16), bodyMat);
    torso.position.y = 0.96;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 18, 16), bodyMat);
    head.position.y = 1.44;
    fig.add(legs, torso, head);
    fig.scale.setScalar(heightScale);
    return fig;
  }

  // --- 2. Five 3D Performer Stations, Volumetric Spotlights, Floor Monitors & Instruments ---
  const STATION_SPECS = [
    { id: 'keys', x: -3.55, z: -0.45, color: 0x60a5fa, rotY: 0.28 },
    { id: 'bass', x: -1.8, z: -0.68, color: 0x10b981, rotY: 0.12 },
    { id: 'vocals', x: 0.0, z: 0.22, color: 0xf472b6, rotY: 0.0 },
    { id: 'guitar', x: 1.8, z: -0.58, color: 0xf59e0b, rotY: -0.16 },
    { id: 'cymbals', x: 3.55, z: -0.45, color: 0xa78bfa, rotY: -0.28 },
  ];

  const stations = {};

  for (const spec of STATION_SPECS) {
    const stationGroup = new THREE.Group();
    stationGroup.position.set(spec.x, 0, spec.z);
    const mats = makePerformerMaterials(spec.color);

    // Circular riser pad + glowing LED ring on the stage floor
    const riser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.94, 0.09, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e243d, roughness: 0.5, metalness: 0.3 }),
    );
    riser.position.y = 0.01;
    stationGroup.add(riser);

    const floorRingMat = new THREE.MeshBasicMaterial({
      color: spec.color,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const floorRing = new THREE.Mesh(new THREE.RingGeometry(0.86, 0.96, 40), floorRingMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.06;
    stationGroup.add(floorRing);

    // Downstage Wedge Monitor Speaker
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.3), mats.darkTrimMat);
    wedge.position.set(0, 0.1, 0.72);
    wedge.rotation.x = -0.35;
    stationGroup.add(wedge);

    // Overhead Spotlight Can + Volumetric 3D Light Beam Cone!
    const lampCan = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.28, 14), trussMat);
    lampCan.position.set(0, 3.72, -0.55 - spec.z);
    stationGroup.add(lampCan);

    const spotConeMat = new THREE.MeshBasicMaterial({
      color: spec.color,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beamHeight = 3.72;
    const spotCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 1.05, beamHeight, 28, 1, true),
      spotConeMat,
    );
    spotCone.position.set(0, beamHeight * 0.5 + 0.05, (-0.55 - spec.z) * 0.35);
    spotCone.rotation.x = (spec.z + 0.55) * 0.14;
    // Do NOT raycast the transparent light cone so clicks reach performers cleanly
    stationGroup.add(spotCone);

    // Performer & Specific 3D Instrument Rig
    const actorRig = new THREE.Group();
    actorRig.rotation.y = spec.rotY;
    const figure = buildMusicianFigure(mats.bodyMat);
    actorRig.add(figure);

    const animatedParts = {};

    if (spec.id === 'keys') {
      // Dual-tier 3D Keyboard / Synth Stand + Floating Chord Halo
      const keyBed = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.09, 0.38), mats.instMat);
      keyBed.position.set(0, 0.88, 0.36);
      const whiteKeys = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.03, 0.16),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.92 }),
      );
      whiteKeys.position.set(0, 0.935, 0.44);
      const standLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.88, 8), mats.darkTrimMat);
      standLeft.position.set(-0.38, 0.44, 0.36);
      standLeft.rotation.z = 0.24;
      const standRight = standLeft.clone();
      standRight.position.x = 0.38;
      standRight.rotation.z = -0.24;
      actorRig.add(keyBed, whiteKeys, standLeft, standRight);
      animatedParts.keyBed = keyBed;
    } else if (spec.id === 'bass') {
      // 3D Electric Bass Guitar + Massive 22" Concert Kick Drum + Bass Amp Stack
      figure.position.x = -0.22;
      const bassBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.08, 18), mats.instMat);
      bassBody.rotation.x = Math.PI / 2;
      bassBody.scale.set(1.15, 1, 0.85);
      bassBody.position.set(-0.18, 0.92, 0.24);
      const bassNeck = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.055, 0.04), mats.instMat);
      bassNeck.position.set(0.22, 1.08, 0.26);
      bassNeck.rotation.z = 0.38;

      // Concert Kick Drum whose front drumhead physically thumps!
      const kickShell = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.44, 28), mats.darkTrimMat);
      kickShell.rotation.x = Math.PI / 2;
      kickShell.position.set(0.44, 0.46, 0.18);
      const kickHead = new THREE.Mesh(
        new THREE.CircleGeometry(0.39, 28),
        new THREE.MeshStandardMaterial({
          color: 0xecfdf5,
          emissive: new THREE.Color(0x10b981),
          emissiveIntensity: 0.35,
          roughness: 0.3,
        }),
      );
      kickHead.position.set(0.44, 0.46, 0.41);
      actorRig.add(bassBody, bassNeck, kickShell, kickHead);
      animatedParts.kickHead = kickHead;
    } else if (spec.id === 'vocals') {
      // Center-Stage Lead Singer + Chrome Boom Mic Stand + Dual Vowel/Consonant Acoustic Rings!
      const micPole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.36, 10), mats.darkTrimMat);
      micPole.position.set(0.14, 0.68, 0.34);
      micPole.rotation.x = -0.1;
      const micCapsule = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), mats.instMat);
      micCapsule.position.set(0.11, 1.38, 0.27);

      const vowelRingMat = new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const vowelRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.27, 32), vowelRingMat);
      vowelRing.position.set(0, 1.42, 0.32);

      const consonantRingMat = new THREE.MeshBasicMaterial({
        color: 0x2dd4bf,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const consonantRing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.41, 32), consonantRingMat);
      consonantRing.position.set(0, 1.42, 0.34);

      actorRig.add(micPole, micCapsule, vowelRing, consonantRing);
      animatedParts.vowelRing = vowelRing;
      animatedParts.consonantRing = consonantRing;
    } else if (spec.id === 'guitar') {
      // 3D Lead Electric Guitar + Snare Drum + 4x12 Amp Cabinet
      figure.position.x = -0.15;
      const gBody = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.075, 18), mats.instMat);
      gBody.rotation.x = Math.PI / 2;
      gBody.position.set(-0.12, 0.94, 0.24);
      const gNeck = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.04), mats.instMat);
      gNeck.position.set(0.24, 1.1, 0.26);
      gNeck.rotation.z = 0.42;

      const ampCab = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.68, 0.36), mats.darkTrimMat);
      ampCab.position.set(0.42, 0.38, -0.32);

      const snareDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 22), mats.instMat);
      snareDrum.position.set(0.45, 0.78, 0.22);
      const snareStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.75, 8), mats.darkTrimMat);
      snareStand.position.set(0.45, 0.38, 0.22);

      actorRig.add(gBody, gNeck, ampCab, snareDrum, snareStand);
      animatedParts.snareDrum = snareDrum;
    } else if (spec.id === 'cymbals') {
      // 3D Drummer + Gleaming Crash, Ride & Hi-Hat Cymbal Stands (6–20 kHz Shimmer)
      figure.position.set(0, -0.1, -0.18);
      const crashDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.018, 28), mats.instMat);
      crashDisc.position.set(-0.36, 1.38, 0.22);
      crashDisc.rotation.set(0.26, 0, -0.18);
      const crashStand = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 1.38, 8), mats.darkTrimMat);
      crashStand.position.set(-0.36, 0.69, 0.22);

      const rideDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.02, 28), mats.instMat);
      rideDisc.position.set(0.38, 1.24, 0.18);
      rideDisc.rotation.set(0.22, 0, 0.18);
      const rideStand = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 1.24, 8), mats.darkTrimMat);
      rideStand.position.set(0.38, 0.62, 0.18);

      const hiHatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.016, 24), mats.instMat);
      hiHatTop.position.set(-0.02, 1.06, 0.42);
      const hiHatStand = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 1.08, 8), mats.darkTrimMat);
      hiHatStand.position.set(-0.02, 0.54, 0.42);

      actorRig.add(crashDisc, crashStand, rideDisc, rideStand, hiHatTop, hiHatStand);
      animatedParts.crashDisc = crashDisc;
      animatedParts.rideDisc = rideDisc;
      animatedParts.hiHatTop = hiHatTop;
    }

    // Invisible generous hit-cylinder around each performer so mobile finger taps never miss!
    const hitProxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.78, 1.95, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hitProxy.position.y = 0.98;
    actorRig.add(hitProxy);

    tagStem(actorRig, spec.id);
    tagStem(riser, spec.id);
    stationGroup.add(actorRig);
    rootGroup.add(stationGroup);

    stations[spec.id] = {
      id: spec.id,
      color: spec.color,
      stationGroup,
      actorRig,
      figure,
      spotCone,
      spotConeMat,
      floorRing,
      floorRingMat,
      mats,
      animatedParts,
      labelAnchor: new THREE.Vector3(spec.x, 2.08, spec.z),
    };
  }

  return {
    rootGroup,
    stations,
    crowdSilhouettes,
    ringingHalo,
    ringingHaloMat,
  };
}
