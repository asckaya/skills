/* ===========================================================
   html/assets/widgets.js · 论文讲义交互组件
   Custom Elements（light DOM），**经典脚本**加载
   —— 不用 <script type="module">：file:// 下模块脚本会被 CORS 拦掉，
      而本仓库要求"双击 index.html 就能读"。
   声明式使用：
     <cps-budget eta="0.7"></cps-budget>
     <cps-noise n="16" eta="0.9" mode="dance"></cps-noise>
     <ui-tabs><section data-tab="标题">…</section></ui-tabs>
   无 JS / JS 报错时：自定义元素不渲染，内嵌的降级内容保持可见
   =========================================================== */

/* 本脚本自身的 URL：经典脚本在"首次执行时" currentScript 有效，
   之后（事件回调里）会变成 null，所以必须在这里抓一次 */
const SELF = (document.currentScript && document.currentScript.src) || location.href;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* 经典 <script> 注入：file:// 下同样可用（ES module 不行）
   注意：失败时必须移除节点，否则下次点击会被"已存在"挡住而永远失败 */
const _scriptCache = new Map();
function loadScript(src) {
  if (_scriptCache.has(src)) return _scriptCache.get(src);
  const p = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => res();
    s.onerror = () => { s.remove(); _scriptCache.delete(src); rej(new Error('无法加载 ' + src)); };
    document.head.appendChild(s);
  });
  _scriptCache.set(src, p);
  return p;
}
const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '∞');

/* ---------- 公式：论文式 (11) 的总噪声水平 ---------- */
function sigmaSDE(A, s, dt) {
  const t = A + dt;
  if (t <= 0) return 0;
  return Math.sqrt(A * A + (s * dt) ** 2 / t + (s * s * dt / (2 * t)) ** 2);
}

/* =========================================================
   1. <cps-budget>  噪声预算分配器（η 的语义）
   ========================================================= */
class CpsBudget extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    this.classList.add('widget');
    this.eta = clamp(parseFloat(this.getAttribute('eta') ?? '0.7'), 0, 1);

    this.innerHTML = `
      <div class="w-head">
        <span class="w-title">噪声预算分配器</span>
        <span class="w-hint">拖动 η，看每步的噪声预算怎么被切分</span>
      </div>
      <div class="w-body">
        <div class="w-fig"></div>
        <div class="w-side">
          <div class="w-ctrl">
            <label for="eta-b">η</label>
            <input id="eta-b" type="range" min="0" max="1" step="0.05" value="${this.eta}">
            <span class="val" data-v>${this.eta.toFixed(2)}</span>
          </div>
          <div class="w-bar">
            <i data-bar="c" style="background:#1f5fa8"></i>
            <i data-bar="s" style="background:#e0a52a"></i>
          </div>
          <div class="w-key">
            <span><i style="background:#1f5fa8"></i>模型预测 x̂₁</span>
            <span><i style="background:#e0a52a"></i>新噪声 ε</span>
          </div>
          <div class="w-read">
            sin(ηπ/2) = <b data-s>0.000</b><br>
            cos(ηπ/2) = <b data-c>0.000</b><br>
            新噪声占预算 <b data-p>0%</b>
          </div>
        </div>
      </div>`;

    this._fig = this.querySelector('.w-fig');
    this.querySelector('#eta-b').addEventListener('input', (e) => {
      this.eta = parseFloat(e.target.value);
      this._draw();
    });
    this._draw();
  }

  _draw() {
    const th = (this.eta * Math.PI) / 2;
    const c = Math.cos(th), s = Math.sin(th);
    const O = { x: 46, y: 186 }, R = 250;
    const px = O.x + R * c, py = O.y - R * s;

    this._fig.innerHTML = `
      <svg viewBox="0 0 420 220" role="img"
           aria-label="斜边为噪声预算 A 的直角三角形：水平边为 A·cos，竖直边为 A·sin">
        <line x1="${O.x}" y1="${O.y}" x2="${px}" y2="${O.y}" stroke="#1f5fa8" stroke-width="2.4"/>
        <line x1="${px}" y1="${O.y}" x2="${px}" y2="${py}" stroke="#e0a52a" stroke-width="2.4"/>
        <line x1="${O.x}" y1="${O.y}" x2="${px}" y2="${py}" stroke="#8b93a0" stroke-width="1.6" stroke-dasharray="6 4"/>
        <path d="M ${px - 12} ${O.y} L ${px - 12} ${O.y - 12} L ${px} ${O.y - 12}"
              fill="none" stroke="#c9cfd8" stroke-width="1.2"/>
        <text x="${(O.x + px) / 2}" y="${O.y + 20}" text-anchor="middle"
              font-size="12.5" fill="#1f5fa8" font-family="ui-monospace,monospace">A·cos = ${fmt(c)}A</text>
        <text x="${px + 10}" y="${(O.y + py) / 2}" font-size="12.5" fill="#b7871a"
              font-family="ui-monospace,monospace">A·sin = ${fmt(s)}A</text>
        <text x="${(O.x + px) / 2 - 16}" y="${(O.y + py) / 2 - 12}" font-size="12.5" fill="#5f6673"
              font-family="ui-monospace,monospace">A（scheduler 规定的噪声预算）</text>
        <circle cx="${O.x}" cy="${O.y}" r="3" fill="#5f6673"/>
        <path d="M ${O.x + 34} ${O.y} A 34 34 0 0 0 ${O.x + 34 * c} ${O.y - 34 * s}"
              fill="none" stroke="#c9cfd8" stroke-width="1.2"/>
        <text x="${O.x + 40}" y="${O.y - 8}" font-size="11.5" fill="#8b93a0">ηπ/2</text>
      </svg>`;

    this.querySelector('[data-v]').textContent = this.eta.toFixed(2);
    this.querySelector('[data-s]').textContent = fmt(s, 3);
    this.querySelector('[data-c]').textContent = fmt(c, 3);
    this.querySelector('[data-p]').textContent = Math.round(s * 100) + '%';
    this.querySelector('[data-bar="c"]').style.width = c * 100 + '%';
    this.querySelector('[data-bar="s"]').style.width = s * 100 + '%';
  }
}
customElements.define('cps-budget', CpsBudget);

