export function createCube(position, addToEngine = true) {
    const cube = new Entity()

    cube.addComponent(new Transform({ position: position }))
    cube.addComponent(new BoxShape())

    if(addToEngine){
        engine.addEntity(cube)
    }

    return cube
}

export function createPlane(position, addToEngine = true) {
    const plane = new Entity()

    plane.addComponent(new Transform({ position: position }))
    plane.addComponent(new PlaneShape())

    if(addToEngine){
        engine.addEntity(plane)
    }

    return plane
}

export function createCylinder(position, addToEngine = true) {
    const cylinder = new Entity()

    cylinder.addComponent(new Transform({ position: position }))
    cylinder.addComponent(new CylinderShape())

    if(addToEngine){
        engine.addEntity(cylinder)
    }

    return cylinder
}

export function createSphere(position, addToEngine = true) {
    const sphere = new Entity()

    sphere.addComponent(new Transform({ position: position }))
    sphere.addComponent(new SphereShape())

    if(addToEngine){
        engine.addEntity(sphere)
    }

    return sphere
}

export function createEmptyEntity(position, addToEngine = true) {
    const entity = new Entity()

    entity.addComponent(new Transform({ position: position }))

    if(addToEngine){
        engine.addEntity(entity)
    }

    return entity
}

export function createText(text: string, position: Vector3, addToEngine = true){
    let entity = new Entity()

    entity.addComponent(new Transform({ position: position }))
    entity.addComponent(new TextShape(text))
    
    if(addToEngine){
        engine.addEntity(entity)
    }

    return entity
}

export function createGTLFShape(path: string, position: Vector3, addToEngine = true){
    let entity = new Entity()

    entity.addComponent(new Transform({position: position}))
    entity.addComponent(new GLTFShape(path))
    
    if(addToEngine){
        engine.addEntity(entity)
    }

    return entity
}

export function createPivot(position, scale = new Vector3(1, 1, 1), addToEngine = true){
    const transform = new Transform({
        position: position,
        scale: scale
    })

    const pivot = new Entity()
    pivot.addComponentOrReplace(transform)

    if(addToEngine){
        engine.addEntity(pivot)
    }

    return pivot
}

export function shuffleArray(array){
    let currentIndex = array.length
    let randomIndex

    while(currentIndex > 0){
        randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex--

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
    }
}

export function getDistanceBetweenPoints(p1: Vector2, p2: Vector2){
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

export function getDistanceBetweenPoints3D(p1: Vector3, p2: Vector3){
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2))
}

export function sumVec3(v1: Vector3, v2: Vector3){
    return new Vector3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z)
}

export function subVec3(v1, v2){
    return new Vector3(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z)
}

export function mulVec3(v1: Vector3, v2: Vector3){
    return new Vector3(v1.x * v2.x, v1.y * v2.y, v1.z * v2.z)
}

export function getDirectionVector(v1, v2){
    return subVec3(v2, v1)
}