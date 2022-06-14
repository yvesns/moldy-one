import * as Fade from "Fade"
import * as Misc from "Misc"
import * as Utils from '@dcl/ecs-scene-utils'
import {TriggerLayers} from "TriggerLayers"
import {Vehicle} from "Vehicle"
import { movePlayerTo } from "@decentraland/RestrictedActions"

enum EntityTypes {
    BIRD,
    BUILDING,
    WIND_AREA,
    CANON,
    CAR
}

let gameContext : AlienMinigame

@EventConstructor()
class EntityDestroyed {
    entity

    constructor(entity){
        this.entity = entity
    }
}

@EventConstructor()
class SpawnerEntityDestroyed {
    spawner

    constructor(spawner){
        this.spawner = spawner
    }
}

@EventConstructor()
class VehicleHit {
    damage

    constructor(damage){
        this.damage = damage
    }
}

@EventConstructor()
export class PlayerWon {}

@EventConstructor()
export class PlayerLost {}

@EventConstructor()
class PlayerHPChanged {
    newHP

    constructor(newHP){
        this.newHP = newHP
    }
}

@EventConstructor()
class ScoreChanged {
    newScore

    constructor(newScore){
        this.newScore = newScore
    }
}

@EventConstructor()
class CapsuleMovementEnded {}

@EventConstructor()
class AlienSmokeAnimationEnded {}

class ShrapnelAnimation {
    entities = []
    maximumEntities = 10
    modelPath1 = "models/Shrapnel1.glb"
    modelPath2 = "models/Shrapnel2.glb"
    modelPath3 = "models/Shrapnel3.glb"
    animationEndedCount = 0

    constructor(position){
        for(let i = 0; i < this.maximumEntities; i++){
            this.entities.push(this.createRandomizedShrapnel(position))
        }
    }

    createRandomizedShrapnel(position){
        const roll = Math.random()
        let modelPath

        if(roll < 0.33){
            modelPath = this.modelPath1
        } else if (roll < 0.66){
            modelPath = this.modelPath2
        } else {
            modelPath = this.modelPath3
        }

        const shrapnel = Misc.createGTLFShape(modelPath, position)
        const origin = position
        const destination = new Vector3(origin.x + Math.random() * 20, origin.y, origin.z + Math.random() * 20)
        const startRotation = Quaternion.Euler(0, 0, 0)
        const endRotation = Quaternion.Euler(0, 900, 0)
        const time = 1

        shrapnel.addComponent(new Utils.RotateTransformComponent(startRotation, endRotation, time))
        shrapnel.addComponent(new Utils.MoveTransformComponent(origin, destination, time, () => {this.onAnimationEnded()}))

        return shrapnel
    }

    onAnimationEnded(){
        this.animationEndedCount++

        if(this.animationEndedCount < this.maximumEntities){
            return
        }

        for(let i = 0; i < this.entities.length; i++){
            engine.removeEntity(this.entities[i])
        }
    }
}

class SmokeRingAnimation {
    entity
    modelPath = "models/SmokeRing.glb"

    constructor(position){
        this.entity = Misc.createGTLFShape(this.modelPath, position)

        let startSize = new Vector3(1, 1, 1)
        let endSize = new Vector3(5, 1, 5)

        this.entity.addComponent(new Utils.ScaleTransformComponent(startSize, endSize, 2, () => {this.onScaleTransformEnded()}))
    }

    onScaleTransformEnded(){
        engine.removeEntity(this.entity)
    }
}

class AlienSmokeAnimation {
    entity
    modelPath = "models/AlienSmoke.glb"

    constructor(position){
        this.entity = Misc.createGTLFShape(this.modelPath, position)

        let startSize = new Vector3(1, 1, 1)
        let endSize = new Vector3(5, 1, 5)

        this.entity.addComponent(new Utils.ScaleTransformComponent(startSize, endSize, 2, () => {this.onScaleTransformEnded()}))

        const clip = new AudioClip("sounds/hiss.mp3")
        const source = new AudioSource(clip)

        this.entity.addComponent(source)
        source.playOnce()
    }

    onScaleTransformEnded(){
        gameContext.getEventManager().fireEvent(new AlienSmokeAnimationEnded())
        engine.removeEntity(this.entity)
    }
}

class Bird {
    entity
    modelPath = "models/Bird.glb"
    isDestroyed = false
    isLoaded = true
    height = 20
    audioEntity
    path = [
        new Vector3(8, 20, 8),
        new Vector3(24, 20, 8),
        new Vector3(40, 20, 8),
        new Vector3(56, 20, 8),
        new Vector3(8, 20, 24),
        new Vector3(24, 20, 24),
        new Vector3(40, 20, 24),
        new Vector3(56, 20, 24),
        new Vector3(8, 20, 40),
        new Vector3(24, 20, 40),
        new Vector3(40, 20, 40),
        new Vector3(56, 20, 40),
        new Vector3(8, 20, 56),
        new Vector3(24, 20, 56),
        new Vector3(40, 20, 56),
        new Vector3(56, 20, 56)
    ]

    constructor(position){
        this.initEntity(position)
        this.initTriggerComponent()
        this.initSound()
        this.shufflePath()
        this.move()
    }

    initEntity(position){
        this.entity = Misc.createGTLFShape(this.modelPath, position)
        this.entity.getComponent(Transform).scale = new Vector3(1, 1, 1)
    }

    initTriggerComponent(){
        const triggerShape = new Utils.TriggerBoxShape()

        this.entity.addComponent(new Utils.TriggerComponent(
            triggerShape,
            {
                triggeredByLayer: TriggerLayers.BEAM,
                enableDebug: false,
                onTriggerEnter: () => {this.onTriggerEnter()}
            }
        ))
    }

    initSound(){
        this.audioEntity = Misc.createEmptyEntity(new Vector3(32, 1, 32))
        const audioClip = new AudioClip("sounds/bird.mp3")
        const audioSource = new AudioSource(audioClip)

        this.audioEntity.getComponent(Transform).position = this.entity.getComponent(Transform).position

        audioSource.volume = 1

        this.audioEntity.addComponent(audioSource)
    }

