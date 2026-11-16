---
name: paper-trail
description: Turn an arXiv paper into a single-page HTML walkthrough — fetch the LaTeX source, render its figures, write the page, run the QA gates. Use when the user gives an arXiv link or PDF and asks to "walk me through this paper", "write a detailed HTML", or "make a walkthrough page", or asks to revise an existing page.
---

# paper-trail

Production line for paper walkthrough pages in `~/paper`.

Page language follows the user. This skill document, script output and code comments are English.

## Read these three first

| Path | What it is |
| --- | --- |
| `html/README.md` | directory conventions, topic index |
| `<skill-dir>/src/style.css` | the only style source (Tailwind v4) |
| `html/style-guide.html` | living style guide — every component, rendered |

## 1. Layout

```
html/
  assets/style.css        compiled output, the only stylesheet pages load
  assets/app.js           progress bar / TOC highlight / lightbox / back-to-top
  assets/widgets.js       interactive widgets (Custom Elements, classic script)
  assets/math.js          KaTeX renderer for .tex spans
  assets/vendor/traj3d.js three.js bundle, lazy-loaded on click
  assets/vendor/katex/    KaTeX runtime + fonts (vendored by setup.sh)
  style-guide.html        style guide
  (sources live in this skill: src/, runtime/)
  <slug>/index.html       one paper, one page
  <slug>/figs/*.png       figures lifted from the paper
  <slug>/notes.md         optional markdown pass
  <slug>/README.md        figure map, provenance
```

Page head/tail:

```html
<link rel="stylesheet" href="../assets/style.css">
...
<script src="../assets/app.js"></script>
<script defer src="../assets/widgets.js"></script>   <!-- classic script, NOT type="module" -->
```

## 2. Workflow

### Step 0 — settle three things (once per project)

| What | Default | Override |
| --- | --- | --- |
| page output dir | `./papers/<slug>/` | `PAPER_TRAIL_OUT` |
| TeX workspace (scratch) | `./.paper-trail/src/` (add to `.gitignore`) | `PAPER_TRAIL_HOME` |
| page language | the language the user wrote in | ask once if unclear |

### Step 1 — get the source, not the PDF

```bash
CACHE=${PAPER_TRAIL_HOME:-./.paper-trail/src}   # scratch space, gitignored
mkdir -p "$CACHE" && cd "$CACHE"
curl -sL --retry 3 -o <arxiv_id>.tar.gz "https://arxiv.org/src/<arxiv_id>"
mkdir -p <arxiv_id> && tar -xzf <arxiv_id>.tar.gz -C <arxiv_id>
ls <arxiv_id>            # find entry: main.tex / paper.tex / *_conference.tex
```

Also grab the abstract page to judge relevance before investing.

### Step 2 — read the TeX

- Entry file is usually 500–1000 lines: read in chunks with `sed -n 'a,bp'`.
- **Record equation numbers**: count `equation` / `align` environments in source order (`\notag` does not consume a number). Every equation number quoted in the page must match the paper.
- **Record figure/table numbers**: `figure` / `table` environment order == Figure/Table number.
- Content inside `\begin{comment}` is **not in the PDF**. You may use it, but say so explicitly ("commented out in source").

### Step 3 — figures come from the paper

```bash
bash .agents/skills/paper-trail/scripts/build_figs.sh \
  "${PAPER_TRAIL_HOME:-./.paper-trail/src}/<id>" <out>/<slug>/figs
```

- Paper figures first. Self-drawn diagrams must be labelled `本页绘制`.
- Name files `figNN_slug.png` where NN matches the paper's Figure number.
- Delete unreferenced assets (QA reports dead files).

### Step 4 — notes first (optional)

A markdown pass first makes the page faster to write, but it is not mandatory.

- **Location**: put it next to the page (`<out>/<slug>/notes.md`), not in a separate
  tree — one folder per paper is easier to move, delete or publish.
- Skip it entirely when the user only wants the HTML.

### Step 5 — scaffold the page

