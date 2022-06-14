import * as Misc from "Misc"
import * as Utils from '@dcl/ecs-scene-utils'
import * as BowlMinigame from "BowlMinigame"
import {TriggerLayers} from "TriggerLayers"
import { movePlayerTo } from "@decentraland/RestrictedActions"

export const BEAM_LAYER = 2

class RingInputArea {
    entity
    outerRadius
    innerRadius
    height
    isPlayerInArea = false

    constructor(position, outerRadius, innerRadius, height){
        this.entity = Misc.createEmptyEntity(position, false)
        this.outerRadius = outerRadius
        this.innerRadius = innerRadius
        this.height = height
    }

    setParent(parent){
        this.entity.setParent(parent)
    }

    getGlobalPosition(){
        return Misc.sumVec3(
            this.entity.getParent().getComponent(Transform).position, 
            this.entity.getComponent(Transform).position
        )
    }

    update(dt: number){
        const position = this.getGlobalPosition()
        const playerPosition = Camera.instance.feetPosition
        let distanceToPlayer

        if(playerPosition.y > (position.y + this.height)){
            this.isPlayerInArea = false
            return
        }

        if(playerPosition.y < position.y){
            this.isPlayerInArea = false
            return
        }

        distanceToPlayer = Misc.getDistanceBetweenPoints(
            new Vector2(position.x, position.z),
            new Vector2(playerPosition.x, playerPosition.z)
        )

        if(distanceToPlayer <= this.innerRadius){
            this.isPlayerInArea = false
            return
        }

        if(distanceToPlayer > this.outerRadius){
            this.isPlayerInArea = false
            return
        }

        this.isPlayerInArea = true
    }

    getAngleToPlayer(){
        const position = this.entity.getComponent(Transform).position
        const playerPosition = Camera.instance.feetPosition

        return Math.atan2(playerPosition.z - position.z, playerPosition.x - position.x)
    }

    getDirectionToPlayer(){
        const position = this.entity.getParent().getComponent(Transform).position
        const playerPosition = Camera.instance.feetPosition

        return new Vector2(playerPosition.x - position.x, playerPosition.z - position.z).normalize()
    }

    getIsPlayerInArea(){
        return this.isPlayerInArea;
    }
}

class GravityRay {
    static nextRayID = 0
    id
    entity
    rayHeight
    lastEvent
    physicsCast = PhysicsCast.instance
    owner

    constructor(position, rayHeight, owner){
        this.id = GravityRay.nextRayID
        this.entity = Misc.createEmptyEntity(position, false)
        this.rayHeight = rayHeight
        this.owner = owner

        GravityRay.nextRayID +=1
    }

    setParent(parent){
        this.entity.setParent(parent)
    }

    cast(){
        const position = this.getGlobalPosition()
        const ray = this.physicsCast.getRayFromPositions(
            position,
            new Vector3(position.x, position.y - this.rayHeight, position.z)
        )

        this.physicsCast.hitAll(
            ray,
            (e) => {this.lastEvent = e},
            this.id
        )
    }

    getLastEvent(){
        return this.lastEvent
    }

    getGlobalPosition(){
        return Misc.sumVec3(
            this.owner.getGlobalPosition(), 
            this.entity.getComponent(Transform).position
        )
    }
}

class GravityCollisionSystem {
    pivot
    northRay
    eastRay
    southRay
    westRay
    physicsCast = PhysicsCast.instance
    rayHeight
    hasAnyRayHit = false
    gravity = 1
    rays
    owner
    slopeMovementFactor = 4
    hitEvent
    hitEvents = []

    constructor(position, scale, rayHeight, owner){
        this.pivot = Misc.createPivot(position, scale, false)
        this.rayHeight = rayHeight
        this.owner = owner

        this.initRays()
        this.rays = [this.northRay, this.eastRay, this.southRay, this.westRay]
    }

    update(dt: number){
        this.northRay.cast()
        this.eastRay.cast()
        this.southRay.cast()
        this.westRay.cast()

        this.updateCollisionMotion()
    }

    updateCollisionMotion(){
        const globalPosition = this.getGlobalPosition()
        let event
        let hitCount = 0

        this.collisionMotion = 0
        this.hitEvents = []

        for(let i = 0; i < this.rays.length; i++){
            event = this.rays[i].getLastEvent()

            if(event === undefined){
                continue
            }

            if(!event.didHit){
                continue
            }

            hitCount++
            this.hitEvent = event
            this.hitEvents.push(event)
        }

        this.hasAnyRayHit = hitCount > 0
    }

    getGlobalPosition(){
        return Misc.sumVec3(
            this.owner.getGlobalPosition(), 
            this.pivot.getComponent(Transform).position
        )
    }

    getCollisionMotion(){
        if(!this.hasAnyRayHit){
            return new Vector3(0, -this.gravity, 0)
        }

        // let collisionMotion = new Vector3(0, 0, 0)

        // for(let i = 0; i < this.hitEvents.length; i++){
        //     collisionMotion = Misc.sumVec3(collisionMotion, this.resolveHitEventMotion(this.hitEvents[i]))
        // }

        // return collisionMotion

        return this.resolveHitEventMotion(this.hitEvent)
    }