    shufflePath(){
        let currentIndex = this.path.length
        let randomIndex

        while(currentIndex > 0){
            randomIndex = Math.floor(Math.random() * currentIndex)
            currentIndex--

            [this.path[currentIndex], this.path[randomIndex]] = [this.path[randomIndex], this.path[currentIndex]]
        }
    }

    move(){
        this.entity.addComponent(new Utils.FollowCurvedPathComponent(this.path, 20, 300, true, false, () => {this.onMovementEnded()}))
    }

    removeSelf(){
        engine.removeEntity(this.entity)
        engine.removeEntity(this.audioEntity)
    }

    playSound(){
        // this.audioEntity.getComponent(Transform).position = Camera.instance.position
        this.audioEntity.getComponent(AudioSource).playOnce()
    }

    load(){
        this.entity.getComponent(GLTFShape).visible = true
        this.isLoaded = true
    }

    unload(){
        this.entity.getComponent(GLTFShape).visible = false
        this.isLoaded = false
    }

    onMovementEnded(){
        this.shufflePath()
        this.move()
    }

    onTriggerEnter(){
        if(!this.isLoaded){
            return
        }

        this.playSound()

        gameContext.getEventManager().fireEvent(new EntityDestroyed(this))
        this.isDestroyed = true

        this.removeSelf()
    }
}

class Car{
    entity
    static blueModelPath = "models/BlueCar.glb"
    static redModelPath = "models/RedCar.glb"
    static nextModelPath = Car.blueModelPath
    origin
    destination
    speed = 10
    isMoving = false
    isDestroyed = false
    isLoaded = true
    movementAudioEntity
    explosionAudioEntity
    vehicleCollisionEntity

    constructor(origin, destination){
        this.origin = origin
        this.destination = destination

        this.initEntity()
        this.initVehicleCollisionEntity()
        this.initSound()
        this.hide()
    }

    initEntity(){
        let triggerShape

        this.entity = Misc.createGTLFShape(this.getNextModelPath(), this.origin)
        this.entity.getComponent(Transform).scale = new Vector3(0.7, 0.7, 0.7)

        this.entity.addComponent(
            new Utils.Interval(10000, () => {this.move()})
        )

        triggerShape = new Utils.TriggerBoxShape()
        triggerShape.size = new Vector3(2, 4, 6)

        this.entity.addComponent(new Utils.TriggerComponent(
            triggerShape,
            {
                triggeredByLayer: TriggerLayers.BEAM,
                enableDebug: false,
                onTriggerEnter: () => {this.onTriggerEnter()}
            }
        ))
    }

    initVehicleCollisionEntity(){
        let triggerShape

        this.vehicleCollisionEntity = Misc.createEmptyEntity(this.entity.getComponent(Transform).position)

        triggerShape = new Utils.TriggerBoxShape()
        triggerShape.size = new Vector3(2, 4, 6)

        this.vehicleCollisionEntity.addComponent(new Utils.TriggerComponent(
            triggerShape,
            {
                triggeredByLayer: TriggerLayers.VEHICLE,
                onTriggerEnter: () => {
                    if(this.isMoving){
                        gameContext.getEventManager().fireEvent(new VehicleHit(3))
                    }
                },
                enableDebug: false
            }
        ))
    }

    initSound(){
        const movementAudioClip = new AudioClip("sounds/car.mp3")
        const movementAudioSource = new AudioSource(movementAudioClip)
        const explosionAudioClip = new AudioClip("sounds/explosion.mp3")
        const explosionAudioSource = new AudioSource(explosionAudioClip)

        this.movementAudioEntity = Misc.createEmptyEntity(this.entity.getComponent(Transform).position)
        this.explosionAudioEntity = Misc.createEmptyEntity(this.entity.getComponent(Transform).position)

        this.movementAudioEntity.addComponent(movementAudioSource)
        this.explosionAudioEntity.addComponent(explosionAudioSource)
    }

    getNextModelPath(){
        if(Car.nextModelPath == Car.blueModelPath){
            Car.nextModelPath = Car.redModelPath
        } else {
            Car.nextModelPath = Car.blueModelPath
        }

        return Car.nextModelPath
    }

    playMovementSound(){
        // this.audioEntity.getComponent(Transform).position = Camera.instance.position
        this.movementAudioEntity.getComponent(AudioSource).playOnce()
    }

    playExplosionSound(){
        this.explosionAudioEntity.getComponent(AudioSource).playOnce()
    }

    hide(){
        this.entity.getComponent(GLTFShape).visible = false
    }

    show(){
        this.entity.getComponent(GLTFShape).visible = true
    }

    move(){
        if(this.isMoving){
            return
        }

        this.speed = Math.random() * 10 * 5 + 10

        const time = Misc.getDistanceBetweenPoints3D(this.origin, this.destination) / this.speed

        this.isMoving = true
        this.show()
        this.entity.addComponentOrReplace(new Utils.MoveTransformComponent(
            this.origin,
            this.destination,
            time,
            () => {this.onMovementEnded()}
        ))

        this.vehicleCollisionEntity.addComponent(new Utils.MoveTransformComponent(
            this.origin,
            this.destination,
            time
        ))

        this.playMovementSound()
    }

    load(){
        this.show()

        this.isLoaded = true
    }

    unload(){
        this.hide()

        this.isLoaded = false
    }

    onMovementEnded(){
        this.hide()
        this.isMoving = false
    }

    onTriggerEnter(){
        if(!this.isLoaded){
            return
        }

        this.isDestroyed = true
        gameContext.getEventManager().fireEvent(new EntityDestroyed(this))
        new SmokeRingAnimation(this.entity.getComponent(Transform).position)
        new ShrapnelAnimation(this.entity.getComponent(Transform).position)
        this.playExplosionSound()
        this.removeSelf()
    }

    removeSelf(){
        engine.removeEntity(this.entity)
        engine.removeEntity(this.movementAudioEntity)
        engine.removeEntity(this.explosionAudioEntity)
    }
}

