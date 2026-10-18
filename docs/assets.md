# Asset sources

The user approved the production image and build plan in conversation before
page assembly: “looks good. let's implement it. i approve it.” The original
cosy-pack composition remains the visual reference. Final assembled-page
verification is recorded separately in the roadmap.

## Fonts

Both font files include Cyrillic and are stored locally for offline builds.
The included SIL Open Font License files must accompany redistribution.
Downloaded 2026-10-18; no runtime Google Fonts requests are needed.

| File | Intended role | Source and license |
| --- | --- | --- |
| [Pliant variable](../assets/fonts/Pliant-Variable.ttf) | Geometric headline and text; headline ranked at weight 700. | [Google Fonts source](https://github.com/google/fonts/tree/647e52b1cbc941916c322994994bbe2e3a08ca6e/ofl/pliant), [included OFL](../assets/fonts/Pliant-OFL.txt). |
| [Unbounded variable](../assets/fonts/Unbounded-Variable.ttf) | Broad Cyrillic wordmark; ranked at weight 700. | [Google Fonts source](https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/unbounded), [included OFL](../assets/fonts/Unbounded-OFL.txt). |

Original downloaded file SHA-256 values:

```text
Pliant-Variable.ttf    11cb215c4380f2e7e4cb40e38cf799cba36faf89dae69a688eb7cca6f30f0915
Unbounded-Variable.ttf 323b511be380c8d474ef030686b71aedde501f8d9cd46da558b7c40454372c3f
```

`Pliant-Variable.woff2` is a local fontTools subset retaining Latin, Cyrillic,
punctuation, and weight axes. `Unbounded-Wordmark.woff2` is a static weight-700
subset for the letters in «КВАРТА»; the wordmark is its only use. Reducing that
download from 180 KB to about 1 KB avoids competing with the hero photograph.
Next.js serves both through `next/font/local`. `Pliant-700.ttf` is a static instance used
only to generate the social card at build time. These conversions retain the
original licenses; no font service is required during build or browsing.

Impeccable measured the original headline and wordmark and generated font
comparison sheets under `.impeccable/build/font-match/`. The final typography
and tokens belong in `docs/DESIGN.md` after implementation and visual review.

## Coffee still life

[Production PNG](../assets/plates/coffee-still-life.png), 1511 × 1041, RGBA with
genuine transparent exterior. Generated using the built-in image tool from a
reference-only crop of the approved original
[cosy-pack.png](../.impeccable/mocks/decision/cosy-pack.png). The production image
is newly generated; the original comp is preserved. This depicts the fictional
brand's illustrative packaging, not verified photography of a real product.

The [exact generation prompt](../.impeccable/planning/prompts/landing-coffee-still-life.txt)
and [provenance sidecar](../assets/plates/coffee-still-life.png.json) record its
origin. The PNG also embeds the prompt. The initial asset check confirmed the
required dimensions, alpha range 0–255, and readable supplied bag text. It does
not replace the later assembled-page visual review.

## Social preview and favicon

`src/app/opengraph-image.tsx` generates a 1200 × 630 PNG from the approved local
coffee plate, local Pliant font, and real HTML text using Next.js ImageResponse.
It adds no new commercial claims. `src/app/icon.svg` is an authored geometric
Cyrillic К on the peach ground. Neither uses an external image host.
