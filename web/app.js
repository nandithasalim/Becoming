import * as api from './api.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ================= renderer / scene =================
const cv = document.getElementById('sky');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- sky (fullscreen shader behind everything) ----------
const skyU = { R: { value: new THREE.Vector2(1, 1) }, T: { value: 0 }, D: { value: 0 }, S: { value: 0 }, P: { value: new THREE.Vector2() }, H: { value: 0.25 }, F: { value: 0 } };
const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: skyU, depthTest: false, depthWrite: false,
  vertexShader: `void main(){ gl_Position = vec4(position.xy, 1., 1.); }`,
  fragmentShader: `
    uniform vec2 R; uniform float T, D, S, H, F; uniform vec2 P;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<6;i++){ v+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }
    void main(){
      vec2 uv = gl_FragCoord.xy / R; float asp = R.x / R.y;
      vec2 q = vec2((uv.x-.5)*asp, uv.y);
      float y = (uv.y - H) / (1. - H);                       // 0 at horizon
      vec3 night = mix(vec3(.07,.055,.17), vec3(.012,.012,.05), smoothstep(0.,.95,y));
      vec3 dawn = mix(vec3(1.,.72,.52), vec3(.93,.6,.66), smoothstep(-.05,.22,y));
      dawn = mix(dawn, vec3(.42,.36,.66), smoothstep(.2,.5,y));
      dawn = mix(dawn, vec3(.1,.1,.28), smoothstep(.5,1.,y));
      vec3 col = mix(night, dawn, D);
      vec2 g = gl_FragCoord.xy / 3.; vec2 c = floor(g); float s = h(c);
      if (s > .9965) { float tw = .55+.45*sin(T*(1.+h(c+3.)*3.)+s*90.);
        col += vec3(.9,.9,1.) * smoothstep(.5,.0,length(fract(g)-.5)) * tw * (1.-D*.93) * smoothstep(.05,.4,y); }
      float sy = H + mix(-.04, .27, S);
      float dd = length(vec2(q.x, uv.y - sy));
      col += vec3(1.,.62,.42) * exp(-dd*3.0) * .6 * S;
      col += vec3(1.,.83,.66) * exp(-dd*10.) * .85 * S;
      col = mix(col, vec3(1.,.97,.92), smoothstep(.055,.048,dd) * S);
      float ang = atan(uv.y - sy, q.x);
      float ray = n(vec2(ang * 9., T * .15)) * n(vec2(ang * 23. + 4., -T * .1));
      col += vec3(1.,.78,.6) * smoothstep(.18,.6,ray) * exp(-dd * 1.6) * .3 * S * step(0., uv.y - H + .01);
      col += vec3(1.,.85,.72) * exp(-dd * 1.2) * F * .55;
      vec2 cp = vec2(q.x*1.25 + T*.008 + P.x*.04, y*3. + P.y*.03);
      float cl = fbm(cp + fbm(cp*.6 + T*.004));
      float band = smoothstep(.06,.22,y) * (1.-smoothstep(.55,.85,y));
      float m = smoothstep(.52,.82,cl) * band;
      vec3 lit = mix(vec3(1.,.74,.62), vec3(.62,.5,.78), smoothstep(.1,.6,y));
      vec3 cDawn = mix(lit*.85, vec3(1.,.9,.82), smoothstep(.6,.9,cl)*.5*(1.-smoothstep(.15,.55,dd)));
      col = mix(col, mix(vec3(.11,.09,.22), cDawn, D), m*.75);
      col += vec3(1.,.7,.55) * (1.-smoothstep(-.05,.25,y)) * .2 * D;
      col *= mix(1., smoothstep(1.3,.25,length((uv-.5)*vec2(asp*.6,1.))), .3);
      gl_FragColor = vec4(pow(max(col, 0.), vec3(2.2)), 1.);
    }`
}));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// ---------- hill (the figure rises from behind its crest) ----------
const hillMat = new THREE.MeshBasicMaterial({ color: 0x0a0714 });
const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), hillMat);
hill.scale.set(13, 2.6, 5); hill.position.set(0, -2.6, -0.6); scene.add(hill);
const hill2 = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.MeshBasicMaterial({ color: 0x06040c }));
hill2.scale.set(22, 3.2, 4); hill2.position.set(6, -4.1, 3.5); scene.add(hill2);

