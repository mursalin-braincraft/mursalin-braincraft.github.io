/* Palettes: vibrant but soothing. Each side gets an analogous colour family
 * (so mixes stay clean, never muddy), on a softly tinted ground rather than
 * pure black or white. Normal (source-over) blending keeps overlaps saturated
 * instead of blowing out to white or sinking to mud. Piece order: [pawn, knight, bishop, rook, queen, king]. */
window.CM = window.CM || {};
CM.art = CM.art || {};

CM.art.PALETTES = {
  lagoon: {
    name: 'Lagoon', dark: true, blend: 'source-over', alpha: 0.3,
    bg: '#123540', fg: '#e6f4f1', accent: '#ffd08a',
    w: ['#ff9f86', '#ffb88f', '#ffd3a8', '#f68a8f', '#ffc2a3', '#fde3cf'],
    b: ['#3fc1c9', '#5ad1b5', '#8ee3d0', '#2ea7b8', '#7fd3e6', '#c9f1ea'],
  },
  sorbet: {
    name: 'Sorbet', dark: false, blend: 'source-over', alpha: 0.36,
    bg: '#fbf0e9', fg: '#3b3346', accent: '#f6b04e',
    w: ['#ff8fab', '#ffa8bf', '#ffc2d4', '#f27a9d', '#ff9fb9', '#e88aa8'],
    b: ['#7ec4e6', '#94b8ff', '#b3d4ff', '#6aaed6', '#a59cff', '#8aa6f0'],
  },
  aurora: {
    name: 'Aurora', dark: true, blend: 'source-over', alpha: 0.3,
    bg: '#161d33', fg: '#eef0ff', accent: '#ffe08a',
    w: ['#6ff2c2', '#58e0a6', '#a6f3d4', '#3fd0a0', '#9bffd2', '#d6fff0'],
    b: ['#b18cff', '#9a7cf8', '#d0b6ff', '#7f6bef', '#e2c2ff', '#ece0ff'],
  },
  meadow: {
    name: 'Meadow', dark: false, blend: 'source-over', alpha: 0.36,
    bg: '#f4f1e3', fg: '#33402f', accent: '#e07a5f',
    w: ['#f4a259', '#f6bd60', '#eccb7a', '#f28482', '#f7c98a', '#e09f5a'],
    b: ['#84a59d', '#6aa06a', '#a7c957', '#5b8a7a', '#8fbf7a', '#4f7f6f'],
  },
  dusk: {
    name: 'Dusk', dark: true, blend: 'source-over', alpha: 0.3,
    bg: '#2a2140', fg: '#f6eaf0', accent: '#ffd38a',
    w: ['#ff9e7a', '#ffb38a', '#ffc8a2', '#f7898c', '#ffd0ae', '#ffe4cf'],
    b: ['#9d8df1', '#b8a9ff', '#7fa7e8', '#c3b1f1', '#8ec5ff', '#dcd4ff'],
  },
  koi: {
    name: 'Koi', dark: false, blend: 'source-over', alpha: 0.36,
    bg: '#f3ece2', fg: '#2c3e50', accent: '#e9724c',
    w: ['#f08a4b', '#f5a66b', '#f7c08a', '#e9724c', '#f9b57a', '#d96f3f'],
    b: ['#4a6fa5', '#5b8fb9', '#98c1d9', '#3d5a80', '#7fa8c9', '#2f4b6e'],
  },
};

CM.art.PIECE_INDEX = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };
CM.art.WEIGHT = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 4 };
