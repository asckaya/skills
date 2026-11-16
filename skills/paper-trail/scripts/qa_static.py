#!/usr/bin/env python3
"""qa_static.py - static self-check for a paper walkthrough page.

Usage:
    python3 qa_static.py html/flow_cps/index.html
    python3 qa_static.py html/flow_cps/index.html --strict   # warnings fail too

Checks
  E1  head essentials (charset / viewport / lang / title)
  E2  tag balance (including svg children)
  E3  duplicate ids / anchors pointing nowhere
  E4  missing <img> files
  E5  unreferenced assets under figs/
  E6  equation numbering (duplicates = error, order/gaps = warning)
  E7  forbidden patterns (scrollIntoView / stacked .frac / U+2016 / side-bar asides)
  E8  figure captions without a source label
  E9  tables without a .tbl-cap source line
  E10 cross-references ("see section 5.2") pointing at missing headings
  E11 portability: absolute paths / localhost / remote CDN in href|src
  W1  missing space between CJK and Latin (info only)
"""
import sys, os, re, json
from html.parser import HTMLParser

VOID = {"meta","link","br","img","hr","input","source","area","base","col","embed",
        "param","track","wbr","path","circle","line","rect","polyline","polygon","ellipse","stop","use"}
SVG_OK = {"svg","g","text","tspan","defs","marker","clippath","lineargradient","radialgradient"}

