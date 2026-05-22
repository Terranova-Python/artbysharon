# Art By Sharon

A simple static website for `artbysharon.art`, built for GitHub Pages.

## Adding Art

1. Put the current weekly PNG in `art/weekly`.
2. Put previous PNGs in `art/gallery`.
3. Put murals, house paintings, painted furniture, and other surface-based art
   in `art/surfaces`.
4. Commit and push.

GitHub Pages will render `art-manifest.json` from those folders during its normal
Jekyll build. There are no npm packages, build tools, or runtime dependencies.

## Local Preview

A plain local server can preview the design and empty states. The automatic art
folder discovery happens during the GitHub Pages Jekyll build, so newly added
images appear after the site is published or after a local Jekyll build.

For a predictable weekly feature, use date-style names like:

```text
2026-05-19-butterfly.png
2026-05-26-sunflowers.png
```

The newest filename in `art/weekly` becomes the featured piece. Everything in
`art/gallery` appears in the main gallery, and everything in `art/surfaces`
appears in the murals and surface-art section.
