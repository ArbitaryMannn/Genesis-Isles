export const canvas = document.getElementById('world');
export const ctx = canvas.getContext('2d');

export const TILE = canvas.width / 48;
export const WORLD_SIZE = Math.floor(canvas.width / TILE);

export const tiles = new Array(WORLD_SIZE * WORLD_SIZE);
export const foods = [];
export const humans = [];
export const buildings = [];
export const campfires = [];
export const animals = [];
export const fish = [];
export const effects = [];
export const logs = [];
export const graves = [];
export const bolts = [];
export const deaths = [];
export const groundNoise = [];
export const snowMask = [];
export const clouds = [];
export const jails = [];
export const boats = [];
export const crops = [];
export const carts = [];

export const ui = {
  buttons: document.querySelectorAll('[data-tool]'),
  speedInput: document.getElementById('speed'),
  toggleBtn: document.getElementById('toggle'),
  musicBtn: document.getElementById('musicToggle'),
  popEl: document.getElementById('pop'),
  hutEl: document.getElementById('huts'),
  eraEl: document.getElementById('era'),
  progEl: document.getElementById('progress'),
  logEl: document.getElementById('log'),
  dateEl: document.getElementById('date'),
  downloadBtn: document.getElementById('downloadBook'),
  goldEl: document.getElementById('gold'),
  deathEl: document.getElementById('deathLog')
};

export const state = {
  paused: false,
  speed: 1,
  tool: null,
  time: 0,
  light: 1,
  dayClock: 0,
  day: 1,
  month: 1,
  year: 1,
  tempField: [],
  elevation: [],
  gold: 50,
  mayorId: null,
  tribeFormed: false,
  diplomacy: false,
  visaCost: 8,
  zoom: 1,
  camera: { x: 0, y: 0, vx: 0, vy: 0 },
  hoverTile: null,
  fps: 0,
  faith: 0,
  prophetCall: null,
  tech: {
    fire: false,
    medicine: false,
    professions: false,
    wheel: false
  },
  stages: {
    village: false,
    farm: false,
    industry: false
  },
  maxPop: 800,
  night: false
};

export const DAY_LENGTH = 22;
export const MONTH_LENGTH = 30;

export const tilePalette = {
  water: '#234563',
  rock: '#5e6878',
  forest: '#3e6b49',
  fertile: '#40522c',
  grass: '#2f4432'
};

export const buildingTypes = [
  { key: 'hut', label: 'Kulübe', cost: { wood: 4, stone: 2 } },
  { key: 'house', label: 'Ev', cost: { wood: 7, stone: 4 } },
  { key: 'tower', label: 'Gökdelen', cost: { wood: 20, stone: 24 } },
  { key: 'apartment', label: 'Apartman', cost: { wood: 12, stone: 10 } },
  { key: 'mall', label: 'AVM', cost: { wood: 16, stone: 14 } },
  { key: 'cityhall', label: 'Belediye', cost: { wood: 14, stone: 12 } },
  { key: 'jail', label: 'Hapishane', cost: { wood: 12, stone: 12 } }
];
