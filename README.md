# Sixty-Four Strokes: chess → art

Paste or upload a PGN and turn the game into art in **59 styles**, sorted into **10 numbered groups**. Open `index.html` in a browser; there is no build step and no server.

## How a game becomes a picture

- **The canvas is the board.** White sits at the bottom and Black at the top, and every move travels from its starting square to its landing square.
- **Colour is who moved.** Each side has its own colour family (see `js/palettes.js`), and each piece type has its own colour within it. Heavier pieces make bigger marks, a queen weighing about nine times a pawn. Captures use the captured piece's colour, checks use the accent colour, and checkmate gets a final flourish.
- **Deterministic.** All randomness is seeded by the moves themselves, so a game always paints the same picture in a given style. **Remix** gives another variation.

## Finding styles later

Every style has a fixed code, `group.number`, such as `2.4`.

| You type in the filter | You get |
|---|---|
| `3` | all of group 3 |
| `2.4` | exactly style 2.4 |
| `2.` | every code starting with 2. |
| `oil` | a name, id or group-name match |
| `1.1, 5.3, 9` | any of these (comma or space separated) |

- **Group chips** narrow the gallery to one group, and **★ Favourites** shows only the styles you starred. Star a style with ☆ on its card, or press **F** for the current style. Favourites persist in the browser.
- **Links:** `index.html#7.4` opens straight into style 7.4. The URL updates as you browse.
- **Exports** carry the code in the filename, for example `Morphy-vs-Isouard_2.1-oil_lagoon.pdf`, so saved files can be sorted and filtered the same way.

## Downloads

- **PDF (vector).** The style draws straight into a PDF (`js/pdf.js`, a Canvas-2D-compatible context that writes PDF operators), so it prints sharp at any size. Paths, fills, strokes, transparency, blend modes, clipping and text in the standard PDF fonts stay vector. Gradients, pixel-based styles (Oil, Turing Patterns, Tartan and others) and unusual glyphs are embedded as full-resolution images. Glitch works on raw pixels, so it is exported as one image. The page is 10 inches wide.
- **Video.** Records the painting move by move at the chosen speed, then holds on the final picture: 1080 px MP4, or WebM in browsers without MP4 recording.

The default style is **3.4 Bauhaus Tiles**.
- **Keys:** Space paints · ← → scrub · [ ] previous/next style within the current filter · F favourite · R remix · / focus the filter.

## Catalogue

### 1 · Currents

The whole game becomes one flowing current, drawn in different media.

| Code | Style | What it shows |
|---|---|---|
| `1.1` | **Flow** | Pure line. Particles released along every move trace the current that the whole game creates. White swirls one way, Black the other. |
| `1.2` | **Silk** | Translucent ribbons that taper at both ends and catch a little sheen. They follow the same current as Flow, so the moves fold over one another like fabric. |
| `1.3` | **Pointillist** | The current drawn as dots, Seurat-style. Dots swell in the middle of each stream and shrink toward its ends, with small shifts in tone so the colours shimmer. |
| `1.4` | **Smoke** | Long, slow plumes that drift and thicken into haze the further they travel. On dark palettes it reads as smoke; on light ones, as ink dropped into water. |
| `1.5` | **Wind Map** | The current as a weather map. Streamlines are evenly spaced and taper like arrows pointing downstream. Lines start near each move in its colour, and quiet grey lines fill the calm air. |
| `1.6` | **Brushwork** | Short, thick dabs of paint that follow the current, in the spirit of post-impressionist skies. A quiet ground is laid first, then every move adds a cluster of bright strokes. |

### 2 · Fluid & Paint

Wet media: oil, marbling, watercolour, ink, poured paint and the palette knife.