    resolveHitEventMotion(hitEvent){
        const collisionMotion = hitEvent.hitNormal

        if(collisionMotion.x == 0 && collisionMotion.z == 0){
            return new Vector3(0, 1, 0)
        }

        return new Vector3(
            collisionMotion.x * this.slopeMovementFactor, 
            collisionMotion.y * this.slopeMovementFactor, 
            collisionMotion.z * this.slopeMovementFactor
        )

    }

    resolveThrowerMotion(){
        const entity = this.hitEvent.entities[0].entity

        if(!entity.hasComponent(BowlMinigame.ThrowerComponent)){
            return new Vector3(0, -this.gravity, 0)
        }

        return entity.getComponent(BowlMinigame.ThrowerComponent).getMotion()
    }

    initRays(){
        this.northRay = new GravityRay(new Vector3(0, 0, 5), this.rayHeight, this)
        this.eastRay = new GravityRay(new Vector3(5, 0, 0), this.rayHeight, this)
        this.southRay = new GravityRay(new Vector3(0, 0, -5), this.rayHeight, this)
        this.westRay = new GravityRay(new Vector3(-5, 0, 0), this.rayHeight, this)

        this.northRay.setParent(this.pivot)
        this.eastRay.setParent(this.pivot)
        this.southRay.setParent(this.pivot)
        this.westRay.setParent(this.pivot)
    }

    setParent(parent){
        this.pivot.setParent(parent)
    }
}

class Beam {
    entity
    alpha = 0.5
    enabled = true
    triggerShape
    audioEntity

    constructor(parent){
        this.initEntity()
        this.setParent(parent)
        this.initSound()

        engine.addSystem(this)
    }

    initEntity(){
        this.entity = Misc.createCylinder(new Vector3(0, 0, 0), false)
        this.entity.getComponent(CylinderShape).withCollisions = false

        const material = new Material()
        material.albedoColor = new Color4(2, 0, 0, this.alpha)
        this.entity.addComponent(material)

        this.triggerShape = new Utils.TriggerBoxShape()

        this.entity.addComponent(
            new Utils.TriggerComponent(
                this.triggerShape,
                {
                    layer: TriggerLayers.BEAM,
                    enableDebug: false
                }
            )
        )
    }

    initSound(){
        const clip = new AudioClip("sounds/beam.mp3")
        const source = new AudioSource(clip)

        // this.audioEntity = Misc.createEmptyEntity(this.entity.getComponent(Transform).position)
        this.audioEntity = Misc.createEmptyEntity(this.entity.getParent().getComponent(Transform).position)
        this.audioEntity.addComponent(source)
        // this.audioEntity.setParent(this.entity.getParent())
    }

    update(dt: number){
        if(!this.enabled){
            return
        }

        let parent = this.entity.getParent()

        if(parent == null){
            parent = new Entity()
        }

        const parentHeight = Utils.getEntityWorldPosition(parent).y

        this.entity.getComponent(Transform).position.y = -parentHeight/2
        this.entity.getComponent(Transform).scale.y = parentHeight/2
        this.triggerShape.size.y = parentHeight
    }

    setParent(parent){
        this.entity.setParent(parent)
    }

    playSound(){
        this.audioEntity.getComponent(AudioSource).playOnce()
    }

    enable(){
        this.entity.getComponent(Utils.TriggerComponent).enabled = true
        this.entity.getComponent(CylinderShape).visible = true
        this.enabled = true

        this.playSound()
    }

    disable(){
        this.entity.getComponent(Utils.TriggerComponent).enabled = false
        this.entity.getComponent(CylinderShape).visible = false
        this.enabled = false
    }
}

export class Vehicle {
    pivot
    sphere
    platform
    inputArea
    speed = 15
    scale = 4
    sphereModelPath = "models/Sphere.glb"
    platformModelPath = "models/Platform.glb"
    isStarted = false
    isFiring = false
    isLoaded = true
    gravityCollisionSystem
    beam
    beamDuration = 2
    beamCooldown = 1
    beamTimer = 0
    beamCooldownTimer = 0
    raisingYVelocity = 5
    raisingMotion = new Vector3(0, 0, 0)
    maxHeight = 60
    damageTakenAudioEntity

    removeSelf(){
        engine.removeEntity(this.pivot)
        engine.removeSystem(this.inputArea)
        engine.removeSystem(this.gravityCollisionSystem)
    }

    constructor(position){
        this.initPivot(position)
        this.initParts()

        engine.addSystem(this)
    }

    addPlayer(){
        const pivotPosition = this.pivot.getComponent(Transform).position
        const position = new Vector3(pivotPosition.x, pivotPosition.y + 1, pivotPosition.z)

        movePlayerTo(position)
    }

    load(){
        this.pivot.visible = true
        this.isLoaded = true
    }

