/* ===========================================================
   traj3d.js · three.js 轨迹沙盘
   用论文的离散更新式，在「完美速度场」假设下模拟三条采样轨迹：
     ODE  ：x ← x − v·Δt
     CPS  ：x ← (1−A)x̂₀ + A·cos(ηπ/2)x̂₁ + A·sin(ηπ/2)ε
     SDE  ：x ← (1−A)x̂₀ + (A − σ²Δt/2t)x̂₁ + σ√Δt·ε      （Dance，σ=η）
   三维坐标：X = 时间（t:1→0），Y/Z = 数据空间两维
   打包产物：html/assets/vendor/traj3d.js（three.js 已内联，运行时零网络）
   =========================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const BG = 0xfbfcfe, C_ODE = 0x8b93a0, C_CPS = 0x0b7a4b, C_SDE = 0xb4352a;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rng) {
  const u = Math.max(rng(), 1e-9), v = rng();
  const r = Math.sqrt(-2 * Math.log(u));
  return [r * Math.cos(2 * Math.PI * v), r * Math.sin(2 * Math.PI * v)];
}

/** 完美速度场：v = x₁ − x₀ 恒定，模型零误差 —— 这样剩下的偏差全部来自「系数记账」 */
function simulate({ n = 8, eta = 0.7, seed = 7 }) {
  const dt = 1 / n, rng = mulberry32(seed);
  const x0 = [0, 0];
  const ang = 1.05;
  const x1 = [Math.cos(ang), Math.sin(ang)];
  const v = [x1[0] - x0[0], x1[1] - x0[1]];
  const c = Math.cos((eta * Math.PI) / 2), s = Math.sin((eta * Math.PI) / 2);

  const run = (kind) => {
    let p = [...x1];
    const pts = [[1, p[0], p[1]]];
    let lastInject = 0;
    for (let i = 0; i < n; i++) {
      const t = 1 - i * dt, A = t - dt;
      const x0h = [p[0] - t * v[0], p[1] - t * v[1]];
      const x1h = [p[0] + (1 - t) * v[0], p[1] + (1 - t) * v[1]];
      let q;
      if (kind === 'ode') {
        q = [p[0] - v[0] * dt, p[1] - v[1] * dt];
      } else if (kind === 'cps') {
        const e = gauss(rng);
        q = [0, 1].map((k) => (1 - A) * x0h[k] + A * c * x1h[k] + A * s * e[k]);
      } else {
        const coef = A - (eta * eta * dt) / (2 * Math.max(t, 1e-6));
        const e = gauss(rng);
        q = [0, 1].map((k) => (1 - A) * x0h[k] + coef * x1h[k] + eta * Math.sqrt(dt) * e[k]);
      }
      if (i === n - 1) {
        lastInject = kind === 'cps' ? 0 : Math.hypot(q[0] - ((1 - A) * x0h[0] + (A - (eta * eta * dt) / (2 * Math.max(t, 1e-6))) * x1h[0]),
                                                     q[1] - ((1 - A) * x0h[1] + (A - (eta * eta * dt) / (2 * Math.max(t, 1e-6))) * x1h[1]));
        if (kind === 'ode') lastInject = 0;
      }
      p = q;
      pts.push([t, p[0], p[1]]);
    }
    return { pts, end: p, lastInject };
  };

  return { ode: run('ode'), cps: run('cps'), sde: run('sde'), x0, x1 };
}

const toVec3 = ([t, x, y]) => new THREE.Vector3((1 - t) * 2.4 - 1.2, y * 1.3, -x * 1.3);