| Code | Style | What it shows |
|---|---|---|
| `2.1` | **Oil** | Fluid oil paint. Each move lays brushstrokes along the current, and the current keeps stirring the canvas. The opening ends up marbled into long swirls, and the last moves stay as fresh, thick strokes. |
| `2.2` | **Marbling** | Ebru, the Turkish art of paper marbling, done with real marbling maths. Every move drops a ring of colour onto the water and pushes the older rings outward. Long moves drag a comb through the paint, and knights stir it into swirls. |
| `2.3` | **Watercolour** | Layered transparent washes. Each move leaves an elongated wash pointing the way it travelled, over a faint pencil line. Captures bloom with a pale back-run, and every twelve moves a glaze records who controls which squares. |
| `2.4` | **Ink Wash** | Sumi-e brush painting. Every move is one calligraphic stroke whose bristles run dry as it travels. Checks draw an ensō, the Zen circle, around the king, and a red seal carries the result. |
| `2.5` | **Action Painting** | Poured and flung paint, in the manner of the abstract expressionists. Every move is a looping skein of paint that overshoots its squares, and it lands with a splatter. Captures splash hard, and the victim’s colour runs down the canvas in drips. |
| `2.6` | **Palette Knife** | Flat, sharp-edged smears of thick paint over a scraped ground. Each move is one sweep of the knife toward the square where the piece landed, blending two colours from that side with streaks and a ridge of paint at the end. Captures are knifed across first in the captured piece’s colour. |

### 3 · Geometric & Modern

Twentieth-century abstraction: grids, shapes, stripes and fields of colour.

| Code | Style | What it shows |
|---|---|---|
| `3.1` | **De Stijl** | A Neo-Plastic grid. Each move can split the rectangle it lands in, with a black line running across the move’s direction. Heavier pieces draw thicker lines. Rooks and queens tend to fill their rectangle with colour, captures fill it with the captured piece’s colour, and checks fill it with the accent colour. |
| `3.2` | **Composition** | Abstract geometry in the spirit of Kandinsky’s Bauhaus years. Each piece is a shape: pawns are dots, knights triangles, bishops paired lines, rooks bars, queens concentric circles and kings crosses. Captures leave chequered patches, and checks strike with a zigzag. |
| `3.3` | **Suprematism** | Floating bars and squares on a tilted plane, after Malevich. Sliding pieces become bars as long as their move, pawns small squares and knights little L-shapes. Captures leave black squares, checks cut a thin line through the king, and checkmate is a black circle. |
| `3.4` | **Bauhaus Tiles** | The board as a Bauhaus poster. Every square a piece lands on becomes a tile whose shape comes from that piece (circle, quarter-circle, triangle, square, half-moon or flower), turned toward the direction it arrived from. The tile’s backing remembers the previous visitor, or the piece that was captured there. |
| `3.5` | **Op Art** | Optical stripes in the manner of Bridget Riley. White’s moves push the stripes up and Black’s push them down, so the busiest squares ripple. Where a side has pressed hardest, the stripes take on that side’s colour. |
| `3.6` | **Colour Field** | Three luminous, soft-edged rectangles stacked like a Rothko: the opening, the middlegame and the endgame. Each is coloured by the pieces that did the most work in that phase. A rectangle’s height follows how long its phase lasted. |

### 4 · Line & Thread

Pure linework: string art, ridgelines, contour maps, rosettes, engraving and star charts.

| Code | Style | What it shows |
|---|---|---|
| `4.1` | **String Art** | Threads strung between the 64 pins of a loom. Every move is a bundle of curved threads: knights arc high, pawns pull straight, and each side curves its own way. Captures burst, checks ring the king, and the final position is stamped on top. |
| `4.2` | **Ridgeline** | One ridge line per move, from the first move at the top to the last at the bottom, like a pulsar plot. Peaks rise over the files where the move started and ended. Captures and checks are tremors, and busy files and tense positions make the line restless. |
| `4.3` | **Topographic** | A contour map of the game. White’s moves raise hills and Black’s dig basins, each in proportion to the piece’s weight, and captures make sharp peaks. Contour lines are drawn every level, with a heavier index line every third, over a faint elevation tint. |
| `4.4` | **Spirograph** | Each landing square gets a spirograph rosette, and each piece has its own gear ratio: three loops for a pawn, a five-point star for a knight, twelve petals for a queen. Repeat visits enlarge and turn the rosette, so busy squares become lace. |
| `4.5` | **Engraving** | Banknote-style hatching. The more often a square was visited and fought over, the darker its tone, built from up to four layers of cross-hatched lines that swell as they deepen. Lines lean toward each side’s colour where that side was most active. |
| `4.6` | **Constellation** | A star chart. Every square has its own fixed star, which grows brighter each time a piece lands there, and moves are the lines that join stars into constellations. Captures flare with diffraction spikes and are labelled like named stars. |

