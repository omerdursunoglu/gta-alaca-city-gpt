import * as THREE from 'three';
import { ProceduralPBR } from '../textures/ProceduralPBR';
import { InteractionManager } from '../systems/InteractionManager';
import { PhysicsManager } from '../systems/PhysicsManager';
import { BuildingSystem } from './BuildingSystem';
import { buildNeighborhood, NeighborhoodBuildResult } from './NeighborhoodBuilder';

export class WorldManager {
  public readonly group = new THREE.Group();
  public readonly pbr = new ProceduralPBR();
  public readonly buildings: BuildingSystem;
  public readonly neighborhood: NeighborhoodBuildResult;
  public readonly sunLight: THREE.DirectionalLight;
  public readonly interiorLights: THREE.PointLight[] = [];

  constructor(
    scene: THREE.Scene,
    physics: PhysicsManager,
    interactions: InteractionManager,
    callbacks: {
      onFountainInteract: () => void;
      onSadirvanInteract: () => void;
      onDoorToggle: (isOpen: boolean) => void;
      onLampToggle: (isOn: boolean) => void;
    }
  ) {
    // Daytime Anatolian sky & atmospheric lighting
    scene.background = new THREE.Color(0x9ec4de);

    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x6b604e, 0.85);
    this.group.add(hemi);

    this.sunLight = new THREE.DirectionalLight(0xfff0d4, 2.25);
    this.sunLight.position.set(28, 42, -26); // Warm late-afternoon NW-NE sun illuminating Mosque entrance, minaret & House 1/2 facades!
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.left = -45;
    this.sunLight.shadow.camera.right = 45;
    this.sunLight.shadow.camera.top = 45;
    this.sunLight.shadow.camera.bottom = -45;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 110;
    this.sunLight.shadow.bias = -0.0005;
    this.group.add(this.sunLight);

    // Subtle fill bounce from south-west
    const fill = new THREE.DirectionalLight(0xc7dcf0, 0.45);
    fill.position.set(-22, 16, 24);
    this.group.add(fill);

    // Priority #1 & #2: Alaca Mescit Camii + First Two Houses
    this.buildings = new BuildingSystem(this.pbr, callbacks);
    this.group.add(this.buildings.group);
    physics.addColliders(this.buildings.mosque.colliders);
    physics.addColliders(this.buildings.firstTwoHouses.colliders);
    physics.addStairRamps(this.buildings.firstTwoHouses.stairRamps);
    interactions.register(this.buildings.mosque.interactables);
    interactions.register(this.buildings.firstTwoHouses.interactables);

    this.buildings.firstTwoHouses.interiorLights.forEach((l) => {
      this.group.add(l);
      this.interiorLights.push(l);
    });

    // Priority #3 & #4: OSM Roads & Surrounding Tokat Neighborhood
    this.neighborhood = buildNeighborhood(this.pbr);
    this.group.add(this.neighborhood.group);
    physics.addColliders(this.neighborhood.colliders);

    scene.add(this.group);
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    this.buildings.firstTwoHouses.update(dt);

    // Distance LOD toggling for surrounding building detail meshes
    for (const item of this.neighborhood.lodObjects) {
      const worldPos = new THREE.Vector3();
      item.object.getWorldPosition(worldPos);
      item.object.visible = worldPos.distanceTo(playerPos) <= item.maxDist;
    }
  }
}
