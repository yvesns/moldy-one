import {Vehicle} from "./modules/Vehicle"
import {BowlMinigame} from "./modules/BowlMinigame"
import * as Misc from "./modules/Misc"
import {movePlayerTo} from "@decentraland/RestrictedActions"
import {SceneBoundary} from "./modules/SceneBoundary"
import {defaultSpawnPoint, defeatSpawnPoint, GameState, IntroScene, StartGameObjectClicked, victorySpawnPoint} from "./modules/IntroScene"
import {AlienMinigame, AlienMinigameTest, Building, Capsule, PlayerLost, PlayerWon, Road, WindArea} from "./modules/AlienMinigame"

// const vehicle = new Vehicle(new Vector3(10, 6, 10))
// const bowlMinigame = new BowlMinigame(new Vector3(32, 55, 32))
// const floor = spawnCube(32, 0, 32)
// const building = new Building(new Vector3(32, 1, 32), new Vector3(5, 5, 5))

// floor.getComponent(Transform).scale = new Vector3(64, 0.5, 64)

//engine.addSystem(vehicle)

// const alienMinigameTest = new AlienMinigameTest()

class DecentraMarbles {
  testGameStarter

  constructor(){
    this.initTest()
  }

  initTest(){
    this.testGameStarter = Misc.createCube(new Vector3(32, 1, 8))
    this.testGameStarter.addComponent(
      new OnPointerUp(
        (e) => {
          this.startGame()
        },
        { button: ActionButton.PRIMARY, showFeedback: true, hoverText: "Start game" }
      )
    )
  }

  startGame(){
    //movePlayerTo({x: 10, y: 100, z: 32})
    // movePlayerTo({x: 10, y: 7, z: 10})
    // movePlayerTo({x: 30, y: 76, z: 15})

    movePlayerTo({x: 30, y: 11, z: 15})
    alienMinigameTest.start()

    // const testEntity = new Entity()
    // const transform = new Transform()
    // const clip = new AudioClip("sounds/music.mp3")
    // const source = new AudioSource(clip)

    // transform.position = Camera.instance.position

    // testEntity.addComponent(transform)
    // testEntity.addComponent(source)

    // engine.addEntity(testEntity)

    // source.playing = true
    // source.playOnce()
    // source.volume = 2
    // source.loop = true

    // console.log("Playing music")
    // console.log(source.playing)
  }
}

class SceneLoader {
  currentScene

  constructor(){
    // this.introScene = new IntroScene()
    // this.alienMinigame = new AlienMinigame()
    Capsule.preload()
    this.initIntroScene(GameState.NOT_PLAYED)
  }

  initIntroScene(gameState){
    this.currentScene = new IntroScene(gameState)

    this.currentScene.getEventManager().addListener(StartGameObjectClicked, null, () => {this.onStartGameObjectClicked()})
  }

  initAlienMinigame(){
    let eventManager

    this.currentScene = new AlienMinigame()
    eventManager = this.currentScene.getEventManager()

    eventManager.addListener(PlayerWon, null, () => {this.onPlayerWon()})
    eventManager.addListener(PlayerLost, null, () => {this.onPlayerLost()})
  }

  onStartGameObjectClicked(){
    this.currentScene.removeSelf()
    this.initAlienMinigame()
  }

  onPlayerWon(){
    this.currentScene.removeSelf()
    this.initIntroScene(GameState.PLAYER_WON)
  }

  onPlayerLost(){
    this.currentScene.removeSelf()
    this.initIntroScene(GameState.PLAYER_LOST)
  }
}

// const game = new DecentraMarbles()
// const introScene = new IntroScene()
const sceneLoader = new SceneLoader()