### 5 · Pattern & Textile

Crafts and repeats: tartan, quilts, mosaic, tiles, cross-stitch and stained glass.

| Code | Style | What it shows |
|---|---|---|
| `5.1` | **Tartan** | A woven plaid whose sett (stripe sequence) comes from the game. White’s pieces make the warp and Black’s the weft, one stripe per piece type in the order they first moved, each as wide as that piece was busy. A thin over-check in the accent colour counts each side’s captures, and the sett is mirrored like a real tartan and woven in 2/2 twill. |
| `5.2` | **Quilt** | A patchwork quilt with one block per square. The piece that visited a square most often decides its traditional block: nine-patch, flying geese, pinwheel, log cabin, Ohio star or square-in-a-square. Its fabrics are the first and last visitors’ colours, and every block is hand-stitched. |
| `5.3` | **Mosaic** | Roman mosaic in the opus vermiculatum manner, where rows of small tiles follow the contours of the design. Here the rows follow the game’s current: each move lays a run of tesserae in its colour, and plain tiles fill the background at the end. |
| `5.4` | **Truchet** | Truchet tiles: every tile carries two quarter-circle arcs, and turning a tile reroutes the paths that wind across the board. Each square holds 3 × 3 tiles in the colour of the last piece to land there, and every arrival turns its tiles. |
| `5.5` | **Cross-Stitch** | An embroidered sampler on Aida cloth. Thread colours are painted along every move and pooled where pieces landed, then matched to the palette’s threads and stitched as crosses. Captured pieces leave their own colour behind. |
| `5.6` | **Stained Glass** | A leaded window. Every move sets a pane of glass where the piece landed, and long moves add a second pane along the way. Captures add a pane in the captured piece’s colour. The panes are Voronoi cells, glowing at the centre and bound by dark lead. |

### 6 · Light & Cosmos

Night skies: nebulae, light painting, fireworks, bokeh, aurora and orbits.

| Code | Style | What it shows |
|---|---|---|
| `6.1` | **Nebula** | A deep-space nebula. Every move breathes coloured gas along its path, and the piece’s landing square becomes a star that brightens with each visit. Captures ignite star clusters, and dark dust lanes drift through the busiest regions. |
| `6.2` | **Light Painting** | A long-exposure photograph of the pieces as torches, and each piece moves with its own gesture. Pawns march in dashes and knights leap in arcs. Bishops weave, rooks step in square waves, queens loop and kings circle. Captures flare like a lens. |
| `6.3` | **Fireworks** | A fireworks display. Each move launches a rocket from the bottom of the sky that bursts over its landing square, sized by the piece. Captures are big double-ringed shells with crackle, checks strobe around the king, and checkmate is the finale. |
| `6.4` | **Bokeh** | The game seen through a lens with shallow focus. Each move is a disc of out-of-focus light at its landing square. The latest moves are small and sharp, and older ones drift backward, growing larger, softer and dimmer, so the game’s past dissolves into bokeh. |
| `6.5` | **Aurora** | Northern lights over a dark horizon. Every move hangs a curtain of light in a band across the sky, above its landing square’s file and nudged up or down by its rank. Heavier pieces hang wider and taller curtains, which are brightest along the lower edge and fade upward into a second colour from the same side. |
| `6.6` | **Orrery** | The game as a clockwork solar system. Each piece type has its own orbit, pawns innermost and kings outermost. The 64 squares run around the dial, and every move is an arc along its piece’s orbit from one square to the other, ending in a planet. Captures leave comets. |

### 7 · Nature & Organic

Things that grow: vines, cells, lichen, Turing patterns, gardens and landscapes.

