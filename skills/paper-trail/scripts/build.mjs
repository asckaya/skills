#!/usr/bin/env node
// Build every generated asset. Output root: $PAPER_HTML (default: <cwd>/html)
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skill = resolve(here, '..');
const out = resolve(process.env.PAPER_HTML || join(process.cwd(), 'html'));
const assets = join(out, 'assets');

if (!existsSync(join(skill, 'node_modules'))) {
  console.error('dependencies missing: run scripts/setup.sh (or npm install here) first');
  process.exit(1);
}
mkdirSync(join(assets, 'vendor/katex/fonts'), { recursive: true });

const bin = (name) => join(skill, 'node_modules/.bin', name);
const run = (cmd, args) => { console.log('>', cmd, args.join(' ')); execFileSync(cmd, args, { stdio: 'inherit' }); };

// 1) Tailwind -> assets/style.css
run(bin('tailwindcss'), ['-i', join(skill, 'src/style.css'), '-o', join(assets, 'style.css'), '--minify']);

// 2) three.js demo -> assets/vendor/traj3d.js
run(bin('esbuild'), [join(skill, 'src/traj3d.js'), '--bundle', '--minify', '--format=iife',
  '--target=es2020', `--outfile=${join(assets, 'vendor/traj3d.js')}`]);

// 3) KaTeX runtime + fonts
const dist = join(skill, 'node_modules/katex/dist');
cpSync(join(dist, 'katex.min.js'), join(assets, 'vendor/katex/katex.min.js'));
cpSync(join(dist, 'katex.min.css'), join(assets, 'vendor/katex/katex.min.css'));
cpSync(join(dist, 'fonts'), join(assets, 'vendor/katex/fonts'), { recursive: true });

// 4) runtime scripts that ship with the pages
for (const f of ['app.js', 'widgets.js', 'math.js']) {
  const src = join(skill, 'runtime', f);
  if (existsSync(src)) cpSync(src, join(assets, f));
}

console.log('done ->', assets);
