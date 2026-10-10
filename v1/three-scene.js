// Scène 3D du final : "60" doré qui tombe du ciel + ballons qui réagissent à l'inclinaison du téléphone
import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const box = document.getElementById("three");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
box.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
const cam = new THREE.PerspectiveCamera(40, 1, .1, 100);
scene.add(new THREE.AmbientLight(0xffffff, .4));
const key = new THREE.PointLight(0xffd27a, 60, 30); key.position.set(3, 3, 5); scene.add(key);
const rim = new THREE.PointLight(0xff6fb5, 50, 30); rim.position.set(-4, -1, 3); scene.add(rim);
const flash = new THREE.PointLight(0xffffff, 0, 20); flash.position.set(0, 2.4, 3); scene.add(flash);

// --- Le "60" ---
const group = new THREE.Group(); group.visible = false; scene.add(group);
const gold = new THREE.MeshStandardMaterial({ color: 0xffd86b, metalness: 1, roughness: .18, envMapIntensity: 1.6 });
new FontLoader().load("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json", font => {
  const g = new TextGeometry(String(window.CONFIG_AGE || 60), { font, size: 2, height: .6, curveSegments: 10,
    bevelEnabled: true, bevelThickness: .1, bevelSize: .06, bevelSegments: 5 });
  g.center(); group.add(new THREE.Mesh(g, gold));
});

// --- Onde de choc (anneau) à l'atterrissage ---
const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64),
  new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, side: THREE.DoubleSide }));
scene.add(ring);

// --- Ballons ---
const cols = [0xff6fb5, 0x8b7bff, 0xffd27a, 0x7ff0d4, 0xff9a3c];
const balloonGeo = new THREE.SphereGeometry(.42, 32, 24); balloonGeo.scale(1, 1.18, 1);
const knotGeo = new THREE.ConeGeometry(.07, .12, 12);
const balloons = [];
for (let i = 0; i < 18; i++) {
  const m = new THREE.MeshPhysicalMaterial({ color: cols[i % cols.length], roughness: .25, clearcoat: 1, clearcoatRoughness: .1 });
  const b = new THREE.Group();
  b.add(new THREE.Mesh(balloonGeo, m));
  const knot = new THREE.Mesh(knotGeo, m); knot.position.y = -.53; knot.rotation.x = Math.PI; b.add(knot);
  b.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -.58, 0), new THREE.Vector3(.08, -1.1, 0), new THREE.Vector3(-.04, -1.7, 0)]),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35 })));
  const z = i < 4 ? 1.5 + Math.random() : -1 - Math.random() * 5;       // quelques-uns devant pour la profondeur
  b.userData = { x: (Math.random() * 2 - 1) * (2.4 - z * .35), z, sp: .45 + Math.random() * .5, ph: Math.random() * 6, off: Math.random() * 16, vx: 0 };
  b.position.set(b.userData.x, -9, z); b.scale.setScalar(.8 + Math.random() * .4);
  scene.add(b); balloons.push(b);
}

// --- Paillettes ---
const N = 260, pos = new Float32Array(N * 3);
for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 10; pos[i * 3 + 1] = (Math.random() - .5) * 16; pos[i * 3 + 2] = (Math.random() - .5) * 8; }
const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xffe2a0, size: .05, transparent: true, opacity: .8 }));
scene.add(sparks);

// Le "60" se place dans le haut de l'écran, quelle que soit la taille du téléphone
let topY = 2.4;
function size() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h;
  cam.position.z = Math.max(9, 3.6 / Math.tan(THREE.MathUtils.degToRad(20)) / cam.aspect * .58 + 2);
  const halfH = Math.tan(THREE.MathUtils.degToRad(20)) * cam.position.z;
  topY = halfH * .62;                                // ~19 % depuis le haut
  cam.updateProjectionMatrix();
}
addEventListener("resize", size);

const ease = t => 1 - Math.pow(1 - t, 3);
const bounce = t => { const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };

let running = false, t0 = 0, landed = false, cx = 0, cy = 0;
const final = document.getElementById("final");
function frame(t) {
  if (!running) return;
  const s = (t - t0) / 1000, tilt = window.tilt || { x: 0, y: 0 };
  // Caméra : suit l'inclinaison du téléphone (parallaxe)
  cx += (tilt.x * 1.6 - cx) * .06; cy += (-tilt.y * 1.2 - cy) * .06;
  cam.position.x = cx; cam.position.y = cy; cam.lookAt(0, 0, 0);

  // Le "60" : chute avec rebond, rotation, puis flottement
  const scrollUp = final.scrollTop / innerHeight * 8;  // il remonte quand on scrolle
  if (group.children.length) {
    group.visible = true;
    const k = Math.min(1, s / 1.4);
    const y = topY + 9 * (1 - bounce(k));
    group.position.y = (k < 1 ? y : topY + Math.sin(s * 1.6) * .1) + scrollUp;
    group.rotation.y = (1 - ease(Math.min(1, s / 1.8))) * Math.PI * 4 + Math.sin(s * .8) * .35 + tilt.x * .5;
    group.rotation.x = Math.sin(s * 1.1) * .06 - tilt.y * .25;
    group.scale.setScalar(.6 + .4 * ease(k));
    if (k > .36 && !landed) {                          // premier impact → flash + onde
      landed = true; flash.intensity = 120; ring.position.set(0, topY - 1.1, 0); ring.rotation.x = -Math.PI / 2.3; ring.scale.setScalar(.5); ring.material.opacity = .9;
      window.burstAt && window.burstAt(.5, .19); navigator.vibrate && navigator.vibrate(40);
    }
  }
  flash.intensity *= .9;
  if (ring.material.opacity > 0) { ring.scale.multiplyScalar(1.06); ring.material.opacity *= .93; }
  key.position.x = Math.sin(s) * 4;

  // Ballons : montent, se balancent, glissent selon l'inclinaison
  for (const b of balloons) {
    const u = b.userData;
    u.vx += (tilt.x * (u.z > 0 ? 2.2 : 1.2) - u.vx) * .04;
    const y = ((s + u.off) * u.sp) % 18 - 9;
    b.position.set(u.x + u.vx + Math.sin(s * .9 + u.ph) * .3, y, u.z);
    b.rotation.z = Math.sin(s + u.ph) * .15 - u.vx * .15;
  }
  sparks.rotation.y = s * .05 + tilt.x * .3;
  renderer.render(scene, cam);
  requestAnimationFrame(frame);
}
window.start3D = () => { if (running) return; running = true; size(); t0 = performance.now() + 250; requestAnimationFrame(frame); };