| Code | Style | What it shows |
|---|---|---|
| `7.1` | **Vines** | Every piece is a vine that grows from its own side of the board, White’s from the bottom edge and Black’s from the top. Each time a piece moves, its vine reaches on to the new square, curling and putting out leaves. A captured piece’s vine ends in a blossom where it fell, and the survivors bud at the end. |
| `7.2` | **Cells** | Living tissue under a microscope. Each move seeds a cell where the piece landed, and long moves seed a smaller one along the way. Cells divide the space between them (a Voronoi diagram), with rounded membranes, a darker nucleus and a few organelles. |
| `7.3` | **Lichen** | Lichen spreading over stone. Each move grows a colony of tightly packed discs around its landing square and along its path, and no disc may overlap another. Heavier pieces grow bigger discs, and captures leave a patch in the captured piece’s colour. |
| `7.4` | **Turing Patterns** | Reaction–diffusion: the chemistry Alan Turing proposed for leopard spots and zebra stripes. Every move injects a reagent where the piece landed. Where White has pressed, the pattern grows like coral, and where Black has, it splits like dividing cells. |
| `7.5` | **Garden** | A botanical drawing. Each move grows a stem from where the piece started to where it landed, and a flower opens there. The number of petals depends on the piece, from five for a pawn to twelve for a queen, and repeat visits grow bigger blooms. Captured pieces drop their petals. |
| `7.6` | **Terrain** | The board as a low-poly landscape seen from above at an angle. Every move raises the ground where the piece landed, more for heavier pieces, and captures throw up sharp peaks. Slopes take the colour of the side that fought there, and the highest summits are capped with snow. |

### 8 · Print & Graphic

Printmaking and graphic design: risograph, halftone, linocut, pop art, blueprints and cut-outs.

| Code | Style | What it shows |
|---|---|---|
| `8.1` | **Risograph** | A three-colour risograph print, slightly out of register. White’s moves are printed on one drum and Black’s on another, as bold lines with a dot, square or ring where the piece landed. Captures and checks go on a third, halftoned drum. The ink coverage is grainy, like real riso. |
| `8.2` | **Halftone** | Comic-book halftone. The game’s activity is printed as three screens of dots at different angles: White’s moves in one ink at 15°, Black’s in another at 75°, and captures and checks in the accent ink at 45°. Bigger dots mean more happened there. |
| `8.3` | **Linocut** | A two-block relief print. The key block is inked solid and then carved: windows are cut where pieces landed, and gouges follow the game’s current around every move. A colour block printed underneath shows through the cuts in the colours of the pieces. |
| `8.4` | **Pop Art** | A Warhol-style four-panel screenprint. The game’s motif (every move as a bold stroke, every landing as a dot, every capture as a starburst) is printed four times, each panel in a different colourway with an off-register shadow. |
| `8.5` | **Blueprint** | A technical drawing of the game on blueprint paper. Every move is a dimensioned vector with an arrowhead and a tick at each square it crosses, and knights take a dashed L-route. Notable moves are annotated, captures get callouts and the sheet has a title block. |
| `8.6` | **Cut-Outs** | Painted-paper cut-outs, after Matisse’s late work. Each move pins a hand-cut shape where the piece landed. Every piece has its own form: three lobes for a pawn, a five-pointed shape for a knight, a long leaf for a bishop, up to seven lobes for a queen. Captures are spiky stars. |

### 9 · Diagram & Data

The game as an information graphic: chords, arcs, heatmaps, barcodes, clocks and a metro map.

