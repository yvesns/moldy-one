class FadeSystem {
    colorRatio = 0
    colorStep = 0
    material
    color1
    color2

    constructor(object){
        this.material = object.getComponent(Material)
        this.color1 = new Color4(this.material.albedoColor.r, this.material.albedoColor.g, this.material.albedoColor.b, 0)
        this.color2 = new Color4(this.color1.r, this.color1.g, this.color1.b, 1)
    }

    update(dt: number) {
        this.material.albedoColor = Color4.Lerp(this.color1, this.color2, this.colorRatio)

        if(this.colorRatio >= 1){
            return engine.removeSystem(this)
        }

        if(this.colorRatio < 1){
            this.colorRatio += this.colorStep
        }
    }

    start(){
        engine.addSystem(this)
    }
}

export class FadeInSystem extends FadeSystem {
    constructor(object){
        super(object)
        this.colorRatio = 0
        this.colorStep = 0.1
    }
}

export class FadeOutSystem extends FadeSystem {
    constructor(object){
        super(object)
        this.colorRatio = 1
        this.colorStep = -0.1
    }
}