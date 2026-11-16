#!/usr/bin/env bash
# Scaffold a new topic page (needs bash; on Windows use Git Bash or WSL)
# usage: scaffold.sh <slug> "<page title>"
set -euo pipefail
SLUG=${1:?usage: scaffold.sh <slug> "<标题>"}
TITLE=${2:-"$SLUG"}
ROOT=$(cd "$(dirname "$0")/../../../../" && pwd)     # repo root
DIR="$ROOT/html/$SLUG"
[ -e "$DIR" ] && { echo "already exists: $DIR"; exit 1; }
mkdir -p "$DIR/figs"

NAME=$(echo "$SLUG" | sed 's/_/ /g')
cat > "$DIR/index.html" <<HTML
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<div id="prog"></div>
<div id="lb"><img alt=""></div>
<div id="totop" title="回到顶部">↑</div>

<div class="wrap">
<nav class="toc">
  <div class="grp">概览</div>
  <a href="#s0">0　阅读地图</a>
  <a href="#s1">1　一句话结论</a>
  <div class="grp">正文</div>
  <a href="#s2">2　问题</a>
  <a href="#s3">3　方法</a>
  <a href="#s4">4　实验</a>
  <div class="grp">评价</div>
  <a href="#s5">5　洞察与批判</a>
  <a href="#s6">6　复现要点</a>
</nav>

<main>
<header class="top">
  <div class="kicker">Paper Walkthrough · arXiv xxxx.xxxxx</div>
  <h1>${TITLE}</h1>
  <div class="zh">副标题：一句话说这篇论文在干什么</div>
  <div class="au">作者 · 机构　|　arXiv:xxxx.xxxxx</div>
  <div class="srcbox"><b>本页怎么写的</b>：基于 arXiv <code>/src/</code> 的 LaTeX 源码逐节阅读。凡标注「本文推算」的数字由本页自行计算。</div>
</header>

<h2 id="s0"><span class="sn">0</span>阅读地图<span class="pg">整篇</span></h2>
<p class="sub">……</p>

<h2 id="s1"><span class="sn">1</span>一句话结论<span class="pg">Abstract</span></h2>
<div class="kpis">
  <div class="kpi acc"><div class="v">0.00</div><div class="k">关键数字（标注出处）</div></div>
</div>

<h2 id="s2"><span class="sn">2</span>问题<span class="pg">§1–2</span></h2>
<p>……</p>

<h2 id="s3"><span class="sn">3</span>方法<span class="pg">§3–4</span></h2>
<div class="eqb"><span class="eqno">(1)</span>……</div>

<h2 id="s4"><span class="sn">4</span>实验<span class="pg">§5</span></h2>
<div class="tw">
<table><thead><tr><th>方法</th><th class="num">分数</th></tr></thead>
<tbody><tr><td>baseline</td><td class="num">0.00</td></tr></tbody></table>
</div>
<p class="tbl-cap"><span class="src">Table 1</span>……</p>

<h2 id="s5"><span class="sn">5</span>洞察与批判<span class="pg">全篇</span></h2>
<p>……</p>

<h2 id="s6"><span class="sn">6</span>复现要点<span class="pg">附</span></h2>
<p>……</p>

<footer><p>素材来源与生成方式写这里。</p></footer>
</main>
</div>
<script src="../assets/app.js"></script>
<script defer src="../assets/widgets.js"></script>
</body>
</html>
HTML

cat > "$DIR/README.md" <<MD
# ${SLUG} — ${TITLE}

## 主题

（论文一句话题目 + arXiv 号 + 一句话结论）

## 页面清单

| 文件 | 内容 |
| --- | --- |
| \`index.html\` | 单页讲义 |
| \`figs/\` | 论文原图（\`figNN_slug.png\`，NN 对齐论文 Figure 号） |

## 图号对照

| 文件 | 论文编号 | 主题 |
| --- | --- | --- |
| \`figs/fig01_*.png\` | Figure 1 | …… |

## 生成方式

- 源码：\`${PAPER_CACHE:-$HOME/.cache/paper-tex}/<id>/\`
- 图片：\`build_figs.sh\`（pdftoppm 160 dpi + magick 压缩）
- 自检：\`qa_static.py\` + \`qa_browser.js\`
MD
echo "created $DIR"
echo "next:"
echo "  1) put figures into $DIR/figs/"
echo "  2) fill the content (see html/style-guide.html)"
echo "  3) python3 .agents/skills/paper-trail/scripts/qa_static.py $DIR/index.html"
