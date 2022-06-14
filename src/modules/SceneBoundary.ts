import * as Misc from "Misc"
import * as Utils from '@dcl/ecs-scene-utils'

export const BOUNDARY_LAYER = 1

export class SceneBoundary {
    entity

    constructor(position, scale){
        this.entity = Misc.createEmptyEntity(position)
        this.initTriggerShape(scale)
    }

    initTriggerShape(scale){
        let triggerBox = new Utils.TriggerBoxShape()

        triggerBox.size = scale
        
        this.entity.addComponent(
            new Utils.TriggerComponent(
                triggerBox,
                {
                    layer: BOUNDARY_LAYER,
                    enableDebug: false
                }
            )
        )
    }
}