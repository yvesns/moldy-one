import * as Misc from "Misc"
import * as Utils from '@dcl/ecs-scene-utils'

@Component("throwerComponent")
export class ThrowerComponent {
    direction
    force

    constructor(direction, force){
        this.direction = direction
        this.force = force
    }

    getMotion(){
        return new Vector3(this.direction.x * this.force, this.direction.y * this.force, this.direction.z * this.force)
    }
}

class MarbleThrower {
    //'Sounds/DiskHigh.mp3'
    modelPath = "models/MarbleThrower.glb"
    entity
    scale = new Vector3(0.1, 0.2, 0.1)

    constructor(position){
        this.entity = Misc.createGTLFShape(this.modelPath, position, false)
        this.entity.getComponent(Transform).scale = this.scale

        this.entity.addComponent(new ThrowerComponent(new Vector3(0, 1, -1), 10))
    }

    setParent(parent){
        this.entity.setParent(parent)
    }

    rotate(rotation){
        this.entity.getComponent(Transform).rotation.eulerAngles = rotation
        this.entity.getComponent(ThrowerComponent).direction.rotate(rotation.toQuaternion())
    }
}

class MarbleThrowerSystem {
    pivot
    throwerNorth
    throwerEast
    throwerWest

    constructor(position){
        const throwerDistanceFromCenter = 0.18

        this.pivot = Misc.createPivot(position, new Vector3(4, 1, 4), false)
        
        this.throwerNorth = new MarbleThrower(new Vector3(position.x, position.y, position.z + throwerDistanceFromCenter))
        this.throwerEast = new MarbleThrower(new Vector3(position.x + throwerDistanceFromCenter, position.y, position.z))
        this.throwerWest = new MarbleThrower(new Vector3(position.x - throwerDistanceFromCenter, position.y, position.z))

        this.throwerEast.rotate(new Vector3(0, 90, 0))
        this.throwerWest.rotate(new Vector3(0, -90, 0))

        this.throwerNorth.setParent(this.pivot)
        this.throwerEast.setParent(this.pivot)
        this.throwerWest.setParent(this.pivot)
    }

    setParent(parent){
        this.pivot.setParent(parent)
    }
}

export class BowlMinigame {
    pivot
    bowlModelPath = "models/Bowl.glb"
    bowl
    marbleThrowerSystem

    constructor(position){
        this.pivot = Misc.createPivot(position)

        //this.bowl = Misc.createGTLFShape(this.bowlModelPath, position, false)
        this.bowl = Misc.createGTLFShape(this.bowlModelPath, new Vector3(0, 0, 0), false)
        this.marbleThrowerSystem = new MarbleThrowerSystem(new Vector3(0, -0.05, 0))

        this.bowl.setParent(this.pivot)
        this.marbleThrowerSystem.setParent(this.pivot)
        //this.pivot.getComponent(Transform).scale = new Vector3(19, 19, 19)
        this.pivot.getComponent(Transform).scale = new Vector3(17, 17, 17)
    }
}