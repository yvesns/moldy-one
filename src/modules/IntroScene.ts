import * as Misc from "Misc"
import * as Utils from '@dcl/ecs-scene-utils'
import { Dialog, DialogWindow } from '@dcl/npc-scene-utils'
import { movePlayerTo } from "@decentraland/RestrictedActions"
import { Vehicle } from "./Vehicle"

let tutorialDialog: Dialog[] = [
  {
    text: "<b>TUTORIAL</b>"
  },
  {
    text: "Take a sip from the beverage at the counter to start the game."
  },
  {
    text: "You will be taken high in the sky to your spaceship, then the game will begin."
  },
  {
    text: "Your spaceship will always be falling little by little."
  },
  {
    text: "You can control its direction by standing at the position in the <b>blue circle</b> that you want it to go."
  },
  {
    text: "You have 3 lives, try to avoid the canonballs."
  },
  {
    text: "Destroy things using your spaceship's beam by using the <b>left mouse button</b>. It takes a little while for it to recharge after each use."
  },
  {
    text: "Be careful not to crash down. Regain altitude by moving your ship into the column of wind."
  },
  {
    text: "Killing the bird detracts from your points, all else will increase them."
  },
  {
    text: "The first-person camera is recommended for the best experience. Press <b>V</b> to switch."
  },
  {
    text: "Try to get to 50000 thousand points to win."
  },
  {
    text: "Have fun!",
    isEndOfDialog: true
  }
]

export enum GameState {
  NOT_PLAYED,
  PLAYER_WON,
  PLAYER_LOST
}

let gameContext: IntroScene

@EventConstructor()
export class StartGameObjectClicked { }

class Cup {
  entity
  modelPath = "models/MoldyCup.glb"
  isLoaded = true

  constructor(parent) {
    this.entity = Misc.createGTLFShape(this.modelPath, new Vector3(-3.1, 1.1, -0.7), false)

    this.entity.setParent(parent)
    this.entity.addComponent(new OnPointerDown((e) => { this.onPointerDown(e) }))
  }

  onPointerDown(e) {
    if(!this.isLoaded){
      return
    }

    gameContext.getEventManager().fireEvent(new StartGameObjectClicked())
  }

  load(){
    this.entity.getComponent(GLTFShape).visible = true
    this.isLoaded = true
  }

  unload(){
    this.entity.getComponent(GLTFShape).visible = false
    this.isLoaded = false
  }

  removeSelf(){
    engine.removeEntity(this.entity)
  }
}

class TutorialPaper {
  entity
  modelPath = "models/TutorialPaper.glb"
  isLoaded = true

  constructor(parent) {
    this.initEntity(parent)
  }

  initEntity(parent) {
    this.entity = Misc.createGTLFShape(this.modelPath, new Vector3(-1.5, 0.71, 1.1), false)
    this.entity.getComponent(Transform).rotation.eulerAngles = new Vector3(0, -90, 0)
    this.entity.setParent(parent)

    this.entity.addComponent(new OnPointerDown((e) => { this.onPointerDown(e) }))
  }

  onPointerDown(e) {
    if(!this.isLoaded){
      return
    }

    const dialogWindow = new DialogWindow()
    dialogWindow.openDialogWindow(tutorialDialog, 0)
  }

  load(){
    this.entity.getComponent(GLTFShape).visible = true
    this.isLoaded = true
  }

  unload(){
    this.entity.getComponent(GLTFShape).visible = false
    this.isLoaded = false
  }

  removeSelf(){
    engine.removeEntity(this.entity)
  }
}

class Dumpster {
  base
  baseModelPath = "models/Dumpster.glb"
  trash
  trashModelPath = "models/Trash.glb"
  scale = 1.2
  isLoaded = true

  constructor(parent) {
    this.base = Misc.createGTLFShape(this.baseModelPath, new Vector3(1, 0.1, 0), false)
    this.base.getComponent(Transform).scale = new Vector3(this.scale, this.scale, this.scale)
    this.base.setParent(parent)

    this.trash = Misc.createGTLFShape(this.trashModelPath, new Vector3(0, 0.1, 0), false)
    // this.trash.getComponent(Transform).scale = new Vector3(this.scale, this.scale, this.scale)
    this.trash.setParent(this.base)
  }

