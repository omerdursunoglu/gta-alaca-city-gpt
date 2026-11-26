import { BuildingSpec } from '../types/game';

/**
 * Local metric projection derived from OpenStreetMap (© OpenStreetMap contributors, ODbL 1.0).
 * Origin (0, 0, 0) = Alaca Mescit Camii center (40.3160942°N, 36.5445737°E, OSM way/1372898868).
 * Three.js axes: +X = East, -Z = North (+Z = South), +Y = Up.
 */
export const OSM_ORIGIN = {
  lat: 40.3160942,
  lon: 36.5445737,
  osmWayId: 1372898868,
  attribution: '© OpenStreetMap contributors (ODbL 1.0)',
};

export interface RoadPolyline {
  id: string;
  name: string;
  osmWayId: number;
  width: number;
  surface: 'asphalt' | 'cobble' | 'footway';
  points: [number, number][]; // [x, z] in meters
}

/**
 * Exact Alaca Mescit Camii footprint from OSM way/1372898868 converted to [x, z] meters.
 */
export const MOSQUE_FOOTPRINT_XZ: [number, number][] = [
  [-6.72, 6.62],
  [6.63, 6.71],
  [6.72, -6.62],
  [-6.63, -6.71],
];

/**
 * Real road & footway geometries from OSM clipped cleanly to the playable neighborhood (~55m radius).
 * Note: OSM N coordinate maps to Three.js z = -N.
 */
export const OSM_ROADS: RoadPolyline[] = [
  {
    id: 'road_south_ankara_sk',
    name: 'Ankara Sokak (Güney)',
    osmWayId: 667264421,
    width: 5.4,
    surface: 'cobble',
    points: [
      [-62.0, 12.0],
      [-45.0, 4.2],
      [-19.48, 4.82],
      [-8.89, 6.26],
      [-6.72, 6.62],
      [18.0, 9.9],
      [42.0, 13.1],
      [54.74, 14.87],
      [62.7, 25.34],
    ],
  },
  {
    id: 'road_north_gecit',
    name: 'Ankara Sokak 2. Geçit (Kuzey)',
    osmWayId: 667264414,
    width: 5.2,
    surface: 'cobble',
    points: [
      [-55.57, -46.82],
      [-40.69, -40.5],
      [-26.76, -33.12],
      [-9.2, -29.53],
      [2.2, -28.56],
      [25.25, -26.61],
      [52.0, -28.8],
      [66.74, -30.26],
    ],
  },
  {
    id: 'footway_west_alley',
    name: 'Cami Batı Geçidi',
    osmWayId: 731868623,
    width: 3.4,
    surface: 'footway',
    points: [
      [-3.42, 49.05],
      [-8.89, 6.26],
      [-9.2, -29.53],
    ],
  },
  {
    id: 'road_sulusokak_cd',
    name: 'Sulusokak Caddesi',
    osmWayId: 512487039,
    width: 7.4,
    surface: 'asphalt',
    points: [
      [-48.0, 62.0],
      [-21.65, 56.52],
      [-3.42, 49.05],
      [50.47, 26.99],
      [62.7, 25.34],
    ],
  },
  {
    id: 'road_east_connector',
    name: 'Doğu Ara Sokak',
    osmWayId: 667264412,
    width: 4.8,
    surface: 'cobble',
    points: [
      [54.74, 14.87],
      [62.7, 25.34],
      [58.0, -4.0],
      [66.74, -30.26],
    ],
  },
];

/**
 * First two custom houses sit immediately to the LEFT (East, +X) when looking from outside
 * at the Mosque's North main entrance facade (facing +Z).
 * Surrounding buildings fill out the real OSM urban blocks without intersecting roads.
 * Note: Individual residential footprints outside the mosque are architectural estimates
 * matching Tokat Sulusokak / Rüstem Çelebi traditional 'bitişik nizam' parcels (documented in KNOWN_LIMITATIONS.md).
 */
