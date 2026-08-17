# Assets

**Purpose:** where diagrams, wireframes and screenshots live, and how they're named.
**Last reviewed:** <!-- DATE -->

---

## Layout

```
assets/
  architecture/   system and component diagrams
  wireframes/     pre-implementation sketches
  screens/        screenshots of the built app
```

## Naming

`vera-<subject>-<variant>.<ext>`, lowercase, hyphens.

```
vera-architecture.drawio        source
vera-architecture.svg           export, committed alongside
vera-layouts-six-sizes.svg
vera-review-page-iphone.png
```

Commit **both the source and the export** for anything editable. A `.drawio` nobody can open in a browser is invisible in a pull request, and an `.svg` with no source can only be replaced, not edited.

## Formats

| Kind | Format | Why |
|---|---|---|
| Diagrams, wireframes | `.drawio` + `.svg` | Editable source, and an export that renders on GitHub and scales in both themes |
| Screenshots | `.png` | Lossless, and screenshots are mostly flat color |
| Photos of real devices | `.jpg` | Compresses far better than PNG on a photograph |

**Check every SVG in both themes** before committing. A diagram with hardcoded black strokes disappears on a dark background, and GitHub renders README images against whichever theme the reader chose.

## Size

Keep any single file under about 1 MB. Above that, downscale before committing — an image is in the repo forever whether or not the doc that referenced it survives.

Current offenders worth attention when the corresponding docs move over:

| File | Size |
|---|---|
| `docs/assets/screens/mobile.png` | 2.1 MB |
| `docs/assets/wireframes/VERA_layouts.svg` | 1.5 MB |
| `docs/assets/architecture/VERA_architecture.svg` | 0.9 MB |

The SVGs are large because draw.io embeds fonts and raster fills on export. Exporting with "embed images" off, or running them through an SVG minifier, usually takes 80% off.

## Referencing

From a doc in `docs/`:

```markdown
![The two layout shapes, at six sizes](assets/wireframes/VERA_layouts.svg)
```

From the root README:

```markdown
![VERA on an iPhone and an iPad](docs/assets/screens/mobile.png)
```

Always write real alt text. "Diagram" is not alt text.