  load(){
    this.base.getComponent(GLTFShape).visible = true
    this.trash.getComponent(GLTFShape).visible = true
    this.isLoaded = true
  }

  unload(){
    this.base.getComponent(GLTFShape).visible = false
    this.trash.getComponent(GLTFShape).visible = false
    this.isLoaded = false
  }

  removeSelf(){
    engine.removeEntity(this.base)
    engine.removeEntity(this.trash)
  }
}

class AnimatedStraw {
  entity
  origin

  constructor(origin){
    this.origin = origin
    this.entity = Misc.createGTLFShape("models/Straw.glb", this.origin)

    const strawScale = new Vector3(0.4, 0.5, 0.3)
    this.entity.getComponent(Transform).scale = strawScale

    this.entity.addComponent(new Utils.KeepRotatingComponent(Quaternion.Euler(0, 0, -180)))
    this.move(Math.random() * 10 + 10)
  }

  move(time){
    const destination = new Vector3(this.origin.x + 58, this.origin.y, this.origin.z)

    this.entity.addComponentOrReplace(new Utils.MoveTransformComponent(this.origin, destination, time, () => {this.onMovementEnded()}))
  }

  onMovementEnded(){
    this.move(Math.random() * 10 + 10)
  }

  removeSelf(){
    engine.removeEntity(this.entity)
  }
}

export class IntroScene {
  building
  buildingModelPath = "models/MoldyOne.glb"
  ground
  groundTexturePath = "textures/GroundTexture.png"
  wagon
  stones
  straws = []
  animatedStraw1
  animatedStraw2
  cup
  tutorialPaper
  dumpster
  eventManager
  isLoaded = true
  pyramid = null
  vehicle = null
  believePoster
  pickaxe

  constructor(gameState) {
    const spawnPoint = this.getSpawnPoint(gameState)
    const groundMaterial = new Material()

    gameContext = this

    this.eventManager = new EventManager()

    this.building = Misc.createGTLFShape(this.buildingModelPath, new Vector3(32, 0.1, 30))
    this.building.getComponent(Transform).rotation.eulerAngles = new Vector3(0, 180, 0)
    this.building.getComponent(GLTFShape).withCollisions = false

    this.wagon = Misc.createGTLFShape("models/Wagon.glb", new Vector3(23, 0.5, 30))
    this.wagon.getComponent(Transform).rotation.eulerAngles = new Vector3(0, 220, 0)

    this.stones = Misc.createGTLFShape("models/Stones.glb", new Vector3(32, 0.1, 48))
    this.stones.getComponent(Transform).rotation.eulerAngles = new Vector3(0, 180, 0)
    this.stones.getComponent(Transform).scale = new Vector3(0.1, 0.1, 0.1)

    const strawScale = new Vector3(0.4, 0.5, 0.3)
    this.straws[0] = Misc.createGTLFShape("models/Straw.glb", new Vector3(10, 0.1, 12))
    this.straws[0].getComponent(Transform).scale = strawScale
    this.straws[1] = Misc.createGTLFShape("models/Straw.glb", new Vector3(15, 0.1, 33))
    this.straws[1].getComponent(Transform).scale = strawScale
    this.straws[2] = Misc.createGTLFShape("models/Straw.glb", new Vector3(45, 0.1, 25))
    this.straws[2].getComponent(Transform).scale = strawScale

    this.animatedStraw1 = new AnimatedStraw(new Vector3(5, 1.2, 20))
    this.animatedStraw2 = new AnimatedStraw(new Vector3(5, 1.2, 5))

    const posterMaterial = new Material()
    const posterTexture = new Texture("images/BelievePoster.png")
    posterMaterial.albedoTexture = posterTexture
    this.believePoster = Misc.createPlane(new Vector3(-1.1, 1.5, -2.7))
    this.believePoster.getComponent(Transform).rotation.eulerAngles = new Vector3(0, 180, 180)
    this.believePoster.addComponent(posterMaterial)
    this.believePoster.setParent(this.building)

    this.pickaxe = Misc.createGTLFShape("models/Pickaxe.glb", new Vector3(-5, 0.5, 0))
    this.pickaxe.setParent(this.wagon)
    this.pickaxe.getComponent(Transform).rotation.eulerAngles = new Vector3(0, 0, 120)

    this.cup = new Cup(this.building)
    this.tutorialPaper = new TutorialPaper(this.building)
    this.dumpster = new Dumpster(this.building)

    this.ground = Misc.createCube(new Vector3(32, 0, 32))
    this.ground.getComponent(Transform).scale = new Vector3(64, 0.1, 64)
    groundMaterial.albedoTexture = new Texture(this.groundTexturePath)
    this.ground.addComponent(groundMaterial)

    if(gameState == GameState.PLAYER_WON){
      this.pyramid = Misc.createGTLFShape("models/Pyramid.glb", new Vector3(32, 0.1, 42.69))
      this.pyramid.getComponent(Transform).scale = new Vector3(6, 6, 6)
      this.pyramid.getComponent(Transform).rotation.eulerAngles = new Vector3(0, 180, 0)

      this.vehicle = new Vehicle(new Vector3(32, 16, 42.69))

      // this.pyramid.addComponent(new OnPointerDown(() => {
      //   this.vehicle.addPlayer()
      //   this.vehicle.isStarted = true
      // }))
    }

    movePlayerTo(spawnPoint)
  }