| Code | Style | What it shows |
|---|---|---|
| `9.1` | **Chord Diagram** | The 64 squares around a circle, grouped by file from a to h with ranks 1–8 inside each group. Every move is a chord from the square it left to the square it reached, curving through the middle. Ticks on the rim build up wherever pieces land. |
| `9.2` | **Arc Diagram** | All 64 squares in a row, from a1 to h8. White’s moves arc above the line and Black’s below, so an arc’s height shows how far the piece travelled. Rank labels mark the line, and captures are dots on it, sized by the value of the piece taken. |
| `9.3` | **Territory** | A weather map of control. After every move, each square counts how many White and Black pieces attack it, and the totals are added up over the whole game. Squares White dominated warm into White’s colour and Black’s into theirs, with isolines like isobars. |
| `9.4` | **Barcode** | The game’s fingerprint: one bar per move, left to right, in the piece’s colour. With clock times in the PGN, a bar’s width is the time spent thinking. Captures carry a band of the captured piece’s colour, checks a mark in the accent colour, and a line traces the material balance. |
| `9.5` | **Radial Clock** | The game as a clock face, with time running clockwise from the top. The rings, inside out: which piece moved, what was captured (and how valuable it was), how tense the position was, and the material balance as a radial line that bulges toward the side ahead. |
| `9.6` | **Metro Map** | A transit map of the game. Every piece that moved is a line, routed at 45° and 90° angles through the squares it stopped on, with a knight’s L-shaped jump as an elbow. Squares two pieces shared become interchanges, captured lines end at a buffer stop, and a river runs between the two halves. |

### 10 · Type & Digital

Letters and pixels: ASCII, typography, 8-bit, glitch and circuit boards.

| Code | Style | What it shows |
|---|---|---|
| `10.1` | **ASCII** | Terminal art. The game’s activity is mapped to a ramp of characters, from a blank for a quiet square to @ for the busiest, and coloured by the side that was more active there. Captures and checks are typed into the picture in their own notation. |
| `10.2` | **Concrete Poetry** | Typography that flows. Every move’s own notation (Nf3, exd5, Qxf7#) is set along the game’s current, repeated until the stream runs out, in a size set by the piece. White writes in italic serif and Black in bold sans. Captured pieces speak in their own colour. |
| `10.3` | **8-Bit** | A 64 × 64 pixel board, as on an 8-bit console. The current position is shown in pixel sprites, and the last dozen moves leave pixel trails that dither away as they age. Captures explode in the colour of the piece that was taken. |
| `10.4` | **Glitch** | Datamoshed chess. The board (squares tinted by their last visitor, recent moves as strokes, the pieces as glyphs) is corrupted by the game itself. Captures pixel-sort the row they happened on, checks split the colour channels, and long moves tear blocks of the image sideways. |
| `10.5` | **Circuit Board** | A printed circuit board. Every move is a copper trace routed at 45° from pad to pad, with a via at the bend. Captures get square pads and part labels, checks get a silkscreen ring, and the pieces left on the board at the end are soldered on as components. |

## Palettes

There are six palettes, all vibrant but soothing and never pure black or white: Lagoon, Sorbet, Aurora, Meadow, Dusk and Koi. The Light & Cosmos styles (group 6) always paint on a night sky taken from the palette, which is its background if dark, otherwise a deep shade of its ink.

## Adding a style

Register it from a file in `js/styles/` with a new, unused code:

```js
CM.art.register({
  code: '4.7', id: 'mystyle', name: 'My Style', blurb: 'One or two sentences.',
  setup(env) {},          // optional: prepare, draw a ground
  ply(env, i) {},         // draw move i (env.game.plies[i]) as the game replays
  finish(env) {},         // optional: after the last move
  // or, for styles that redraw everything from accumulated state:
  // retained: true, present(env, final) {}
  // heavy: true  → preview at half size while scrubbing
  // grain: false → no paper grain
});
```

`js/styles/common.js` has the shared toolkit: the game's vector field and streamline tracing, colour helpers, Voronoi, contours, grids, watercolour polygons and more. Codes are hard-coded in each style, so they never shift when styles are added.

## Files

- `index.html`, `css/style.css`, `css/art.css`: page and layout
- `js/app.js`: gallery, filtering, favourites, viewer, export
- `js/painter.js`: canvas and poster layout, seeding, driving a style move by move
- `js/analysis.js`: per-move square control, king squares and piece identities
- `js/styles/common.js`: style registry, groups and shared toolkit
- `js/styles/g01-currents.js` … `g10-digital.js`: the styles, one file per group
- `js/pgn.js`, `js/samples.js`, `vendor/chess.js`: PGN parsing (chess.js v1.4.0, BSD-2)
