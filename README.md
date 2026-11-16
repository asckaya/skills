# skills

Agent skills I use for reading papers and building things around them.
Each directory under `skills/` is a self-contained skill: a `SKILL.md` the agent reads,
plus whatever scripts and sources it needs.

## Install

```bash
# list what is in here
npx skills add asckaya/skills

# install one
npx skills add asckaya/skills@paper-trail
```

Or clone and point your agent at the folder:

```bash
git clone https://github.com/asckaya/skills ~/src/skills
# single skill
cp -R ~/src/skills/skills/paper-trail ~/.agents/skills/
```

## Skills

| Skill | What it does | Needs |
| --- | --- | --- |
| [`paper-trail`](skills/paper-trail/SKILL.md) | arXiv paper → single-page HTML walkthrough: KaTeX math, figures from the LaTeX source, interactive widgets, two QA gates | node + bun/npm, python3, poppler, ImageMagick |

## License

MIT (`LICENSE`).