  getSpawnPoint(gameState){
    if(gameState == GameState.NOT_PLAYED){
      return new Vector3(2, 0, 2)
    }

    if(gameState == GameState.PLAYER_WON){
      return new Vector3(34.68, 50, 31)
    }

    return new Vector3(39.61, 0.99, 31.83)
  }

  getEventManager() {
    return this.eventManager
  }

  load(hasPlayerWon){
    this.building.getComponent(GLTFShape).visible = true
    this.building.getComponent(GLTFShape).withCollisions = true
    this.ground.getComponent(GLTFShape).visible = true
    this.ground.getComponent(GLTFShape).withCollisions = true

    this.cup.load()
    this.tutorialPaper.load()
    this.dumpster.load()

    if(hasPlayerWon){
      this.pyramid = Misc.createGTLFShape("models/Pyramid.glb", new Vector3(32, 0.1, 42.69))
      this.pyramid.getComponent(Transform).scale = new Vector3(4, 4, 4)
      this.vehicle = new Vehicle(new Vector3(32, 10, 42.69))
      movePlayerTo(this.victorySpawnPoint)
    } else {
      movePlayerTo(this.defeatSpawnPoint)
    }

    this.isLoaded = true
  }

  unload(){
    this.isLoaded = false

    this.building.getComponent(GLTFShape).visible = false
    this.building.getComponent(GLTFShape).withCollisions = false
    this.ground.getComponent(BoxShape).visible = false
    this.ground.getComponent(BoxShape).withCollisions = false

    this.cup.unload()
    this.tutorialPaper.unload()
    this.dumpster.unload()
  }

  removeSelf(){
    // this.unload()

    // const entityCount = engine.entities.keys.length

    // for(let i = 0; i < entityCount; i++){
    //   engine.removeEntity(engine.entities[engine.entities.keys[i]])
    // }

    // return

    engine.removeEntity(this.building)
    engine.removeEntity(this.ground)
    engine.removeEntity(this.wagon)
    engine.removeEntity(this.stones)
    engine.removeEntity(this.believePoster)
    engine.removeEntity(this.pickaxe)

    for(let i = 0; i < this.straws.length; i++){
      engine.removeEntity(this.straws[i])
    }

    this.cup.removeSelf()
    this.tutorialPaper.removeSelf()
    this.dumpster.removeSelf()
    this.animatedStraw1.removeSelf()
    this.animatedStraw2.removeSelf()

    if(this.pyramid != null){
      engine.removeEntity(this.pyramid)
    }

    if(this.vehicle != null){
      engine.removeEntity(this.vehicle)
    }
  }
}