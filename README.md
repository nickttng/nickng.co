# nickng.co

Nick Ng's personal site. Product design by trade. Interface and context design by principle.

The site is built from small, self-contained entries (things) connected by named relations. It is plain HTML and CSS, served by GitHub Pages.

| Path | Page |
|---|---|
| `/` | Home |
| `/exist` | Things |
| `/exist/<id>` | One thing |
| `/rrelations` | Relations: verbs and connections |
| `/colophon` | How the site is made |

## Preview locally

```sh
python3 -m http.server 4000
```

Then open http://localhost:4000. Pages use root-relative paths, so serve from the repo root rather than opening files directly.

See [ROADMAP.md](ROADMAP.md) for where the site is going.