// ================= the reveal scene (same as the 3D page) =================
const rscene = new THREE.Scene();
rscene.background = new THREE.Color(0x04020C);
rscene.fog = new THREE.FogExp2(0x04020C, 0.085);
rscene.add(new THREE.HemisphereLight(0x5a4ab0, 0x080410, 0.35));
const key = new THREE.DirectionalLight(0xbfb4ff, 0.55); key.position.set(1.5, 3, 4); rscene.add(key);
const rimWarm = new THREE.PointLight(0xff9f6b, 0, 9, 1.6); rimWarm.position.set(-1.3, 2.1, -1.4); rscene.add(rimWarm);
const rimCool = new THREE.PointLight(0x9b7bff, 0, 9, 1.6); rimCool.position.set(1.4, 1.6, -1.2); rscene.add(rimCool);
const under = new THREE.PointLight(0xff8a50, 0, 4, 2); under.position.set(0, 0.15, 0.4); rscene.add(under);

const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0a0618, roughness: 0.35, metalness: 0.6 }));
floor.rotation.x = -Math.PI/2; rscene.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.84, 128), new THREE.MeshBasicMaterial({ color: 0xff9f6b, transparent: true, opacity: 0, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI/2; ring.position.y = 0.005; rscene.add(ring);
const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.07, 128), new THREE.MeshBasicMaterial({ color: 0xb79cff, transparent: true, opacity: 0, side: THREE.DoubleSide }));
ring2.rotation.x = -Math.PI/2; ring2.position.y = 0.006; rscene.add(ring2);
const pool = new THREE.Mesh(new THREE.CircleGeometry(0.8, 64), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform float uA; varying vec2 vUv; void main(){ float d=distance(vUv,vec2(.5))*2.; float a=smoothstep(1.,0.,d); gl_FragColor=vec4(vec3(1.,.55,.3)*a*a, a*uA); }`
}));
pool.rotation.x = -Math.PI/2; pool.position.y = 0.004; rscene.add(pool);
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 7, 48, 1, true), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 }, uT: { value: 0 } },
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform float uA; uniform float uT; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ float edge=1.-abs(dot(vN,vV)); float fall=pow(1.-vUv.y,2.2); float shimmer=.75+.25*sin(vUv.x*40.+uT*2.);
      vec3 c=mix(vec3(1.,.58,.36),vec3(.62,.48,1.),vUv.y); gl_FragColor=vec4(c, (1.-edge)*fall*uA*.07*shimmer); }`
}));
beam.position.y = 3.5; rscene.add(beam);