/* =========================================================
   2. <cps-noise>  噪声水平账本：理想 vs SDE vs CPS
   ========================================================= */
class CpsNoise extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    this.classList.add('widget');
    this.n = parseInt(this.getAttribute('n') ?? '16', 10);
    this.eta = clamp(parseFloat(this.getAttribute('eta') ?? '0.9'), 0, 1);
    this.mode = this.getAttribute('mode') ?? 'dance';

    this.innerHTML = `
      <div class="w-head">
        <span class="w-title">噪声水平：理想 / Flow-SDE / Flow-CPS</span>
        <span class="w-hint">按论文式 (11) 实时计算</span>
      </div>
      <div class="w-body">
        <div class="w-fig"></div>
        <div class="w-side">
          <div class="w-ctrl">
            <label>步数</label>
            <select data-n>
              ${[4, 6, 10, 16, 28, 1000].map((v) => `<option value="${v}"${v === this.n ? ' selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="w-ctrl">
            <label>方法</label>
            <select data-mode>
              <option value="dance"${this.mode === 'dance' ? ' selected' : ''}>Dance（σ=η）</option>
              <option value="flow"${this.mode === 'flow' ? ' selected' : ''}>Flow-GRPO（σ=η√(t/(1−t))）</option>
            </select>
          </div>
          <div class="w-ctrl">
            <label>η</label>
            <input data-eta type="range" min="0.1" max="1" step="0.05" value="${this.eta}">
            <span class="val" data-v>${this.eta.toFixed(2)}</span>
          </div>
          <div class="w-read">
            t=0.5 处相对误差 <b data-e05>–</b><br>
            最后一步注入噪声 <b data-last>–</b><br>
            <span data-verdict></span>
          </div>
        </div>
      </div>`;

    this._fig = this.querySelector('.w-fig');
    this.querySelector('[data-n]').addEventListener('change', (e) => { this.n = +e.target.value; this._draw(); });
    this.querySelector('[data-mode]').addEventListener('change', (e) => { this.mode = e.target.value; this._draw(); });
    this.querySelector('[data-eta]').addEventListener('input', (e) => { this.eta = +e.target.value; this._draw(); });
    this._draw();
  }

  _series() {
    const dt = 1 / this.n, out = [];
    for (let i = 0; i < this.n; i++) {
      const t = 1 - i * dt, A = t - dt;
      let s;
      if (this.mode === 'dance') s = this.eta;
      else s = this.eta * Math.sqrt(Math.max(t, 1e-6) / Math.max(1e-6, 1 - Math.min(t, 1 - 1e-6)));
      out.push({ t, A, s: Math.min(s, 40), total: A > 0 ? sigmaSDE(A, Math.min(s, 40), dt) : sigmaSDE(0, Math.min(s, 40), dt) });
    }
    return out;
  }

  _draw() {
    const data = this._series();
    const n = this.n;
    const dt = 1 / n;

    // 采样点用于读数值（t≈0.5 与最后一步）
    const at = (tt) => {
      const A = tt - dt;
      let s = this.mode === 'dance' ? this.eta : this.eta * Math.sqrt(Math.max(tt, 1e-6) / Math.max(1e-6, 1 - Math.min(tt, 1 - 1e-6)));
      s = Math.min(s, 40);
      return { A, total: sigmaSDE(Math.max(A, 0), s, dt) };
    };
    const h = at(0.5), last = data[data.length - 1];
    const err05 = h.A > 0 ? (h.total / h.A - 1) * 100 : Infinity;

    // 坐标：t 从 1 到 0 横轴；噪声水平 0..1.15 纵轴
    const L = 44, R = 440, T = 14, B = 196, YMAX = 1.15;
    const X = (a) => L + (1 - a) * (R - L);   // 横轴 = A（本步结束时的目标噪声水平）
    const Y = (v) => B - (clamp(v, 0, YMAX) / YMAX) * (B - T);
    const path = (key) => data.map((d, i) => `${i ? 'L' : 'M'}${X(d.A).toFixed(1)},${Y(d[key]).toFixed(1)}`).join(' ');

    const grid = [0, 0.25, 0.5, 0.75, 1].map((v) =>
      `<line x1="${L}" y1="${Y(v)}" x2="${R}" y2="${Y(v)}" stroke="#eef0f3"/>
       <text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="10.5" fill="#8b93a0">${v}</text>`).join('');
    const xticks = [[1, 'A=1（开始）'], [0.5, '0.5'], [0, 'A=0（最后一步）']].map(([v, lab]) =>
      `<text x="${X(v)}" y="${B + 16}" text-anchor="middle" font-size="10.5" fill="#8b93a0">${lab}</text>`).join('');

    this._fig.innerHTML = `
      <svg viewBox="0 0 460 226" role="img" aria-label="理想噪声水平与 SDE 实际噪声水平随剩余噪声水平 A 的变化曲线">
        ${grid}${xticks}
        <path d="${path('A')}" fill="none" stroke="#8b93a0" stroke-width="1.6" stroke-dasharray="5 4"/>
        <path d="${path('A')}" fill="none" stroke="#0b7a4b" stroke-width="3" opacity=".35"/>
        <path d="${path('total')}" fill="none" stroke="#b4352a" stroke-width="2"/>
        <text x="${R}" y="${T + 4}" text-anchor="end" font-size="11" fill="#8b93a0">理想 = CPS：总噪声 = t−Δt</text>
        <text x="${R}" y="${T + 20}" text-anchor="end" font-size="11" fill="#b4352a">Flow-SDE 实际总噪声</text>
      </svg>`;

    this.querySelector('[data-v]').textContent = this.eta.toFixed(2);
    const e = this.querySelector('[data-e05]');
    e.textContent = Number.isFinite(err05) ? `${err05 >= 0 ? '+' : ''}${err05.toFixed(1)}%` : '—';
    e.closest('.w-read').querySelectorAll('.bad,.good').forEach((x) => x.classList.remove('bad', 'good'));
    const lastVal = last.total;
    this.querySelector('[data-last]').textContent = fmt(lastVal, 3);
    const v = this.querySelector('[data-verdict]');
    const bad = err05 > 5 || lastVal > 0.05;
    v.className = bad ? 'bad' : 'good';
    v.innerHTML = bad
      ? '尾段仍在注入噪声 → 训练图会脏'
      : '误差可忽略（该配置下）';
  }
}
customElements.define('cps-noise', CpsNoise);

/* =========================================================
   3. <ui-tabs>  纯 CSS+JS 标签页
   ========================================================= */
class UiTabs extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    this.classList.add('widget');
    const panels = [...this.querySelectorAll(':scope > section[data-tab]')];
    if (panels.length < 2) return;

    const bar = document.createElement('div');
    bar.className = 'w-tabbar';
    bar.setAttribute('role', 'tablist');
    panels.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = p.dataset.tab;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === 0));
      b.addEventListener('click', () => select(i));
      bar.appendChild(b);
      p.classList.add('w-panel');
      p.classList.toggle('on', i === 0);
    });
    this.prepend(bar);

    const select = (i) => {
      [...bar.children].forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
      panels.forEach((p, k) => p.classList.toggle('on', k === i));
    };
  }
}
customElements.define('ui-tabs', UiTabs);

/* =========================================================
   4. <cps-traj>  3D 轨迹沙盘（懒加载 three.js 打包产物）
   ========================================================= */
class CpsTraj extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    this.classList.add('widget', 'cps-traj');
    const h = this.getAttribute('height') || '430';
    this.innerHTML = `
      <div class="w-head">
        <span class="w-title">轨迹沙盘：同一条轨迹，三种走法</span>
        <span class="w-hint">拖动旋转 · 滚轮缩放</span>
      </div>
      <div class="traj-host" style="height:${h}px">
        <button class="traj-load" type="button">加载 3D 演示<span>（three.js 已本地打包，约 0.5 MB，只加载一次）</span></button>
      </div>`;
    this.querySelector('.traj-load').addEventListener('click', () => this._load());
  }

  async _load() {
    const host = this.querySelector('.traj-host');
    host.innerHTML = '<div class="traj-loading">加载 three.js…</div>';
    try {
      await loadScript(new URL('./vendor/traj3d.js', SELF).href);
      if (!window.TRAJ3D) throw new Error('TRAJ3D 未就绪');
      host.innerHTML = '';
      window.TRAJ3D.mount(host);
    } catch (err) {
      host.innerHTML =
        `<div class="traj-loading">3D 演示加载失败：${err.message}<br>` +
        `<span style="font-size:11.6px;color:#9aa1ab">文件在本机即可（双击 index.html 也支持）；` +
        `若走 http，请确认 <code>assets/vendor/traj3d.js</code> 可访问</span>` +
        `<br><button type="button" class="traj-retry">重试</button></div>`;
      host.querySelector('.traj-retry')?.addEventListener('click', () => this._load());
    }
  }
}
customElements.define('cps-traj', CpsTraj);