class Canon{
    base
    baseModelPath = "models/CanonBase.glb"
    barrel
    barrelModelPath = "models/CanonBarrel.glb"
    canonBall
    canonBallModelPath = "models/CanonBall.glb"
    destroyedCanon
    destroyedCanonModelPath = "models/DestroyedCanon.glb"
    vehicle
    speed = 10
    isShooting = false
    isDestroyed = false
    isLoaded = true
    shotAudioEntity
    explosionAudioEntity
    removalTimeout = 3
    vehicleCollisionEntity

    constructor(position){
        this.initBase(position)
        this.initBarrel(position)
        this.initCanonBall(position)
        this.initSound()
        this.initVehicleCollisionEntity()

        this.vehicle = gameContext.getVehicle()

        engine.addSystem(this)
    }

    update(dt: number){
        const vehiclePosition = this.vehicle.getGlobalPosition()
        const baseTransform = this.base.getComponent(Transform)

        baseTransform.lookAt(vehiclePosition)
        this.barrel.getComponent(Transform).lookAt(vehiclePosition)

        baseTransform.rotation.eulerAngles = new Vector3(
            0,
            baseTransform.rotation.eulerAngles.y,
            0
        )

        if(!this.isDestroyed){
            return
        }

        this.removalTimeout -= dt

        if(this.removalTimeout > 0){
            return
        }

        if(gameContext.gameEnded){
            return
        }

        gameContext.getEventManager().fireEvent(new EntityDestroyed(this))
        this.removeSelf()
    }

    initBase(position){
        let triggerShape

        this.base = Misc.createGTLFShape(this.baseModelPath, position)
        this.base.getComponent(Transform).scale = new Vector3(5, 5, 5)

        this.base.addComponent(
            new Utils.Interval(1000, () => {this.shoot()})
        )

        triggerShape = new Utils.TriggerBoxShape()
        triggerShape.size = new Vector3(2, 4, 6)

        this.base.addComponent(new Utils.TriggerComponent(
            triggerShape,
            {
                triggeredByLayer: TriggerLayers.BEAM,
                enableDebug: false,
                onTriggerEnter: () => {this.onBeamTriggerEnter()}
            }
        ))
    }

    initBarrel(position){
        this.barrel = Misc.createGTLFShape(this.barrelModelPath, position)
        this.barrel.getComponent(Transform).scale = new Vector3(5, 5, 5)
    }

    initCanonBall(position){
        let triggerShape = new Utils.TriggerSphereShape()

        this.canonBall = Misc.createGTLFShape(this.canonBallModelPath, position)
        this.canonBall.getComponent(Transform).scale = new Vector3(0.8, 0.8, 0.8)
        this.canonBall.getComponent(GLTFShape).visible = false

        triggerShape.radius = this.canonBall.getComponent(Transform).scale.x

        this.canonBall.addComponent(new Utils.TriggerComponent(
            triggerShape,
            {
                triggeredByLayer: TriggerLayers.VEHICLE,
                onTriggerEnter: () => {
                    if(!this.isLoaded){
                        return
                    }

                    this.onVehicleTriggerEnter()
                }
            }
        ))
    }

    initSound(){
        const movementAudioClip = new AudioClip("sounds/shot.mp3")
        const movementAudioSource = new AudioSource(movementAudioClip)
        const explosionAudioClip = new AudioClip("sounds/explosion.mp3")
        const explosionAudioSource = new AudioSource(explosionAudioClip)

        this.shotAudioEntity = Misc.createEmptyEntity(this.base.getComponent(Transform).position)
        this.explosionAudioEntity = Misc.createEmptyEntity(this.base.getComponent(Transform).position)

        this.shotAudioEntity.addComponent(movementAudioSource)
        this.explosionAudioEntity.addComponent(explosionAudioSource)
    }

    initVehicleCollisionEntity(){
        let triggerShape

        this.vehicleCollisionEntity = Misc.createEmptyEntity(this.base.getComponent(Transform).position)

        triggerShape = new Utils.TriggerBoxShape()
        triggerShape.size = new Vector3(10, 15, 10)

        this.vehicleCollisionEntity.addComponent(new Utils.TriggerComponent(
            triggerShape,
            {
                triggeredByLayer: TriggerLayers.VEHICLE,
                onTriggerEnter: () => {
                    if(!this.isLoaded){
                        return
                    }

                    gameContext.getEventManager().fireEvent(new VehicleHit(3))
                },
                enableDebug: false                
            }
        ))
    }

    load(){
        this.base.getComponent(GLTFShape).visible = true
        this.barrel.getComponent(GLTFShape).visible = true
        this.canonBall.getComponent(GLTFShape).visible = true

        this.isLoaded = true
    }

    unload(){
        this.base.getComponent(GLTFShape).visible = false
        this.barrel.getComponent(GLTFShape).visible = false
        this.canonBall.getComponent(GLTFShape).visible = false

        this.isLoaded = false
    }

    playShotSound(){
        // this.audioEntity.getComponent(Transform).position = Camera.instance.position
        this.shotAudioEntity.getComponent(AudioSource).playOnce()
    }

    playExplosionSound(){
        this.explosionAudioEntity.getComponent(AudioSource).playOnce()
    }

    shoot(){
        if(this.isShooting){
            return
        }

        if(this.isDestroyed){
            return
        }

        if(!this.vehicle.isStarted){
            return
        }

        this.isShooting = true

        const vehiclePosition = this.vehicle.getGlobalPosition()
        const baseTransform = this.base.getComponent(Transform)
        const time = Misc.getDistanceBetweenPoints3D(baseTransform.position, vehiclePosition) / this.speed

        baseTransform.lookAt(vehiclePosition)
        this.barrel.getComponent(Transform).lookAt(vehiclePosition)

        baseTransform.rotation.eulerAngles = new Vector3(
            0,
            baseTransform.rotation.eulerAngles.y,
            0
        )

        this.canonBall.getComponent(GLTFShape).visible = true

        this.canonBall.addComponentOrReplace(new Utils.MoveTransformComponent(
            baseTransform.position,
            vehiclePosition,
            time,
            () => {this.onCanonBallMovementEnded()}
        ))

        this.playShotSound()
    }

