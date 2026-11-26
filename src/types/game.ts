import * as THREE from 'three';

export type WeaponId = 'fist' | 'knife' | 'pistol' | 'smg';
export type QualityLevel = 'low' | 'medium' | 'high';
export type FpsLimit = 30 | 45 | 60 | 90 | 120;
export type GamePhase = 'menu' | 'playing' | 'paused';

export interface ColliderBox {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  enabled: boolean;
  blocksCamera?: boolean;
  materialTag?: 'stone' | 'wood' | 'asphalt' | 'interior';
}

export interface StairRamp {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Direction along which height interpolates: 'x' or 'z' */
  axis: 'x' | 'z';
  startCoord: number;
  endCoord: number;
  startY: number;
  endY: number;
}

export interface InteractableItem {
  id: string;
  label: string;
  position: THREE.Vector3;
  radius: number;
  onInteract: () => void;
}

export interface WeaponStats {
  id: WeaponId;
  name: string;
  slot: number;
  damage: number;
  range: number;
  cooldown: number;
  automatic: boolean;
  magSize: number;
  reserveMax: number;
  reloadTime: number;
  spread: number;
}

export interface GameSettings {
  fpsLimit: FpsLimit;
  quality: QualityLevel;
  volume: number;
  muted: boolean;
}

export interface BuildingSpec {
  id: string;
  name: string;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  floors: number;
  floorHeight: number;
  rotationY: number;
  wallColor: string;
  trimColor: string;
  roofType: 'hipped' | 'gabled' | 'flat-terrace';
  hasCumba: boolean;
  cumbaSide?: 'north' | 'south' | 'east' | 'west';
  stoneBase: boolean;
}