class Balance(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.errors = [], []
    def handle_starttag(self, tag, attrs):
        if tag in VOID: return
        self.stack.append((tag, self.getpos()))
    def handle_startendtag(self, tag, attrs): pass
    def handle_endtag(self, tag):
        if tag in VOID: return
        if not self.stack:
            self.errors.append(f"stray </{tag}> @ {self.getpos()}")
            return
        if self.stack[-1][0] == tag:
            self.stack.pop()
        else:
            self.errors.append(f"</{tag}> does not match <{self.stack[-1][0]}> @ {self.getpos()}")
            self.stack.pop()

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    path = sys.argv[1]
    strict = "--strict" in sys.argv
    html = open(path, encoding="utf-8").read()
    root = os.path.dirname(os.path.abspath(path))
    errs, warns = [], []

    # E1 head
    for pat, msg in [(r"<meta charset", "missing <meta charset>"),
                     (r'name="viewport"', "missing viewport"),
                     (r'<html lang="', "missing <html lang>"),
                     (r"<title>.+?</title>", "missing <title>")]:
        if not re.search(pat, html, re.S):
            errs.append("E1 " + msg)

    # E2 balance
    b = Balance(); b.feed(html)
    for t, pos in b.stack:
        errs.append(f"E2 unclosed <{t}> @ {pos}")
    errs += ["E2 " + e for e in b.errors[:10]]

    # E3 ids / anchors
    ids = re.findall(r'id="([^"]+)"', html)
    dup = {i for i in ids if ids.count(i) > 1}
    for d in dup:
        errs.append(f'E3 duplicate id: {d}')
    for h in set(re.findall(r'href="#([^"]+)"', html)):
        if h and h not in ids:
            errs.append(f"E3 anchor targets missing id: #{h}")

    # E4 images
    for src in re.findall(r'<img[^>]+src="([^"]+)"', html):
        if src.startswith(("http", "data:")): continue
        p = os.path.normpath(os.path.join(root, src))
        if not os.path.exists(p):
            errs.append(f"E4 missing image: {src}")

    # E5 dead assets
    figs = os.path.join(root, "figs")
    if os.path.isdir(figs):
        used = {os.path.basename(s) for s in re.findall(r'<img[^>]+src="([^"]+)"', html)}
        for f in sorted(os.listdir(figs)):
            if f.startswith('.'): continue
            if f not in used:
                warns.append(f"E5 unreferenced asset: figs/{f}")

    # E6 equation numbers
    nums = [int(n) for n in re.findall(r'class="eqno">\((\d+)\)', html)]
    if nums:
        seen = set()
        for n in nums:
            if n in seen:
                errs.append(f"E6 duplicate equation number: ({n})")
            seen.add(n)
        if nums != sorted(nums):
            warns.append("E6 equation numbers appear out of order (normal when a page cites forward)")
        gaps = sorted(set(range(1, max(nums) + 1)) - seen)
        if gaps:
            warns.append(f"E6 equation numbers not shown on page: {gaps[:8]} (ignore if appendix formulas were skipped on purpose)")

    # E7 forbidden patterns: strip <code>/<pre> first so documentation mentions are not flagged
    scan = re.sub(r"<code>.*?</code>", "", html, flags=re.S)
    scan = re.sub(r"<pre>.*?</pre>", "", scan, flags=re.S)
    if "scrollIntoView" in scan:
        errs.append("E7 scrollIntoView found (makes the wheel scroll bounce back); move nav.scrollTop instead")
    if re.search(r'class="frac"', scan):
        errs.append("E7 stacked fraction class=\"frac\" found; use the flat .fr form")
    for ch, name in [("\u2016", "U+2016 ‖"), ("\u2225", "U+2225 ∥")]:
        if ch in scan:
            errs.append(f"E7 {name} found (missing glyph in CJK fonts); use ASCII ||")
    if re.search(r'border-left:\s*3px solid', scan):
        warns.append("E7 leftover border-left 3px (old side-bar aside)")

    # E8 figure captions need a source marker
    for m in re.finditer(r"<figcaption>(.{0,400}?)</figcaption>", html, re.S):
        c = m.group(1)
        if not re.search(r"(Fig\.|Figure|Table|\u672c\u6587\u63a8\u7b97|\u672c\u9875\u7ed8\u5236|\u672c\u9875\u6574\u7406|\u539f\u6587|§)", c):
            warns.append("E8 figure caption has no source label: " + re.sub(r"<[^>]+>", "", c)[:40])

    # E9 tables need a caption line
    for m in re.finditer(r"<table", html):
        tail = html[max(0, m.start() - 400): m.start() + 3200]
        if "tbl-cap" not in tail:
            warns.append("E9 table without .tbl-cap source line @ char %d" % m.start())

    # E10 section cross refs
    have = set(re.findall(r'<h2 id="[^"]*"><span class="sn">(\d+)</span>', html))
    have |= set(re.findall(r'<h3 id="[^"]*"><span class="sn">(\d+\.\d+)</span>', html))
    for ref in set(re.findall(r"(?:see|\u89c1)\s*<b>?(\d+(?:\.\d+)?)\s*(?:\u8282|\u7ae0)", html)):
        if ref not in have and "." not in ref:
            warns.append(f"E10 cross-reference to missing section: {ref}")
        elif ref not in have:
            warns.append(f"E10 cross-reference to missing section: {ref}")

    # E11 portability: a page must open anywhere, so no absolute paths, no CDN
    for m in re.finditer(r'(?:src|href)="([^"]+)"', html):
        u = m.group(1)
        if u.startswith(("#", "mailto:")):
            continue
        if re.search(r"^(/Users/|/home/|/var/|/opt/|[A-Za-z]:\\\\|file://)", u):
            errs.append(f"E11 absolute path in href/src (not shareable): {u}")
        elif re.search(r"^https?://(localhost|127\\.0\\.0\\.1)", u):
            errs.append(f"E11 localhost URL in href/src: {u}")
        elif re.search(r"^https?://", u) and re.search(r"<link|<script|<img", html[max(0, m.start()-160):m.start()]):
            warns.append(f"E11 remote resource (page must work offline): {u}")

    # W1 CJK/latin spacing
    miss = re.findall(r"[\u4e00-\u9fff][A-Za-z0-9]", html)
    if len(miss) > 8:
        warns.append(f"W1 about {len(miss)} places missing a space between CJK and Latin (e.g. {''.join(miss[:5])})")

    # report
    pages = len(re.findall(r"<h2", html))
    print(f"\n{'='*58}\n{path}\n  h2={pages}  h3={len(re.findall('<h3', html))}  "
          f"table={len(re.findall('<table', html))}  eq={len(nums)}  "
          f"img={len(re.findall('<img', html))}  KB={len(html.encode())//1024}")
    print(f"{'='*58}")
    if errs:
        print(f"\n✗ ERROR ({len(errs)})")
        for e in errs[:30]: print("  " + e)
    if warns:
        print(f"\n! WARN ({len(warns)})")
        for w in warns[:20]: print("  " + w)
    ok = not errs and (not strict or not warns)
    print("\n" + ("✓ PASS" if ok else "✗ FAIL") + "\n")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