    onCanonBallMovementEnded(){
        this.canonBall.getComponent(GLTFShape).visible = false
        this.isShooting = false
    }

    onBeamTriggerEnter(){
        // gameContext.getEventManager().fireEvent(new EntityDestroyed(this))
        this.destroyedCanon = Misc.createGTLFShape(this.destroyedCanonModelPath, this.base.getComponent(Transform).position)
        this.destroyedCanon.getComponent(Transform).scale = this.base.getComponent(Transform).scale
        this.base.getComponent(GLTFShape).visible = false
        this.barrel.getComponent(GLTFShape).visible = false
        this.canonBall.getComponent(GLTFShape).visible = false
        this.isDestroyed = true
        this.playExplosionSound()
        new SmokeRingAnimation(this.base.getComponent(Transform).position)
        new ShrapnelAnimation(this.base.getComponent(Transform).position)
        // this.removeSelf()
    }

    onVehicleTriggerEnter(){
        gameContext.getEventManager().fireEvent(new VehicleHit(1))
    }

    removeSelf(){
        engine.removeEntity(this.base)
        engine.removeEntity(this.barrel)
        engine.removeEntity(this.canonBall)
        engine.removeEntity(this.destroyedCanon)
        engine.removeEntity(this.shotAudioEntity)
        engine.removeEntity(this.explosionAudioEntity)
        engine.removeSystem(this)
    }
}

export class Cloud{
    entity
    modelPath = "models/Wind2.glb"
    origin
    destination
    time
    isLoaded = true

    constructor(origin, destination = new Vector3(0, 0, 0), time = 0){
        this.origin = origin
        this.destination = destination
        this.time = time
        this.entity = Misc.createGTLFShape(this.modelPath, origin)

        this.entity.getComponent(Transform).scale = new Vector3(2, 2, 2)
        this.entity.getComponent(Transform).rotation.eulerAngles = new Vector3(0, Math.random() * 360, 0)
    }

    setScale(scale){
        this.entity.getComponent(Transform).scale = scale
    }

