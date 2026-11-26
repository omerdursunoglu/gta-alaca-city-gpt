import * as THREE from 'three';
import { ProceduralPBR } from '../textures/ProceduralPBR';
import { buildAlacaMescitCamii, MosqueBuildResult } from './MosqueBuilder';
import { buildFirstTwoHouses, HousesBuildResult } from './FirstTwoHousesBuilder';

export class BuildingSystem {
  public readonly group = new THREE.Group();
  public readonly mosque: MosqueBuildResult;
  public readonly firstTwoHouses: HousesBuildResult;

  constructor(
    pbr: ProceduralPBR,
    callbacks: {
      onFountainInteract: () => void;
      onSadirvanInteract: () => void;
      onDoorToggle: (isOpen: boolean) => void;
      onLampToggle: (isOn: boolean) => void;
    }
  ) {
    this.mosque = buildAlacaMescitCamii(
      pbr,
      callbacks.onFountainInteract,
      callbacks.onSadirvanInteract
    );
    this.firstTwoHouses = buildFirstTwoHouses(
      pbr,
      callbacks.onDoorToggle,
      callbacks.onLampToggle
    );
    this.group.add(this.mosque.group);
    this.group.add(this.firstTwoHouses.group);
  }
}