export const SURROUNDING_BUILDINGS: BuildingSpec[] = [
  // Block West of Mosque (across the west footway x < -12, between north & south streets)
  {
    id: 'nb_west_1',
    name: 'Batı Köşe Konak',
    centerX: -18.5,
    centerZ: -8.5,
    width: 10.2,
    depth: 11.4,
    floors: 2,
    floorHeight: 3.1,
    rotationY: 0.04,
    wallColor: '#e8dcc8',
    trimColor: '#5c3c28',
    roofType: 'hipped',
    hasCumba: true,
    cumbaSide: 'east',
    stoneBase: true,
  },
  {
    id: 'nb_west_2',
    name: 'Sarı Sıvalı Ev',
    centerX: -30.5,
    centerZ: -10.2,
    width: 10.5,
    depth: 10.0,
    floors: 2,
    floorHeight: 2.95,
    rotationY: -0.05,
    wallColor: '#dfb87d',
    trimColor: '#4f3524',
    roofType: 'gabled',
    hasCumba: false,
    stoneBase: true,
  },
  {
    id: 'nb_west_3',
    name: 'Kuzeybatı Köşe Evi',
    centerX: -20.0,
    centerZ: -21.0,
    width: 10.6,
    depth: 8.6,
    floors: 3,
    floorHeight: 2.95,
    rotationY: 0.14,
    wallColor: '#d9c5b2',
    trimColor: '#4a3122',
    roofType: 'hipped',
    hasCumba: true,
    cumbaSide: 'north',
    stoneBase: true,
  },
  // Block North of North Street (z < -33)
  {
    id: 'nb_north_1',
    name: 'Çeşme Karşısı Ev',
    centerX: 0.5,
    centerZ: -38.5,
    width: 11.5,
    depth: 9.2,
    floors: 2,
    floorHeight: 3.05,
    rotationY: -0.08,
    wallColor: '#e4d4be',
    trimColor: '#5c3b24',
    roofType: 'hipped',
    hasCumba: true,
    cumbaSide: 'south',
    stoneBase: true,
  },
  {
    id: 'nb_north_2',
    name: 'Kiremitli Konut',
    centerX: 15.0,
    centerZ: -37.2,
    width: 11.8,
    depth: 9.4,
    floors: 3,
    floorHeight: 2.9,
    rotationY: -0.06,
    wallColor: '#c9a489',
    trimColor: '#462c1c',
    roofType: 'gabled',
    hasCumba: false,
    stoneBase: true,
  },
  {
    id: 'nb_north_3',
    name: 'Kuzeydoğu Ev',
    centerX: 29.5,
    centerZ: -37.5,
    width: 11.0,
    depth: 9.8,
    floors: 2,
    floorHeight: 3.0,
    rotationY: -0.03,
    wallColor: '#dcd2c0',
    trimColor: '#554032',
    roofType: 'hipped',
    hasCumba: true,
    cumbaSide: 'south',
    stoneBase: false,
  },
  {
    id: 'nb_north_4',
    name: 'Kuzeybatı Apartman',
    centerX: -14.5,
    centerZ: -40.5,
    width: 11.4,
    depth: 9.5,
    floors: 2,
    floorHeight: 3.0,
    rotationY: -0.15,
    wallColor: '#d3cab9',
    trimColor: '#4b382a',
    roofType: 'gabled',
    hasCumba: false,
    stoneBase: true,
  },
  // Block East beyond House 2 (x > 33)
  {
    id: 'nb_east_3',
    name: 'Doğu Bahçeli Ev',
    centerX: 39.5,
    centerZ: -5.5,
    width: 10.6,
    depth: 12.0,
    floors: 2,
    floorHeight: 3.0,
    rotationY: 0.04,
    wallColor: '#e2cfb8',
    trimColor: '#593d29',
    roofType: 'hipped',
    hasCumba: true,
    cumbaSide: 'north',
    stoneBase: true,
  },
  // Block South of South Street (z > +13, North of Sulusokak Caddesi)
  {
    id: 'nb_south_1',
    name: 'Güney Taş Ev',
    centerX: 6.0,
    centerZ: 21.5,
    width: 11.5,
    depth: 10.5,
    floors: 2,
    floorHeight: 3.0,
    rotationY: 0.12,
    wallColor: '#d8c2aa',
    trimColor: '#4c3424',
    roofType: 'hipped',
    hasCumba: true,
    cumbaSide: 'north',
    stoneBase: true,
  },
  {
    id: 'nb_south_2',
    name: 'Sulusokak Köşe Binası',
    centerX: 21.5,
    centerZ: 23.5,
    width: 12.2,
    depth: 10.2,
    floors: 3,
    floorHeight: 2.95,
    rotationY: -0.18,
    wallColor: '#e5d8c5',
    trimColor: '#5a3b26',
    roofType: 'gabled',
    hasCumba: true,
    cumbaSide: 'south',
    stoneBase: true,
  },
  {
    id: 'nb_south_3',
    name: 'Güneybatı Mahalle Evi',
    centerX: -19.5,
    centerZ: 20.0,
    width: 11.2,
    depth: 11.0,
    floors: 2,
    floorHeight: 3.1,
    rotationY: 0.03,
    wallColor: '#cfb59b',
    trimColor: '#483020',
    roofType: 'hipped',
    hasCumba: false,
    stoneBase: true,
  },
  {
    id: 'nb_south_4',
    name: 'Sulusokak Eski Han Cephesi',
    centerX: -18.5,
    centerZ: 36.5,
    width: 12.8,
    depth: 10.2,
    floors: 2,
    floorHeight: 3.3,
    rotationY: -0.32,
    wallColor: '#cdbca6',
    trimColor: '#422d1f',
    roofType: 'hipped',
    hasCumba: true,
    cumbaSide: 'south',
    stoneBase: true,
  },
  // Larger building South-East across Sulusokak from OSM way/186285280 (around E: +55..+97, N: -77..-40 => z: +40..+77)
  {
    id: 'nb_osm_186285280',
    name: 'Sulusokak Güneydoğu Yapısı',
    centerX: 50.0,
    centerZ: 46.0,
    width: 18.0,
    depth: 14.0,
    floors: 2,
    floorHeight: 3.3,
    rotationY: -0.06,
    wallColor: '#e6dccd',
    trimColor: '#665344',
    roofType: 'hipped',
    hasCumba: false,
    stoneBase: true,
  },
];

export const PLAYABLE_BOUNDS = {
  minX: -40,
  maxX: 50,
  minZ: -38,
  maxZ: 45,
};