```bash
bash .agents/skills/paper-trail/scripts/scaffold.sh attention_is_all_your_need "Attention Is All You Need"
```

Creates `<out>/<slug>/index.html` skeleton + README stub. Fill it per §3.

### Step 6 — QA, two gates

```bash
python3 .agents/skills/paper-trail/scripts/qa_static.py <out>/<slug>/index.html
```

Static: tag balance, anchors, missing images, equation numbering, forbidden patterns,
source labels, cross-section references.

Dynamic: open the page with `launch_browser`, then paste `scripts/qa_browser.js` into
`evaluate_browser`. Every key must be `true`:

- `noOverflowX` — no horizontal overflow
- `figsLoaded` — every `<img>` actually loaded
- `scrollStable` — programmatic scroll is not yanked back (regression guard for `scrollIntoView`)
- `tocActive` — TOC highlight follows scroll
- `cssLoaded` — stylesheet applied

### Step 7 — update indexes

- add a row to the topic table in `html/README.md`
- fill `<topic>/README.md`: one-line topic, file list, figure-number map, how it was made

## 3. Content contract

Nine blocks, in this order. Skipping one needs a reason.

1. **Reading map** — what each paper section answers + how this page treats it
2. **One-line conclusion + KPI strip** — 4–6 numbers, each with a source
3. **Problem** — why it is hard; spell out premises the authors leave implicit
4. **Method** — take formulas apart; **fill in derivations the paper skips**
5. **Theorem/mechanism** — what depends on what, when it breaks
6. **Experiments** — copy the tables, then say what the table does and does not prove
7. **Insights and critique** — at least five numbered objections
8. **Reproduction notes** — pseudo-code, traps, hyperparameter cheat sheet
9. **Glossary and index** — terms, equation index, figure index

### Writing rules

- Keep paper terminology in English; write the prose in the user's language.
- **Quote the original** when a claim needs precision. Use `.quote`: short English excerpt +
  source, then your own reading of it outside the block. One to three sentences, not a page.
- **Every number carries a source**: `<span class="src">Table 2</span>` or
  `<span class="src own">本文推算</span>`. Derived numbers must show the formula.
- **Critique must be honest** — write what you would put in a review, not "future work".
- Close each major section with `.takeaway`.

## 4. Visual rules

- Asides are **tinted blocks** (soft fill + hairline ring + coloured caption): `.note` `.det`
  `.warn` `.crit`. No left colour bar, no heavy border.
- Formulas and quotations are **unboxed**: `.eqb` (whitespace + equation number) and `.quote`
  (hairlines + italic-free body).
- Tables: rules only, no outer box, `.tbl-cap` source line under every table.
- Figures: no frame; caption states the point, not "Figure 3 shows…".
- Display type is the system sans. Serif is reserved for math (`.eqb`, `.eqn`).

## 5. Widgets

| Widget | Purpose | Usage |
| --- | --- | --- |
| `<cps-budget>` | noise budget split / η semantics | `<cps-budget eta="0.7">` |
| `<cps-noise>` | ideal vs actual noise level curve | `<cps-noise n="4" eta="0.9" mode="dance">` |
| `<ui-tabs>` | side-by-side comparison | `<ui-tabs><section data-tab="…">…</section></ui-tabs>` |
| `<cps-traj>` | 3D trajectory sandbox (three.js, lazy) | `<cps-traj height="430">` |

Rules: one widget per comprehension bottleneck; a `.small` line next to it saying what to drag
and what to look at; page stays readable with JS disabled; new widgets go into `widgets.js`
first, then into `style-guide.html` as a live sample.

## 6. Equations: write LaTeX

Equations are authored **in LaTeX**, not in HTML. KaTeX renders them on load.

```html
<!-- display -->
<div class="eqb"><span class="eqno">(13)</span><span class="tex" data-display="1">x_{t-\Delta t} = [1-(t-\Delta t)]\hat x_0 + \cdots</span></div>

<!-- inline -->
<span class="tex">\sigma_t = \eta\sqrt{t/(1-t)}</span>
```