    unload(){
        this.pivot.visible = false
        this.isLoaded = false

        this.beam.disable()
    }

    update(dt: number){
        if(!this.isStarted){
            return
        }

        if(!this.isLoaded){
            return
        }

        this.handleMovement()
        this.updateBeamTimers(dt)
    }

    updateBeamTimers(dt){
        if(this.isFiring){
            this.beamTimer += dt
        } else {
            this.beamCooldownTimer += dt
        }

        if(this.beamTimer > this.beamDuration){
            this.isFiring = false
            this.beamTimer = 0
            this.beamCooldownTimer = 0
            this.beam.disable()
        }
    }

    enableRising(){
        if(this.getGlobalPosition().y > this.maxHeight){
            return this.disableRising()
        }

        this.raisingMotion.y = this.raisingYVelocity
    }

    disableRising(){
        this.raisingMotion.y = 0
    }

    handleMovement(){
        const position = this.pivot.getComponent(Transform).position
        let destination = Misc.getDirectionVector(position, new Vector3(32, position.y, 32))

        if(this.isWithinBoundaries()){
            destination = this.getInputMotion()
            destination = Misc.sumVec3(this.gravityCollisionSystem.getCollisionMotion(), destination)
            destination = Misc.sumVec3(this.raisingMotion, destination)
        }

        destination = Misc.sumVec3(destination, position)
        const moveComponent = new Utils.MoveTransformComponent(position, destination, 1)

        this.pivot.addComponentOrReplace(moveComponent)
    }

    isWithinBoundaries(){
        const position = this.pivot.getComponent(Transform).position

        return (
            position.x > 8 &&
            position.x < 56 &&
            position.z > 8 &&
            position.z < 56
        )
    }

    getGlobalPosition(){
        return this.pivot.getComponent(Transform).position
    }

    getInputMotion(){
        if(!this.inputArea.getIsPlayerInArea()){
            return new Vector3(0, 0, 0)
        }

        const direction = this.inputArea.getDirectionToPlayer()
        let destination = new Vector3(
            this.speed * direction.x,
            0,
            this.speed * direction.y
        )

        return destination
    }

    setPosition(position){
        this.pivot.getComponent(Transform).position = position
    }

    initPivot(position){
        const scale = new Vector3(1, 1, 1)
        this.pivot = Misc.createPivot(position, scale)
    }

    initParts(){
        this.initSphere()
        this.initPlatform()
        this.initInputArea()
        this.initBeam()
        this.initGravityCollisionSystem()
        this.initSound()
    }

    initSphere(){
        let triggerShape = new Utils.TriggerSphereShape()
        triggerShape.radius = this.scale

        this.sphere = Misc.createGTLFShape(this.sphereModelPath, new Vector3(0, 0, 0), false)
        this.sphere.getComponent(Transform).scale = new Vector3(this.scale, this.scale, this.scale)
        this.sphere.setParent(this.pivot)

        this.sphere.addComponent(new Utils.TriggerComponent(
            triggerShape,
            {
                layer: TriggerLayers.VEHICLE,
                enableDebug: false
            }
        ))

        this.sphere.addComponent(new OnPointerDown(
            (e) => {this.onPointerDown(e)}
        ))
    }

    initPlatform(){
        this.platform = Misc.createGTLFShape(this.platformModelPath, new Vector3(0, 0, 0), false)
        this.platform.getComponent(Transform).scale = new Vector3(this.scale, this.scale, this.scale)
        this.platform.setParent(this.pivot)

        this.platform.addComponent(new OnPointerDown(
            (e) => {this.onPointerDown(e)}
        ))
    }

    initInputArea(){
        const position = new Vector3(0, -1, 0)

        this.inputArea = new RingInputArea(position, 3, 2, 2)
        this.inputArea.setParent(this.pivot)
        
        engine.addSystem(this.inputArea)
    }

    initBeam(){
        this.beam = new Beam(this.pivot)
        this.beam.disable()
    }

    initGravityCollisionSystem(){
        const position = new Vector3(0, 4, 0)
        const scale = new Vector3(1, 1, 1)
        const rayHeight = 9

        this.gravityCollisionSystem = new GravityCollisionSystem(position, scale, rayHeight, this)
        this.gravityCollisionSystem.setParent(this.pivot)

        engine.addSystem(this.gravityCollisionSystem)
    }

    initSound(){
        const clip = new AudioClip("sounds/takingdamage.mp3")
        const source = new AudioSource(clip)

        this.damageTakenAudioEntity = Misc.createEmptyEntity(this.pivot.getComponent(Transform).position)
        this.damageTakenAudioEntity.addComponent(source)
    }

    playDamageTakenSound(){
        this.damageTakenAudioEntity.getComponent(AudioSource).playOnce()
    }

    onPointerDown(e){
        if(this.isFiring){
            return
        }

        if(this.beamCooldownTimer <= this.beamCooldown){
            return
        }

        this.isFiring = true
        this.beam.enable()
    }
}