export function mount(host) {
  const W = host.clientWidth || 640;
  const H = host.clientHeight || 420;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);

  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
  camera.position.set(2.5, 2.0, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W, H);
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.3, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3e9, 1.1));

  // 时间轴
  const axisMat = new THREE.LineBasicMaterial({ color: 0xd7dbe2 });
  const axisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.3, 0, 0), new THREE.Vector3(1.35, 0, 0),
  ]);
  scene.add(new THREE.Line(axisGeo, axisMat));

  const group = new THREE.Group();
  scene.add(group);

  let info = null;

  function clear() {
    group.clear();
    BGPool.forEach((d) => d.geometry.dispose());
    BGPool.length = 0;
  }
  const BGPool = [];

  function line(pts, color, width = 2) {
    const g = new THREE.BufferGeometry().setFromPoints(pts.map(toVec3));
    BGPool.push(g);
    const m = new THREE.LineBasicMaterial({ color, linewidth: width });
    const l = new THREE.Line(g, m);
    group.add(l);
    return l;
  }

  function dot(v, color, r = 0.055) {
    const g = new THREE.SphereGeometry(r, 16, 16);
    BGPool.push(g);
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    const s = new THREE.Mesh(g, m);
    s.position.copy(v);
    group.add(s);
  }

  function render(cfg) {
    clear();
    const sim = simulate(cfg);
    line(sim.ode.pts, C_ODE);
    line(sim.cps.pts, C_CPS);
    line(sim.sde.pts, C_SDE);

    dot(toVec3(sim.ode.pts[0]), 0x5f6673, 0.05);              // 起点（噪声）
    dot(toVec3([0, sim.x0[0], sim.x0[1]]), 0x14171c, 0.06);   // 终点（数据）

    const dCps = Math.hypot(sim.cps.end[0] - sim.x0[0], sim.cps.end[1] - sim.x0[1]);
    const dSde = Math.hypot(sim.sde.end[0] - sim.x0[0], sim.sde.end[1] - sim.x0[1]);
    if (info) {
      info.innerHTML =
        `步数 <b>${cfg.n}</b> · η <b>${cfg.eta.toFixed(2)}</b><br>` +
        `<span style="color:#5f6673">最后一步注入噪声</span>　CPS <b style="color:#0b7a4b">${sim.cps.lastInject.toFixed(3)}</b>　SDE <b style="color:#b4352a">${sim.sde.lastInject.toFixed(3)}</b><br>` +
        `<span style="color:#8b93a0">终点偏离 x₀（含各自探索噪声）</span>　CPS ${dCps.toFixed(2)}　SDE ${dSde.toFixed(2)}`;
    }
    renderer.render(scene, camera);
  }

  const ui = document.createElement('div');
  ui.className = 'traj-ui';
  ui.innerHTML = `
    <div class="traj-ctrl">
      <label>步数 <select data-n>${[4, 6, 8, 12, 16].map((v) => `<option value="${v}"${v === 8 ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>η <input data-eta type="range" min="0.1" max="1" step="0.05" value="0.7"><span data-v>0.70</span></label>
    </div>
    <div class="traj-key">
      <span><i style="background:#8b93a0"></i>ODE</span>
      <span><i style="background:#0b7a4b"></i>Flow-CPS</span>
      <span><i style="background:#b4352a"></i>Flow-SDE</span>
    </div>
    <div class="traj-info"></div>`;
  host.appendChild(ui);
  info = ui.querySelector('.traj-info');

  const state = { n: 8, eta: 0.7 };
  render(state);

  ui.querySelector('[data-n]').addEventListener('change', (e) => {
    state.n = +e.target.value;
    render(state);
  });
  ui.querySelector('[data-eta]').addEventListener('input', (e) => {
    state.eta = +e.target.value;
    ui.querySelector('[data-v]').textContent = state.eta.toFixed(2);
    render(state);
  });

  let dragging = false;
  controls.addEventListener('start', () => { dragging = true; });
  controls.addEventListener('end', () => { dragging = false; });

  (function loop() {
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();

  const onResize = () => {
    const w = host.clientWidth || W, h = host.clientHeight || H;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  addEventListener('resize', onResize);

  return { dispose() { removeEventListener('resize', onResize); renderer.dispose(); } };
}

/* 经典脚本入口：<script> 加载后通过 window.TRAJ3D.mount(host) 使用
   （file:// 下 ES module 会被 CORS 拦掉，所以不能只提供 export） */
if (typeof globalThis !== 'undefined') globalThis.TRAJ3D = { mount };