// ---------- the figure ----------
const skin = new THREE.MeshPhysicalMaterial({
  color: 0x120c2e, roughness: 0.3, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15,
  iridescence: 0.9, iridescenceIOR: 1.4, sheen: 1, sheenColor: new THREE.Color(0xff9f6b), sheenRoughness: 0.4,
  emissive: new THREE.Color(0x0a0620), emissiveIntensity: 0.3
});
skin.onBeforeCompile = (sh) => {
  sh.uniforms.uRim = { value: 0 }; skin.userData.sh = sh;
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float uRim;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float fr = pow(1.0 - abs(dot(normalize(-vViewPosition), normal)), 2.6);
      totalEmissiveRadiance += mix(vec3(1.0,0.55,0.32), vec3(0.65,0.5,1.0), 0.45) * fr * uRim;`);
};
const M = (g) => new THREE.Mesh(g, skin);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 12, 24);
const root = new THREE.Group(); rscene.add(root);
const body = new THREE.Group(); root.add(body);
const prof = [[0,0],[.12,.01],[.155,.08],[.15,.16],[.125,.27],[.135,.37],[.175,.47],[.185,.53],[.16,.585],[.08,.62],[0,.625]].map(([r,y]) => new THREE.Vector2(r, y));
const torso = M(new THREE.LatheGeometry(prof, 48)); torso.scale.set(1, 1, 0.66); torso.position.y = 0.9; body.add(torso);
const neck = M(new THREE.CylinderGeometry(0.042, 0.05, 0.12, 24)); neck.position.y = 1.56; body.add(neck);
const headPivot = new THREE.Group(); headPivot.position.y = 1.6; body.add(headPivot);
const head = M(new THREE.SphereGeometry(0.105, 48, 48)); head.scale.set(0.92, 1.18, 1.0); head.position.y = 0.11; headPivot.add(head);
function limb(s) {
  const sh = new THREE.Group(); sh.position.set(0.19*s, 1.465, 0); body.add(sh);
  sh.add(M(new THREE.SphereGeometry(0.058, 24, 24)));
  const ua = M(cap(0.046, 0.22)); ua.position.y = -0.15; sh.add(ua);
  const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
  const fa = M(cap(0.039, 0.21)); fa.position.y = -0.135; el.add(fa);
  const hand = M(new THREE.SphereGeometry(0.045, 24, 24)); hand.scale.set(0.7, 1.35, 0.55); hand.position.y = -0.3; el.add(hand);
  const hip = new THREE.Group(); hip.position.set(0.085*s, 0.93, 0); body.add(hip);
  const th = M(cap(0.068, 0.34)); th.position.y = -0.23; hip.add(th);
  const kn = new THREE.Group(); kn.position.y = -0.46; hip.add(kn);
  const shin = M(cap(0.054, 0.34)); shin.position.y = -0.22; kn.add(shin);
  const foot = M(new THREE.CapsuleGeometry(0.04, 0.12, 8, 16)); foot.rotation.x = Math.PI/2; foot.position.set(0, -0.45, 0.05); kn.add(foot);
  return { sh, el, hip, kn };
}
const L = limb(1), Rt = limb(-1);
const core = new THREE.PointLight(0xff9f6b, 0, 1.2, 2); core.position.set(0, 1.3, 0.25); body.add(core);

// ---------- sparks ----------
function dotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.25,'rgba(255,200,170,.8)'); g.addColorStop(1,'rgba(255,160,110,0)');
  x.fillStyle = g; x.fillRect(0,0,64,64); return new THREE.CanvasTexture(c);
}
const N = 900, pPos = new Float32Array(N*3), pVel = new Float32Array(N*3), pCol = new Float32Array(N*3);
const cA = new THREE.Color(0xff9f6b), cB = new THREE.Color(0xb79cff), tmpC = new THREE.Color();
function seedP(i, anyY) {
  const a = Math.random()*Math.PI*2, r = Math.random() < .7 ? 0.2 + Math.random()*0.9 : 1 + Math.random()*3.5;
  pPos[i*3] = Math.cos(a)*r; pPos[i*3+1] = anyY ? Math.random()*5 : -0.2; pPos[i*3+2] = Math.sin(a)*r - 0.3;
  pVel[i*3] = 0; pVel[i*3+1] = 0.15 + Math.random()*0.5; pVel[i*3+2] = 0;
  tmpC.copy(cA).lerp(cB, Math.random()); pCol[i*3] = tmpC.r; pCol[i*3+1] = tmpC.g; pCol[i*3+2] = tmpC.b;
}
for (let i = 0; i < N; i++) seedP(i, true);
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const pMat = new THREE.PointsMaterial({ size: 0.045, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 });
rscene.add(new THREE.Points(pGeo, pMat));

// ---------- post ----------
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
const composer = new EffectComposer(renderer);
const rpass = new RenderPass(scene, camera); composer.addPass(rpass);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.5, 0.3);
composer.addPass(bloom); composer.addPass(new OutputPass());

// ---------- framing ----------
let side = false;
const camBase = new THREE.Vector3(0, 1.45, 5.6), look = new THREE.Vector3(0, 0.62, 0);
const dawnCam = { y: 0, dist: 10 };
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  skyU.R.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  camera.aspect = w / h;
  side = w >= 700 && w / h > 1.0;
  document.body.classList.toggle('side', side);
  // dawn sky camera (intro + questions)
  const dist = 10, horizon = 0.25;
  const half = Math.tan(THREE.MathUtils.degToRad(15)) * dist;
  dawnCam.y = (0.5 - horizon) * 2 * half; dawnCam.dist = dist; skyU.H.value = horizon;
  // reveal camera: same as the 3D page, figure centred
  look.set(0, side ? 1.0 : 0.62, 0);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ================= animation =================
const st = { px: 0, py: 0, tpx: 0, tpy: 0 };
let mode = 'dawn', revealAt = 0, celebrate = 0, burst = 0;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const eOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const eIO = (x) => { x = clamp01(x); return x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const rt = () => (performance.now() - revealAt) / 1000;
addEventListener('pointermove', (e) => { st.tpx = e.clientX / innerWidth - .5; st.tpy = e.clientY / innerHeight - .5; }, { passive: true });
cv.addEventListener('pointerdown', () => {
  if (mode !== 'reveal' || rt() < 4) return;
  celebrate = 1; burst = 1;
  for (let i = 0; i < N; i++) { const a = Math.random()*Math.PI*2, s = 1 + Math.random()*3;
    pPos[i*3] = Math.cos(a)*0.2; pPos[i*3+1] = 0.8 + Math.random()*0.9; pPos[i*3+2] = Math.sin(a)*0.2;
    pVel[i*3] = Math.cos(a)*s; pVel[i*3+1] = 0.5 + Math.random()*2.5; pVel[i*3+2] = Math.sin(a)*s; }
});

function hideFigure() {
  root.position.y = -3; ring.material.opacity = 0; ring2.material.opacity = 0; pool.material.uniforms.uA.value = 0;
  beam.material.uniforms.uA.value = 0; rimWarm.intensity = rimCool.intensity = under.intensity = core.intensity = 0;
  if (skin.userData.sh) skin.userData.sh.uniforms.uRim.value = 0;
}
function setFigure(t, time) {
  const rise = reduce ? 1 : eOut((t - 0.6) / 2.6);
  const turn = reduce ? 1 : eIO((t - 3.0) / 1.6);
  const open = reduce ? 1 : eIO((t - 3.8) / 1.4);
  root.position.y = lerp(-2.25, 0, rise);
  root.rotation.y = Math.PI * (1 - turn);
  const br = Math.sin(time * 1.6);
  torso.scale.set(1 + br*0.012, 1 + br*0.006, 0.66 + br*0.01);
  body.position.y = br * 0.006;
  const px = st.px * 2, py = -st.py * 2;
  headPivot.rotation.y = px * 0.55 * turn;
  headPivot.rotation.x = lerp(0.42, -py * 0.25, turn);
  body.rotation.y = px * 0.12 * turn;
  celebrate *= 0.975;
  const c = eIO(celebrate * 1.4);
  L.sh.rotation.z = 0.12 + open*0.22 + c*2.2; Rt.sh.rotation.z = -(0.12 + open*0.22 + c*2.2);
  L.sh.rotation.x = Rt.sh.rotation.x = -0.05 - open*0.1;
  L.el.rotation.x = Rt.el.rotation.x = -0.12 - open*0.18 + c*0.1;
  L.el.rotation.z = 0.05 + c*0.2; Rt.el.rotation.z = -(0.05 + c*0.2);
  L.hip.rotation.z = 0.03; Rt.hip.rotation.z = -0.03;
  L.kn.rotation.x = Rt.kn.rotation.x = 0.02;
  root.position.y += c * 0.06;
  const glow = clamp01((t - 0.2) / 1.2);
  ring.material.opacity = glow * (0.9 + 0.1*Math.sin(time*3));
  ring.scale.setScalar(lerp(0.2, 1, eOut(t/1.4)));
  ring2.material.opacity = glow * 0.5; ring2.scale.setScalar(lerp(0.2, 1, eOut((t-0.2)/1.8)) * (1 + 0.03*Math.sin(time*1.3)));
  pool.material.uniforms.uA.value = glow * (0.6 - 0.35*turn) + burst*0.5;
  beam.material.uniforms.uA.value = glow * lerp(1, 0.45, turn) + burst*0.8;
  beam.material.uniforms.uT.value = time;
  rimWarm.intensity = glow * 9; rimCool.intensity = glow * 7; under.intensity = glow * (2.5 - 1.5*turn) + burst*4;
  core.intensity = turn * (0.6 + 0.4*Math.sin(time*2.2)) * 0.8 + burst*2;
  if (skin.userData.sh) skin.userData.sh.uniforms.uRim.value = glow * (0.55 + 0.12*Math.sin(time*1.2)) + burst*1.2;
  bloom.strength = 0.45 + glow*0.2 + burst*0.8;
  burst *= 0.95;
  pMat.opacity = 0.35 + glow*0.45;
}

const clock = new THREE.Clock();
const SKY_OFF = getComputedStyle(cv).display === 'none';   // minimal design: the sky canvas is not shown
function loop() {
  if (SKY_OFF) return;
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
  st.px += (st.tpx - st.px) * 0.05; st.py += (st.tpy - st.py) * 0.05;
  if (mode === 'reveal') {
    for (let i = 0; i < N; i++) {
      pVel[i*3] *= 0.97; pVel[i*3+2] *= 0.97; pVel[i*3+1] = lerp(pVel[i*3+1], 0.25, 0.01);
      pPos[i*3] += (pVel[i*3] + Math.sin(time + i)*0.03) * dt;
      pPos[i*3+1] += pVel[i*3+1] * dt * 1.4;
      pPos[i*3+2] += pVel[i*3+2] * dt;
      if (pPos[i*3+1] > 5.5) seedP(i, false);
    }
    pGeo.attributes.position.needsUpdate = true;
    const t = rt();
    setFigure(t, time);
    const push = eOut(t / 6);
    camera.fov = side ? 30 : 36; camera.updateProjectionMatrix();
    camera.position.set(camBase.x + st.px*0.7, camBase.y - st.py*0.36 - push*0.1, camBase.z - push*0.5);
    camera.lookAt(look);
    rpass.scene = rscene;
    bloom.threshold = 0.3;
  } else {
    skyU.T.value = time; skyU.D.value = 0; skyU.S.value = 0; skyU.F.value = 0; skyU.P.value.set(st.px, st.py);
    camera.fov = 30; camera.updateProjectionMatrix();
    camera.position.set(-st.px * 0.25, dawnCam.y + st.py * 0.12, -0.6 + dawnCam.dist);
    camera.lookAt(camera.position.x, camera.position.y, -0.6);
    rpass.scene = scene;
    bloom.strength = 0.3; bloom.threshold = 0.9;
  }
  composer.render(dt);
  requestAnimationFrame(loop);
}
resize(); hideFigure(); requestAnimationFrame(loop);

// ================= flow (UI) =================
const $ = (id) => document.getElementById(id);
const views = ['intro', 'ask', 'reveal', 'home'];
const show = (v) => { views.forEach(id => $(id).classList.toggle('on', id === v)); if (v !== 'reveal') mode = 'dawn'; };
const ans = { name: '', role: 'a designer', place: 'a flat in Bangalore', feel: 'calm' };
let step = 0;
const steps = [$('s0'), $('s1'), $('s2'), $('s3')];
function setStep(i) {
  step = i; steps.forEach((s, k) => s.classList.toggle('on', k === i));
  $('bar').style.width = ((i + 1) / 4 * 100) + '%'; $('count').textContent = `${i + 1} / 4`;
  if (i === 0) setTimeout(() => $('nm').focus({ preventScroll: true }), 400);
}
$('go').addEventListener('click', () => { show('ask'); setStep(0); });
$('back').addEventListener('click', () => step === 0 ? show('intro') : setStep(step - 1));
$('s0').addEventListener('submit', (e) => { e.preventDefault(); ans.name = $('nm').value.trim(); setStep(1); });
document.querySelectorAll('.opts').forEach((ul) => ul.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  ans[ul.parentElement.dataset.k] = b.dataset.v;
  if (step < 3) setStep(step + 1); else reveal();
}));

let timers = [], typers = [];
const clearAll = () => { timers.forEach(clearTimeout); typers.forEach(clearInterval); timers = []; typers = []; };
function typeInto(el, text, ms) {
  el.textContent = ''; const caret = document.createElement('span'); caret.className = 'caret'; el.appendChild(caret);
  let i = 0; const iv = setInterval(() => { i++; el.textContent = text.slice(0, i); el.appendChild(caret);
    if (i >= text.length) { clearInterval(iv); setTimeout(() => caret.remove(), 700); } }, ms);
  typers.push(iv);
}
function reveal() {
  // the reveal is the original 3D page, untouched: hand it the answers
  const p = new URLSearchParams({ n: ans.name, role: ans.role.replace(/^(a|an) /, ''), place: ans.place, feel: ans.feel });
  location.href = './reveal.html?' + p.toString();
}
// coming back from the reveal
(() => {
  const Q = new URLSearchParams(location.search);
  if (!Q.has('role')) return;
  ans.name = Q.get('n') || ''; $('nm').value = ans.name;
  const r = Q.get('role'); ans.role = (/^[aeiou]/i.test(r) ? 'an ' : 'a ') + r;
  ans.place = Q.get('place') || ans.place; ans.feel = Q.get('feel') || ans.feel;
  if (Q.has('home')) enterHome();
  else if (Q.has('ask')) { show('ask'); setStep(1); }
})();

// ================= accounts (Phase 1) =================
function withArticle(r) { return /^(a|an) /.test(r) ? r : (/^[aeiou]/i.test(r) ? 'an ' : 'a ') + r; }
function bare(r) { return r.replace(/^(a|an) /, ''); }

async function enterHome() {
  fillHome(); show('home');
  if (!api.apiEnabled) return;
  if (api.isSignedIn()) { await persist(); return; }
  openSignIn();
}

async function persist() {
  try {
    await api.saveAnswers({ ...ans, role: bare(ans.role) });
    $('acct').hidden = false;
  } catch (e) {
    if (e.status === 401) openSignIn();
    else console.warn('Could not save answers', e);
  }
}

function openSignIn() {
  const sheet = $('signin'); sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('on'));
  $('si-err').textContent = '';
  const done = async () => { closeSignIn(); await persist(); };
  const fail = (e) => { $('si-err').textContent = e.message || 'Sign-in failed. Try again.'; };
  if (api.config.googleClientId) { $('si-google').hidden = false; api.googleButton($('si-google')).then(done, fail); }
  if (api.config.devLogin) {
    $('si-dev').hidden = false;
    $('si-dev').onsubmit = (e) => { e.preventDefault(); api.devLogin($('si-email').value.trim(), ans.name).then(done, fail); };
  }
}
function closeSignIn() { const sheet = $('signin'); sheet.classList.remove('on'); setTimeout(() => { sheet.hidden = true; }, 400); }
$('si-later').addEventListener('click', closeSignIn);
$('signout').addEventListener('click', () => { api.signOut(); location.href = './index.html'; });

// returning user: skip straight to today
(async () => {
  if (!api.apiEnabled || new URLSearchParams(location.search).has('role')) return;
  const me = await api.getMe().catch(() => null);
  if (!me || !me.answers) return;
  ans.name = me.answers.display_name || me.user.name || '';
  ans.role = withArticle(me.answers.role); ans.place = me.answers.place; ans.feel = me.answers.feel;
  document.documentElement.classList.add('back');
  fillHome(); show('home'); $('acct').hidden = false;
})();

function fillHome() {
  const d = new Date();
  $('today').textContent = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const hr = d.getHours(); const part = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  $('hello').textContent = ans.name ? `${part}, ${ans.name}.` : `${part}.`;
  const work = { 'a designer': 'designing', 'a founder': 'your idea', 'a doctor': 'your studies', 'an artist': 'making something', 'an engineer': 'building something' }[ans.role] || 'it';
  $('task').textContent = `Twenty minutes on ${work}. Nothing more.`;
  $('sig').textContent = `— ${ans.name || 'you'}, 2031`;
}
$('seeagain').addEventListener('click', reveal);
let done = false;
$('chk').addEventListener('click', () => {
  done = !done; $('chk').setAttribute('aria-pressed', String(done));
  $('why').textContent = done ? "That's it. That's exactly what I did. See you tomorrow." : "Small, daily, unglamorous. That's how I got here.";
});
$('askf').addEventListener('submit', (e) => {
  e.preventDefault(); const v = $('q').value.trim(); if (!v) return;
  $('youq').textContent = `You asked: "${v}"`;
  $('reply').textContent = `"Pick the option you'd be proud of a year from now. I usually did. And on the days I didn't, I forgave myself and went again."`;
  $('rb').classList.add('on'); $('q').value = '';
});