    start(){
        this.entity.addComponent(new Utils.MoveTransformComponent(this.origin, this.destination, this.time, () => {
            this.start()
        }))
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

export class WindArea {
    entity
    modelPath = "models/WindColumn.glb"
    position
    sideSize
    enabled = true
    entityLimit = 0
    baseTravelTime = 40
    minimumTravelTime = 10
    vehicle
    debugEntity
    isDebugging = false
    entities = []
    isLoaded = true

    constructor(position, sideSize){
        let center

        this.position = position
        this.sideSize = sideSize
        this.vehicle = gameContext.getVehicle()

        center = new Vector3(position.x + sideSize / 2, position.y, position.z + sideSize / 2)

        this.entity = Misc.createGTLFShape(this.modelPath, center)
        this.entity.getComponent(Transform).scale = new Vector3(2, 3, 2)

        if(this.isDebugging){
            this.initDebugEntities(position, sideSize)
        }

        this.initEntities()

        engine.addSystem(this)
    }

    initDebugEntities(position, sideSize){
        Misc.createCube(position)
        Misc.createCube(new Vector3(position.x, 1, position.z + sideSize))
        Misc.createCube(new Vector3(position.x + sideSize, 1, position.z))
        Misc.createCube(new Vector3(position.x + sideSize, 1, position.z + sideSize))
    }

    initEntities(){
        let origin
        let destination
        let time
        let entity

        for(let i = 0; i < this.entityLimit; i++){
            origin = new Vector3(
                this.sideSize / 2,
                10,
                this.sideSize / 2
            )
            destination = new Vector3(origin.x, 75, origin.z)
            time = this.minimumTravelTime + this.baseTravelTime * Math.random()
            entity = new Cloud(origin, destination, time)

            entity.start()
            this.entities.push(entity)
        }
    }

    load(){
        this.entity.getComponent(GLTFShape).visible = true
        this.isLoaded = true
    }

    unload(){
        this.entity.getComponent(GLTFShape).visible = false
        this.isLoaded = false
    }

    update(dt: number) {
        if(!this.enabled){
            return
        }

        if(!this.isLoaded){
            return
        }

        this.updateVehiclePosition()
    }

    updateVehiclePosition(){
        if(!this.isVehicleInArea()){
            return this.vehicle.disableRising()
        }

        this.vehicle.enableRising()
    }

    isVehicleInArea(){
        const vehiclePosition = this.vehicle.getGlobalPosition()

        return (
            vehiclePosition.x >= this.position.x &&
            vehiclePosition.x <= this.position.x + this.sideSize &&
            vehiclePosition.z >= this.position.z &&
            vehiclePosition.z <= this.position.z + this.sideSize
        )
    }

    removeSelf(){
        engine.removeEntity(this.entity)

        console.log("Wind column removed")
    }
}

export class Building {
    entity
    modelPath = "models/Building.glb"
    destroyedBuildingEntity
    destroyedBuildingModelPath = "models/DestroyedBuilding.glb"
    isDestroyed = false
    isLoaded = true
    removalTimeout = 3
    explosionAudioEntity
    vehicleCollisionEntity

    constructor(position){
        this.entity = Misc.createGTLFShape(this.modelPath, position)
        this.destroyedBuildingEntity = Misc.createGTLFShape(this.destroyedBuildingModelPath, this.entity.getComponent(Transform).position)
        this.destroyedBuildingEntity.getComponent(GLTFShape).visible = false
        this.initTriggerShape()
        this.initVehicleCollisionEntity()
        this.initSound()

        engine.addSystem(this)
    }

    update(dt: number){
        if(!this.isDestroyed){
            return
        }

        this.removalTimeout -= dt

        if(this.removalTimeout > 0){
            return
        }

        if(gameContext.gameEnded){
            return
        }

        gameContext.getEventManager().fireEvent(new EntityDestroyed(this))
        this.removeSelf()
    }

    initTriggerShape(){
        const triggerShape = new Utils.TriggerBoxShape()

        triggerShape.size = new Vector3(5, 4, 5)

        this.entity.addComponent(
            new Utils.TriggerComponent(
                triggerShape,
                {
                    triggeredByLayer: TriggerLayers.BEAM,
                    onTriggerEnter: () => {this.onTriggerEnter()},
                    enableDebug: true
                }
            )
        )
    }

    initVehicleCollisionEntity(){
        let triggerShape

        this.vehicleCollisionEntity = Misc.createEmptyEntity(this.entity.getComponent(Transform).position)

        triggerShape = new Utils.TriggerBoxShape()
        triggerShape.size = new Vector3(12, 26, 12)

        this.vehicleCollisionEntity.addComponent(new Utils.TriggerComponent(
            triggerShape,
            {
                triggeredByLayer: TriggerLayers.VEHICLE,
                onTriggerEnter: () => {
                    if(!this.isLoaded){
                        return
                    }

                    gameContext.getEventManager().fireEvent(new VehicleHit(3))
                },
                enableDebug: false                
            }
        ))
    }

    initSound(){
        const explosionAudioClip = new AudioClip("sounds/explosion.mp3")
        const explosionAudioSource = new AudioSource(explosionAudioClip)

        this.explosionAudioEntity = Misc.createEmptyEntity(this.entity.getComponent(Transform).position)
        this.explosionAudioEntity.addComponent(explosionAudioSource)
    }

    load(){
        this.entity.getComponent(GLTFShape).visible = true
        this.isLoaded = true
    }

    unload(){
        this.entity.getComponent(GLTFShape).visible = false
        this.isLoaded = false
    }

    playExplosionSound(){
        this.explosionAudioEntity.getComponent(AudioSource).playOnce()
    }

    removeSelf(){
        engine.removeEntity(this.entity)
        engine.removeEntity(this.destroyedBuildingEntity)
        engine.removeSystem(this)

        console.log("Building removed")
    }

    onTriggerEnter(){
        this.destroyedBuildingEntity.getComponent(GLTFShape).visible = true
        this.entity.getComponent(GLTFShape).visible = false
        this.isDestroyed = true
        this.playExplosionSound()
    }
}

export class Road {
    entity
    modelPath = "models/Road.glb"
    isLoaded = true

    constructor(position){
        this.entity = Misc.createGTLFShape(this.modelPath, position)
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

export class Spawner {
    static windAreaCount = 0
    static maxWindAreas = 1
    entity
    position
    vehicle
    isDebugging = false
    isLoaded = true
    spawnerSideSize = 21.33
    eventManager
    spawnTimer = 0
    spawnCooldown = 5
    timerStarted = false

    constructor(position){
        this.eventManager = gameContext.getEventManager()

        this.position = position
        this.vehicle = gameContext.getVehicle()

        if(this.isDebugging){
            Misc.createCube(position)
        }

        gameContext.registerEntityDestroyedObserver(this)

        engine.addSystem(this)
    }

    load(){
        this.entity.load()
        this.isLoaded = true
    }

    unload(){
        this.entity.unload()
        this.isLoaded = false
    }

    removeSelf(){
        try {
            this.entity.removeSelf()
        } catch (error) {
            console.log("Failed to remove entity from spawner")
        }

        engine.removeSystem(this)
    }

    update(dt: number){
        if(!this.timerStarted){
            return
        }

        this.spawnTimer += dt

        if(this.spawnTimer < this.spawnCooldown){
            return
        }

        if(gameContext.gameEnded){
            return
        }

        this.timerStarted = false
        this.spawnRandomEntity()
    }

    getTopLeftPosition(){
        const step = this.spawnerSideSize / 2

        return new Vector3(this.position.x - step, this.position.y, this.position.z - step)
    }

    spawnNext(){
        if(!this.isLoaded){
            return
        }

        this.spawnTimer = 0
        this.timerStarted = true
    }

    spawnRandomEntity(){
        if(!this.isLoaded){
            return
        }

        const roll = Math.random()

        if(Spawner.windAreaCount < Spawner.maxWindAreas){
            return this.spawnWindArea()
        }

        if(roll <= 0.6 ){
            return this.spawnCanon()
        }

        this.spawnBuilding()
    }

    spawnCanon(){
        this.entity = new Canon(this.position)
    }

    spawnBuilding(){
        this.entity = new Building(this.position)
    }

    spawnWindArea(){
        this.entity = new WindArea(this.getTopLeftPosition(), 15)
        Spawner.windAreaCount++
    }

    onEntityDestroyed(entity){
        if(entity != this.entity){
            return
        }

        if(!this.isLoaded){
            return
        }

        this.eventManager.fireEvent(new SpawnerEntityDestroyed(this))
    }
}

class UI {
    static singleton = null
    canvas
    maxLives
    livesIcons = []
    disabledIcons = []
    lifeIconTexture = new Texture("images/LifeIcon2.png")
    livesIconsContainer
    oldScore = 0
    newScore = 0
    scoreContainer
    scoreText
    scoreLabelLength = 6
    isLoaded = true

    constructor(maxLives){
        this.maxLives = maxLives
        this.canvas = new UICanvas()
        
        this.initLivesIcons()
        this.initScoreText()
        this.initEventListeners()

        engine.addSystem(this)
    }

    static getInstance(maxLives){
        if(UI.singleton != null){
            UI.singleton.reset()
            return UI.singleton
        }

        return new UI(maxLives)
    }

    removeSelf(){
        this.unload()
    }

    reset(){
        this.oldScore = 0
        this.newScore = 0

        this.updateScoreLabel()
        this.resetLivesIcons()
    }

    resetLivesIcons(){
        const disabledIconsCount = this.disabledIcons.length
        let icon

        for(let i = 0; i < disabledIconsCount; i++){
            icon = this.disabledIcons.pop()
            this.livesIcons.push(icon)
            icon.visible = true
        }
    }

    update(dt: time){
        if(this.newScore > this.oldScore){
            this.oldScore += 100
        } else if(this.newScore < this.oldScore){
            this.oldScore -= 100
        }

        this.updateScoreLabel()
    }

    updateScoreLabel(){
        let scoreString = this.oldScore.toString()
        let leadingZeroesCount = this.scoreLabelLength - scoreString.length
        let leadingZeroesString = ""

        for(let i = 0; i < leadingZeroesCount; i++){
            leadingZeroesString += "0"
        }

        this.scoreText.value = leadingZeroesString + scoreString
    }

    initLivesIcons(){
        this.livesIconsContainer = new UIContainerStack(this.canvas)
        this.livesIconsContainer.stackOrientation = UIStackOrientation.HORIZONTAL
        this.livesIconsContainer.vAlign = "top"
        this.livesIconsContainer.hAlign = "right"

        let icon

        for(let i = 0; i < this.maxLives; i++){
            icon = new UIImage(this.livesIconsContainer, this.lifeIconTexture)
            icon.vAlign = "top"
            icon.hAlign = "left"
            icon.width = "64px"
            icon.height = "64px"
            icon.sourceWidth = 140
            icon.sourceHeight = 155
            this.livesIcons.push(icon)
        }
    }

    initScoreText(){
        this.scoreContainer = new UIContainerStack(this.canvas)
        this.scoreContainer.stackOrientation = UIStackOrientation.VERTICAL
        this.scoreContainer.vAlign = "top"

        this.scoreText = new UIText(this.scoreContainer)
        this.scoreText.value = "000000"
        this.scoreText.vAlign = "top"
        this.scoreText.fontSize = "32px"
    }

    initEventListeners(){
        const eventManager = gameContext.getEventManager()

        eventManager.addListener(PlayerHPChanged, null, ({newHP}) => {this.onPlayerHPChanged(newHP)})
        eventManager.addListener(ScoreChanged, null, ({newScore}) => {this.onScoreChanged(newScore)})
    }

    load(){
        // for(let i = 0; i < this.livesIcons.length; i++){
        //     this.livesIcons[i].visible = false
        // }

        this.livesIconsContainer.visible = true
        this.scoreContainer.visible = true

        this.isLoaded = true
    }

    unload(){
        this.livesIconsContainer.visible = false
        this.scoreContainer.visible = false

        this.isLoaded = false
    }

    onPlayerHPChanged(newHP){
        if(this.livesIcons.length <= 0){
            return
        }

        if(newHP < 0){
            newHP = 0
        }

        const difference = this.livesIcons.length - newHP
        let icon

        for(let i = 0; i < difference; i++){
            icon = this.livesIcons.pop()
            this.disabledIcons.push(icon)
            icon.visible = false
        }
    }

    onScoreChanged(newScore){
        this.newScore = newScore
    }
}

class DamageOverlay {
    canvas
    overlay
    overlayTexture = new Texture("images/DamageOverlay.png")

    constructor(){
        this.canvas = new UICanvas()
        this.overlay = new UIImage(this.canvas, this.overlayTexture)
        
        // console.log(this.overlayTexture.hasAlpha)

        this.overlay.sourceWidth = 512
        this.overlay.sourceHeight = 512
        this.overlay.width = "100%"
        this.overlay.height = "100%"
    }
}

export class Capsule {
    static singleton = null
    entity
    modelPath = "models/capsule.glb"
    audioEntity
    isStarted = false

    constructor(){
        this.entity = Misc.createGTLFShape(this.modelPath, new Vector3(32, 60, 32))
        this.entity.getComponent(Transform).scale = new Vector3(5, 5, 5)
        this.entity.getComponent(GLTFShape).visible = false

        this.initSound()

        engine.addSystem(this)
    }

    static preload(){
        this.getInstance()
    }

    static getInstance(){
        if(Capsule.singleton != null){
            return Capsule.singleton
        }

        Capsule.singleton = new Capsule()

        return Capsule.singleton
    }

    update(dt: number){
        if(!this.isStarted){
            return
        }

        const distance = Misc.getDistanceBetweenPoints3D(this.entity.getComponent(Transform).position, Camera.instance.position)

        if(distance > 10){
            movePlayerTo(this.entity.getComponent(Transform).position)
        }
    }

    initSound(){
        const clip = new AudioClip("sounds/hovermobile.mp3")
        const source = new AudioSource(clip)
        source.loop = true

        this.entity.addComponent(source)
    }

    start(){
        const playerPosition = Camera.instance.position
        const path = []

        this.entity.getComponent(GLTFShape).visible = true
        this.entity.getComponent(Transform).position = new Vector3(playerPosition.x, playerPosition.y - 5, playerPosition.z)

        path[0] = playerPosition
        path[1] = new Vector3(32, 10, 32)
        path[2] = new Vector3(32, 60, 32)

        this.entity.addComponent(new Utils.FollowPathComponent(path, 20, () => {
            this.isStarted = false
            this.entity.getComponent(AudioSource).playing = false
            gameContext.getEventManager().fireEvent(new CapsuleMovementEnded())
        }))

        this.entity.getComponent(AudioSource).playOnce()

        this.isStarted = true
    }

    removeSelf(){
        // engine.removeEntity(this.entity)
        this.entity.getComponent(GLTFShape).visible = false
        this.entity.getComponent(Transform).position = new Vector3(32, 70, 32)
    }
}

class Mothership {
    entity
    modelPath = "models/mothership.glb"

    constructor(){
        this.entity = Misc.createGTLFShape(this.modelPath, new Vector3(32, 60, 32))
        this.entity.getComponent(Transform).scale = new Vector3(15, 5, 15)
    }

    removeSelf(){
        engine.removeEntity(this.entity)
    }
}

class AlienCostume {
    entity
    modelPath = "models/AlienCostume.glb"

    constructor(){
        let cameraRotation = Camera.instance.rotation.eulerAngles

        this.entity = Misc.createGTLFShape(this.modelPath, Camera.instance.feetPosition)
        this.entity.getComponent(Transform).scale = new Vector3(1, 1, 1)
        this.entity.getComponent(Transform).rotation.eulerAngles = new Vector3(0, cameraRotation.y, 0)
    }

    removeSelf(){
        engine.removeEntity(this.entity)
    }
}

export class AlienMinigame {
    ground
    groundTexturePath = "textures/GroundTexture.png"
    roads = []
    vehicleStartPosition = new Vector3(32, 55, 32) 
    vehicle = new Vehicle(this.vehicleStartPosition)
    clouds = []
    cars = []
    bird
    eventManager
    entityDestroyedObservers = []
    gameEnded = false
    spawners = []
    points = 0
    pointObjective = 50000
    playerHP = 3
    ui
    isLoaded = true
    mothership
    capsule
    alienCostume
    sandPatches = []

    constructor(){
        this.eventManager = new EventManager()
        gameContext = this

        this.initEventListeners()
        this.initRoads()
        this.initGround()
        this.initSpawners()
        // this.initClouds()
        this.initCars()
        this.initBird()
        this.initUI()
        this.initMothership()
        this.initSandPatches()
        this.initCapsule()
    }

    load(){
        this.loadGround()
        this.loadRoads()
        this.loadVehicle()
        this.loadClouds()
        this.loadCars()
        this.loadBird()
        this.loadSpawners()
        this.loadUI()
        this.reset()

        this.isLoaded = true
    }

    reset(){
        this.playerHP = 3
        this.points = 0
        this.gameEnded = false
        this.vehicle.setPosition(this.vehicleStartPosition)
        this.vehicle.addPlayer()

        this.ui.reset()
    }

    unload(){
        this.isLoaded = false

        this.unloadGround()
        this.unloadRoads()
        this.unloadVehicle()
        this.unloadClouds()
        this.unloadCars()
        this.unloadBird()
        this.unloadSpawners()
        this.unloadUI()
    }

    removeSelf(){
        engine.removeEntity(this.ground)
        engine.removeEntity(this.sandPatches[0])
        engine.removeEntity(this.sandPatches[1])
        engine.removeEntity(this.sandPatches[2])
        // engine.removeEntity(this.sandPatches[3])
        // engine.removeEntity(this.sandPatches[4])

        this.vehicle.removeSelf()
        this.bird.removeSelf()
        this.ui.removeSelf()
        // this.mothership.removeSelf()
        this.capsule.removeSelf()
        // this.alienCostume.removeSelf()

        for(let i = 0; i < this.roads.length; i++){
            this.roads[i].removeSelf()
        }

        // for(let i = 0; i < this.clouds.length; i++){
        //     this.clouds[i].removeSelf()
        // }

        for(let i = 0; i < this.cars.length; i++){
            this.cars[i].removeSelf()
        }

        for(let i = 0; i < this.spawners.length; i++){
            this.spawners[i].removeSelf()
        }
    }

    registerEntityDestroyedObserver(observer){
        this.entityDestroyedObservers.push(observer)
    }

    initEventListeners(){
        this.eventManager.addListener(EntityDestroyed, null, ({entity}) => {this.onEntityDestroyed(entity)})
        this.eventManager.addListener(SpawnerEntityDestroyed, null, ({spawner}) => {this.onSpawnerEntityDestroyed(spawner)})
        this.eventManager.addListener(VehicleHit, null, ({damage}) => {this.onVehicleHit(damage)})
        this.eventManager.addListener(CapsuleMovementEnded, null, () => {this.onCapsuleMovementEnded()})
        this.eventManager.addListener(AlienSmokeAnimationEnded, null, () => {this.onAlienSmokeAnimationEnded()})
    }

    initRoads(){
        this.roads.push(new Road(new Vector3(32, 0.1, 4.7)))
        this.roads.push(new Road(new Vector3(32, 0.1, 14)))
        this.roads.push(new Road(new Vector3(32, 0.1, 23.3)))
        this.roads.push(new Road(new Vector3(32, 0.1, 32.6)))
        this.roads.push(new Road(new Vector3(32, 0.1, 41.9)))
        this.roads.push(new Road(new Vector3(32, 0.1, 51.2)))
        this.roads.push(new Road(new Vector3(32, 0.1, 59.3)))
    }

    initGround(){
        const groundMaterial = new Material()
        let triggerShape

        this.ground = Misc.createCube(new Vector3(32, 0, 32))
        this.ground.getComponent(Transform).scale = new Vector3(64, 0.1, 64)
        groundMaterial.albedoTexture = new Texture(this.groundTexturePath)
        this.ground.addComponent(groundMaterial)

        triggerShape = new Utils.TriggerBoxShape()
        triggerShape.size = new Vector3(64, 2, 64)

        this.ground.addComponent(new Utils.TriggerComponent(
            triggerShape,
            {
                triggeredByLayer: TriggerLayers.VEHICLE,
                onTriggerEnter: () => {
                    if(!this.isLoaded){
                        return
                    }

                    this.eventManager.fireEvent(new VehicleHit(3))
                }
            }
        ))
    }

    loadGround(){
        this.ground.getComponent(GLTFShape).visible = true
    }

    loadRoads(){
        for(let i = 0; i < this.roads.length; i++){
            this.roads[i].load()
        }
    }

    loadVehicle(){
        this.vehicle.load()
    }

    loadClouds(){
        for(let i = 0; i < this.clouds.length; i++){
            this.clouds[i].load()
        }
    }

    loadCars(){
        for(let i = 0; i < this.cars.length; i++){
            this.cars[i].load()
        }
    }

    loadBird(){
        this.bird.unload()
    }

    loadSpawners(){
        for(let i = 0; i < this.spawners.length; i++){
            this.spawners[i].load()
        }
    }

    loadUI(){
        this.ui.unload()
    }

    unloadGround(){
        this.ground.getComponent(GLTFShape).visible = false
    }

    unloadRoads(){
        for(let i = 0; i < this.roads.length; i++){
            this.roads[i].unload()
        }
    }

    unloadVehicle(){
        this.vehicle.unload()
    }

    unloadClouds(){
        for(let i = 0; i < this.clouds.length; i++){
            this.clouds[i].unload()
        }
    }

    unloadCars(){
        for(let i = 0; i < this.cars.length; i++){
            this.cars[i].unload()
        }
    }

    unloadBird(){
        this.bird.unload()
    }

    unloadSpawners(){
        for(let i = 0; i < this.spawners.length; i++){
            this.spawners[i].unload()
        }
    }

    unloadUI(){
        this.ui.unload()
    }

    initSpawners(){
        this.spawners.push(new Spawner(new Vector3(10.665, 0.1, 10.665)))
        this.spawners.push(new Spawner(new Vector3(10.665, 0.1, 31.995)))
        this.spawners.push(new Spawner(new Vector3(10.665, 0.1, 53.325)))
        this.spawners.push(new Spawner(new Vector3(53.325, 0.1, 10.665)))
        this.spawners.push(new Spawner(new Vector3(53.325, 0.1, 31.995)))
        this.spawners.push(new Spawner(new Vector3(53.325, 0.1, 53.325)))

        Misc.shuffleArray(this.spawners)

        for(let i = 0; i < this.spawners.length; i++){
            this.spawners[i].spawnRandomEntity()
        }
    }

    initClouds(){
        let cloud = new Cloud(new Vector3(15, 50, 15))
        cloud.setScale(new Vector3(4, 3, 4))

        this.clouds.push(cloud)

        cloud = new Cloud(new Vector3(32, 50, 32))
        cloud.setScale(new Vector3(4, 3, 4))

        this.clouds.push(cloud)

        cloud = new Cloud(new Vector3(43, 50, 25))
        cloud.setScale(new Vector3(4, 3, 4))

        this.clouds.push(cloud)
    }

    initCars(){
        this.cars[0] = new Car(new Vector3(30, 0.2, 50), new Vector3(30, 0.2, 10))
        this.cars[1] = new Car(new Vector3(34, 0.2, 50), new Vector3(34, 0.2, 10))
    }

    initBird(){
        this.bird = new Bird(new Vector3(7, 20, 7))
    }

    initUI(){
        // this.ui = new UI(this.playerHP)
        this.ui = UI.getInstance(this.playerHP)
    }

    initMothership(){
        this.mothership = new Mothership()
    }

    initSandPatches(){
        let scale = new Vector3(0.3, 0.3, 0.3)

        this.sandPatches[0] = Misc.createGTLFShape("models/sand1.glb", new Vector3(15, 0.1, 10))
        this.sandPatches[1] = Misc.createGTLFShape("models/sand2.glb", new Vector3(45, 0.1, 50))
        this.sandPatches[2] = Misc.createGTLFShape("models/sand3.glb", new Vector3(20, 0.1, 35))
        // this.sandPatches[3] = Misc.createGTLFShape("models/sand4.glb", new Vector3(40, 0.1, 40))
        // this.sandPatches[4] = Misc.createGTLFShape("models/sand5.glb", new Vector3(17, 0.1, 23))

        this.sandPatches[2].getComponent(Transform).scale = scale
        // this.sandPatches[3].getComponent(Transform).scale = scale
        // this.sandPatches[4].getComponent(Transform).scale = scale
    }

    initCapsule(){
        this.capsule = Capsule.getInstance()
        this.capsule.start()
    }

    getVehicle(){
        return this.vehicle
    }

    getEventManager(){
        return this.eventManager
    }

    handleVictory(){
        if(this.points < this.pointObjective){
            return
        }

        this.gameEnded = true
        this.eventManager.fireEvent(new PlayerWon())
    }

    onEntityDestroyed(entity){
        for(let i = 0; i < this.entityDestroyedObservers.length; i++){
            this.entityDestroyedObservers[i].onEntityDestroyed(entity)
        }

        if(entity instanceof Bird){
            this.onBirdDestroyed()
        } else if(entity instanceof Car){
            this.onCarDestroyed()
        } else if(entity instanceof Building){
            this.onBuildingDestroyed()
        } else if(entity instanceof Canon){
            this.onCanonDestroyed()
        }
    }

    onBirdDestroyed(){
        this.points -= 10000

        if(this.points < 0){
            this.points = 0
        }

        this.eventManager.fireEvent(new ScoreChanged(this.points))

        this.initBird()
        this.handleVictory()
    }

    onCarDestroyed(){
        this.points += 1000

        this.eventManager.fireEvent(new ScoreChanged(this.points))

        this.handleVictory()

        if(this.cars[0].isDestroyed && this.cars[1].isDestroyed){
            this.initCars()
        }
    }

    onBuildingDestroyed(){
        this.points += 1000

        this.eventManager.fireEvent(new ScoreChanged(this.points))

        this.handleVictory()
    }

    onCanonDestroyed(){
        this.points += 2000

        this.eventManager.fireEvent(new ScoreChanged(this.points))

        this.handleVictory()
    }

    onSpawnerEntityDestroyed(spawner){
        // if(this.gameEnded){
        //     return
        // }

        spawner.spawnNext()
    }

    onVehicleHit(damage){
        this.playerHP -= damage

        this.vehicle.playDamageTakenSound()
        this.eventManager.fireEvent(new PlayerHPChanged(this.playerHP))

        if(this.playerHP <= 0){
            this.onPlayerDied()
        }
    }

    onCapsuleMovementEnded(){
        // this.alienCostume = new AlienCostume()
        new AlienSmokeAnimation(Camera.instance.position)
        this.mothership.removeSelf()
    }

    onAlienSmokeAnimationEnded(){
        this.vehicle.addPlayer()
        this.vehicle.isStarted = true
        this.capsule.removeSelf()
    }

    onPlayerDied(){
        this.gameEnded = true
        this.eventManager.fireEvent(new PlayerLost())
    }
}

export class AlienMinigameTest{
    testMinigame

    constructor(){
        this.testMinigame = new AlienMinigame()
        // const testBuilding = new Building(new Vector3(5, 0.1, 5), 2, 3, 2)
        // const testWind = new WindArea(new Vector3(32, 0.1, 32), 15)
        // const testCanon = new Canon(new Vector3(45, 0, 45), this.testMinigame.vehicle)
        // const testCar = new Car(new Vector3(30, 0.2, 50), new Vector3(30, 0.2, 10))
        // const testCar2 = new Car(new Vector3(34, 0.2, 50), new Vector3(34, 0.2, 10))
        // const testBird = new Bird(new Vector3(7, 20, 7))
    }

    start(){
        this.testMinigame.vehicle.isStarted = true
    }
}