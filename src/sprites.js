const makeRowFrames = (row, count, size) =>
  Array.from({ length: count }, (_, i) => ({ x: i * size, y: row * size, w: size, h: size }));
const makeGridFrames = (cols, rows, sizeW, sizeH = sizeW) => {
  const frames = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) frames.push({ x: x * sizeW, y: y * sizeH, w: sizeW, h: sizeH });
  }
  return frames;
};

const loadSpriteImage = (path, frame, options = {}) => {
  const img = new Image();
  const encodedPath = encodeURI(path);
  img.src = new URL(encodedPath, import.meta.url);
  img.decoding = 'async';
  return {
    img,
    frame: frame ? {
      x: frame?.x ?? 0,
      y: frame?.y ?? 0,
      w: frame?.w,
      h: frame?.h
    } : null,
    frames: options.frames || (frame ? [frame] : []),
    baseSize: options.baseSize ?? frame?.w ?? 32,
    align: options.align ?? 'top',
    offset: options.offset || { x: 0, y: 0 }
  };
};

export const terrainSprites = {
  water: loadSpriteImage('../cute-fantasy-free/Tiles/Water_Middle.png', { w: 16, h: 16 }, { baseSize: 16 }),
  rock: loadSpriteImage('../cute-fantasy-free/Tiles/Cliff_Tile.png', { w: 16, h: 16 }, { baseSize: 16 }),
  forest: loadSpriteImage('../cute-fantasy-free/Tiles/Grass_Middle.png', { w: 16, h: 16 }, { baseSize: 16 }),
  fertile: loadSpriteImage('../cute-fantasy-free/Tiles/FarmLand_Tile.png', { w: 16, h: 16 }, { baseSize: 16 }),
  grass: loadSpriteImage('../cute-fantasy-free/Tiles/Grass_Middle.png', { w: 16, h: 16 }, { baseSize: 16 })
};

const playerPrimary = loadSpriteImage(
  '../fantasy-rpg-character-pack/1x/Farmer_walk.png',
  { w: 16, h: 24 },
  { baseSize: 24, align: 'bottom', frames: makeGridFrames(4, 4, 16, 24) }
);
const playerAlt = loadSpriteImage(
  '../fantasy-rpg-character-pack/1x/Barmaid_walk.png',
  { w: 16, h: 24 },
  { baseSize: 24, align: 'bottom', frames: makeGridFrames(4, 4, 16, 24) }
);
const buildingSheet = loadSpriteImage(
  '../buildings-colour2.png',
  { w: 71, h: 98 },
  { baseSize: 71, align: 'bottom', frames: makeGridFrames(16, 2, 71, 98) }
);
export const buildingFrameIndex = {
  hut: 0,
  house: 2,
  apartment: 18,
  mall: 19,
  cityhall: 21,
  tower: 23,
  jail: 20
};
const oakTree = loadSpriteImage('../cute-fantasy-free/outdoor-decoration/Oak_Tree.png', { w: 64, h: 80 }, { baseSize: 64, align: 'bottom' });
const woodHouse = loadSpriteImage('../cute-fantasy-free/outdoor-decoration/House_1_Wood_Base_Blue.png', { w: 96, h: 128 }, { baseSize: 96, align: 'bottom' });
const bridgeBoat = loadSpriteImage('../cute-fantasy-free/outdoor-decoration/Bridge_Wood.png', { w: 144, h: 64 }, { baseSize: 144, align: 'bottom' });
const pig = loadSpriteImage(
  '../cute-fantasy-free/Animals/Pig/Pig.png',
  { w: 32, h: 32 },
  { baseSize: 32, align: 'bottom', frames: makeGridFrames(2, 2, 32) }
);
const sheep = loadSpriteImage(
  '../cute-fantasy-free/Animals/Sheep/Sheep.png',
  { w: 32, h: 32 },
  { baseSize: 32, align: 'bottom', frames: makeGridFrames(2, 2, 32) }
);

export const sprites = {
  humanM: playerPrimary,
  humanF: playerAlt,
  tree: oakTree,
  hut: woodHouse,
  house: woodHouse,
  tower: woodHouse,
  apartment: woodHouse,
  mall: woodHouse,
  cityhall: woodHouse,
  jail: woodHouse,
  buildingSheet,
  boat: bridgeBoat,
  deer: sheep,
  boar: pig,
  fruit: {
    pixels: [
      '....8.....',
      '...888....',
      '..88888...',
      '.8888888..',
      '.8888888..',
      '.8888888..',
      '..88888...',
      '..88888...',
      '...888....',
      '....8.....',
      '....8.....',
      '....6.....'
    ],
    palette: { '6': '#4c6b2f', '8': '#f4c84a', '.': null }
  },
  campfire: {
    pixels: [
      '....7.....',
      '...777....',
      '...7f7....',
      '..77f77...',
      '..7fff7...',
      '.77fff77..',
      '.7fffff7..',
      '.77fff77..',
      '..72227...',
      '..72227...',
      '...222....',
      '...222....'
    ],
    palette: { '2': '#352310', '7': '#b66d39', 'f': '#ffb754', '.': null }
  },
  grave: {
    pixels: [
      '....9....',
      '...999...',
      '..99999..',
      '..9aa99..',
      '..9aa99..',
      '..9aa99..',
      '..99999..',
      '..99999..',
      '..99999..',
      '..99999..',
      '.9999999.',
      '.9999999.'
    ],
    palette: { '9': '#c9cbd0', 'a': '#9fa6b1', '.': null }
  }
};