Rules:
- Escape `&` as `&amp;` and `<` as `&lt;`; KaTeX sees the decoded text.
- Multi-line: `\begin{aligned} … \end{aligned}`, rows split by `\\`, align with `&`.
- Real fractions are `\frac{a}{b}` — never `a/b`.
- `\operatorname{std}`, `\mathrm{KL}`, `\text{…}` work; `throwOnError:false` shows a typo in red
  instead of breaking the page. Verify with `document.querySelectorAll('.katex-error').length === 0`.
- Nomenclature matches the paper: `\hat x_0`, `\bar\alpha_t`, `\sigma_t^2`, `\varepsilon`.

## 7. Build

Generated assets live in `html/assets/`; sources live in this skill.

```bash
bash <skill-dir>/scripts/setup.sh          # PAPER_HTML=/your/site to override ./html
```

Picks `bun` or `npm`, then produces `style.css`, `vendor/traj3d.js`, `vendor/katex/`.
`package.json` lists the deps (tailwind v4 + cli, three, katex, esbuild). Run it only after
editing `src/style.css`, `src/traj3d.js`, or bumping a dependency.

## 8. Portability

The published pages are plain static HTML with **relative paths only** — no absolute
filesystem paths, no localhost, no CDN. Copy `html/` anywhere (any OS, any browser,
`file://` or a static server) and they render. `qa_static.py` check `E11` enforces this.

What each piece needs:

| Piece | Requirement | Notes |
| --- | --- | --- |
| `html/*.html` + `assets/` | a browser | nothing else; JS is classic scripts, CSS is local |
| `scripts/qa_static.py` | python3 (3.8+) | stdlib only |
| `scripts/build_figs.sh` | bash, poppler (`pdftoppm`), ImageMagick (`magick` or `convert` 6) | Windows: run under Git Bash or WSL |
| `scripts/scaffold.sh` | bash | Windows: Git Bash or WSL |
| `scripts/setup.sh` | bun **or** npm + node | dev-only; produces `assets/style.css` + `vendor/*` |
| TeX workspace | inside the project | `./.paper-trail/src` (gitignored), override with `PAPER_TRAIL_HOME` |

Fonts degrade gracefully: the sans stack lists macOS, Windows and Linux CJK faces in
that order; math falls back from Latin Modern to Cambria Math / STIX / DejaVu Serif.

## 9. Known traps

| Symptom | Cause | Fix |
| --- | --- | --- |
| wheel scroll bounces back | TOC highlight used `scrollIntoView` | move `nav.scrollTop` only (`app.js`) |
| formulas look like plain text | hand-written HTML math (upright variables) | author LaTeX in `.tex`; KaTeX renders it |
| norm renders as `≡` | U+2016 has no glyph in CJK fonts | ASCII `||` |
| table highlight inverted | `.best` used on the worst row | use `tr.wrow` |
| figure numbers drift | source order not counted | count environments, keep a map in README |
| Tailwind wrecks prose | preflight imported | only `theme.css` + `utilities.css` |
| `bun install` cert error | corporate CA missing from Node store | `NODE_EXTRA_CA_CERTS=~/.cache/ca/system.pem` |
| widgets dead over `file://` | `<script type="module">` blocked by CORS | classic script + IIFE bundle |
| `window.TRAJ3D` undefined | `--global-name` ignored for ESM entry | assign `globalThis.TRAJ3D` in source |
| 3D button dead after one failure | failed `<script>` node kept in DOM | remove node on error, retry button |

## 10. Ship checklist

- [ ] `qa_static.py` reports no ERROR
- [ ] `qa_browser.js` all green
- [ ] every figure/table has a source; every derived number has a formula
- [ ] equation numbers match the TeX; "see §5.2" references resolve
- [ ] critique section exists and lands on concrete numbers
- [ ] `html/README.md` and `<topic>/README.md` updated
- [ ] reopen the page offline (`file://`) and check figures, math, widgets
