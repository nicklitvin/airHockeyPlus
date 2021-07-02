'use strict'

import Vector from './vector.js'

const ROUNDING_ERROR = 0.001

export default class PhysicsManager{
    constructor(serverW,serverH,players){
        this.serverW = serverW
        this.serverH = serverH
        this.players = players

        this.frictionConst = 0.85
        this.bounceStrength = 10
        this.objectBounceSpeedLimit = 100
        this.playerMoveSpeed = 15
        this.impulseMagnitude = 20
        this.impulseRadius = 1.5
    }

    // TODO: use private method
    getObjectById(lobby,objectId){
        let object
        if(objectId == 'ball'){
            object = lobby.ball
        }
        else{
            object = this.players.getInfo(objectId)
        }
        return(object)
    }

    // BOUNCE

    limitObjectBounceSpeed(player){
        const angle = Math.atan(player.dy/player.dx)
        player.dx = Math.sign(player.dx || 1)*Math.cos(angle)*
            this.objectBounceSpeedLimit
        player.dy = Math.sign(player.dx || 1)*Math.sin(angle)*
            this.objectBounceSpeedLimit
    }

    isObjectBounceTooFast(object){
        return( (object.dx**2+object.dy**2)**(1/2) >
            this.objectBounceSpeedLimit
        )
    }

    // IMPULSE

    isWithinImpulseRange(obj0,obj1){
        const dist = ( (obj0.x-obj1.x)**2 + (obj0.y-obj1.y)**2 )**(1/2)
        if(dist < this.impulseRadius){
            return(1)
        }
    }

    giveWallImpulse(player){
        const impulseMagnitude = this.impulseMagnitude

        //closest to which wall
        const yDist = Math.min(this.serverH-player.y,player.y)
        const xDist = Math.min(this.serverW-player.x,player.x)

        if(Math.abs(yDist-player.radius) < ROUNDING_ERROR){
            player.dy += Math.sign(this.serverH-2*player.y)*impulseMagnitude 
        }
        if(Math.abs(xDist-player.radius) < ROUNDING_ERROR){
            player.dx += Math.sign(this.serverW-2*player.x)*impulseMagnitude 
        }
    }

    givePlayersImpulse(player,lobby){
        const targetIds = lobby.userIds

        for(var targetId of targetIds){
            if(targetId == player.userId){
                continue
            }
            const target = this.players.getInfo(targetId)
            if(this.isWithinImpulseRange(player,target)){
                this.giveTargetBounce(player,target)
            }
        }
    }

    giveTargetBounce(giver,target,ballImpulseMagnitude=0){
        const impulseMagnitude = (ballImpulseMagnitude || this.impulseMagnitude)
    
        //1st quadrant angle
        const angle = Math.abs(Math.atan((target.y-giver.y)/(target.x-giver.x)))
        
        target.dy += Math.sign(target.y-giver.y)*Math.sin(angle)*impulseMagnitude
        target.dx += Math.sign(target.x-giver.x)*Math.cos(angle)*impulseMagnitude
    }

    giveBallImpulse(player,lobby){
        const ball = lobby.ball

        if(this.isWithinImpulseRange(player,ball)){
            this.giveTargetBounce(player,ball)
        }
    }

    // MOVE

    moveObject(obj,time){
        obj.x += obj.xMove*time
        obj.y += obj.yMove*time
        // this.roundXyPositions(obj)
        this.keepObjectWithinBoundary(obj)
    }

    keepObjectWithinBoundary(obj){
        if(obj.x + obj.radius > this.serverW){
            obj.x = this.serverW - obj.radius
        }
        if(obj.x - obj.radius < 0){
            obj.x = obj.radius
        }
        if(obj.y + obj.radius > this.serverH){
            obj.y = this.serverH - obj.radius
        }
        if(obj.y - obj.radius < 0){
            obj.y = obj.radius
        }
    }

    // TODO: consider refactoring.
    // roundSinglePosition(p) {
    //     return Math.round( p * 100 + Number.EPSILON ) / 100
    // }

    // roundXyPositionx(obj) {
    //     obj.x = self.roundSinglePosition(obj.x)
    //     obj.y = self.roundSinglePosition(obj.y)
    // }

    roundXyPositions(obj){
        // (obj.x, obj.y) = self.roundPosition(obj.x, obj.y)
        const digits = 4 
        const number = 10**digits

        obj.x = Math.round( obj.x * number + Number.EPSILON ) / number
        obj.y = Math.round( obj.y * number + Number.EPSILON ) / number
    }

    roundObjectDxDy(obj){
        obj.dx = Math.round( obj.dx * 100 + Number.EPSILON ) / 100
        obj.dy = Math.round( obj.dy * 100 + Number.EPSILON ) / 100
    }

    applyPlayerMoveInput(player){
        const playerSpeed = player.playerSpeed

        if(player.moveU && player.y - player.radius > ROUNDING_ERROR){
            player.yMove -= playerSpeed
        }
        else if(player.moveD &&
            player.y + player.radius < this.serverH - ROUNDING_ERROR)
        {
            player.yMove += playerSpeed
        }

        if(player.moveL && player.x - player.radius > ROUNDING_ERROR){
            player.xMove -= playerSpeed
        }
        else if(player.moveR &&
            player.x + player.radius < this.serverW - ROUNDING_ERROR)
        {
            player.xMove += playerSpeed
        }
    }

    makeXyMove(object){
        // only for player
        if(object.userId){
            this.applyPlayerMoveInput(object)
        }
        object.xMove += object.dx
        object.yMove += object.dy
    }

    setMoveSpeed(player){
        player.playerSpeed = this.playerMoveSpeed
        if( (player.moveU || player.moveD) && (player.moveL || player.moveR) ){
            player.playerSpeed *= Math.sqrt(2)/2
        }
    }

    deleteMoveContradictions(player){
        if(player.moveU && player.moveD){
            player.moveU = 0
            player.moveD = 0
        }
        if(player.moveL && player.moveR){
            player.moveL = 0
            player.moveR = 0
        }
    }

    // FRICTION
    
    resolveFriction(obj){
        obj.dx = this.applyFriction(obj.dx)
        obj.dy = this.applyFriction(obj.dy)
        this.roundObjectDxDy(obj)
    }

    applyFriction(objDxDy){
        if(Math.abs(objDxDy) < 0.01){
            objDxDy = 0
        }
        if(objDxDy){
            objDxDy *= this.frictionConst
        }
        return(objDxDy)
    }

    // WALL COLLISION

    getGameNextWallCollision(lobby){
        var objects = lobby.userIds.slice()
        if(lobby.ball){
            objects.push('ball')
        }

        let nextCollision
        for(var objectId of objects){
            const object = this.getObjectById(lobby,objectId)
            const time = this.getNextObjectWallCollisionTime(object)

            if(time >= 0 && (!nextCollision || time < nextCollision.time) ){
                nextCollision = {
                    'time': time,
                    'p1': object,
                    'type': 'wall'
                } 
            }
        }
        return(nextCollision)
    }

    getNextObjectWallCollisionTime(p1){
        const upTime = this.whenIsWallCollisionUp(p1)
        const downTime = this.whenIsWallCollisionDown(p1)
        const leftTime = this.whenIsWallCollisionLeft(p1)
        const rightTime = this.whenIsWallCollisionRight(p1)
        
        var legitTimes = []
        for(var time of [upTime,downTime,leftTime,rightTime]){
            if(time >= 0){
                legitTimes.push(time)
            }
        }

        return(Math.min(...legitTimes))
    }

    whenIsWallCollisionRight(p1){
        if(p1.xMove > 0 && p1.x + p1.radius + p1.xMove > this.serverW){
            const time = (this.serverW - p1.x - p1.radius)/p1.xMove
            return(time)
        }
    }

    whenIsWallCollisionLeft(p1){
        if(p1.xMove < 0 && p1.x - p1.radius + p1.xMove < 0){
            const time = (p1.radius - p1.x)/p1.xMove
            return(time)
        }
    }

    whenIsWallCollisionDown(p1){
        if(p1.yMove > 0 &&
            p1.y + p1.radius + p1.yMove > this.serverH)
        {
            const time = (this.serverH - p1.y - p1.radius)/p1.yMove
            return(time)
        }
    }

    whenIsWallCollisionUp(p1){
        if(p1.yMove < 0 && p1.y - p1.radius + p1.yMove < 0){
            const time = (p1.radius - p1.y)/p1.yMove
            return(time)
        }
    }

    // 2 OBJECT COLLISION

    getGameNext2ObjectCollision(lobby){
        const contacts = lobby.contacts
        var nextCollision = null

        for(var count = 0; count < contacts.length; count++){
            const contact = contacts[count]
            const p1 = this.getObjectById(lobby,contact[0])
            const p2 = this.getObjectById(lobby,contact[1])
            const time = this.getObjectCollisionTime(p1,p2)

            if(time >= 0 && (!nextCollision || time < nextCollision.time) ){
                nextCollision = {
                    'time': time,
                    'p1': p1,
                    'p2': p2,
                    'type': 'player'
                }
            }
        }
        return(nextCollision)
    }
    
    getObjectCollisionTime(obj1,obj2){
        // Speed differences.
        const Vx = obj2.xMove - obj1.xMove
        const Vy = obj2.yMove - obj1.yMove
        // Position differences.
        const Px = obj2.x-obj1.x
        const Py = obj2.y-obj1.y
        const squaredSumOfRadii = (obj1.radius + obj2.radius)**2

        const a = Vx**2 + Vy**2
        const b = 2*(Px*Vx + Py*Vy)
        const c = Px**2 + Py**2 - squaredSumOfRadii
        const discriminant = this.findDiscriminant(a,b,c)
        // console.log('discriminant',a,b,c)
        
        if(discriminant < 0){return}

        const times = this.findQuadraticRoot(a,b,c)
        
        if(times.length == 0){return}

        var time = this.whenIsNextRealObjectCollision(obj1,obj2,times)
        time = this.roundSmallToZero(time)
        
        if(time >= 0){
            return(time)
        }
    }

    whenIsNextRealObjectCollision(obj1,obj2,times){
        for(var time of times){
            const p1 = obj1.getInfoIn(time)
            const p2 = obj2.getInfoIn(time)

            const normalMoves = this.getNormalVectorsForCollision(p1,p2)
            const p1Info = {'position':p1,'normal':normalMoves.p1,'magnitude':normalMoves.p1Magnitude}
            const p2Info = {'position':p2,'normal':normalMoves.p2,'magnitude':normalMoves.p2Magnitude}
            
            if(
                this.isCollisionPossible(p1Info,p2Info) ||
                this.isCollisionPossible(p2Info,p1Info))
            {
                return(time)
            }
        }
    }

    // check if p1 normal greater than p2 normal speed
    isCollisionPossible(p1,p2){
        var timeX = -1
        var timeY = -1
        
        if(p1.normal.x){
            timeX = (p2.position.x - p1.position.x)/p1.normal.x
        }
        
        if(p1.normal.y){
            timeY = (p2.position.y - p1.position.y)/p1.normal.y
        }

        if( (timeX > 0 || timeY > 0) && 
            ((p1.magnitude > 0 && p1.magnitude > p2.magnitude) ||
            (p1.magnitude < 0 && p1.magnitude < p2.magnitude)) )
        {
            return(1)
        }
    }

    // CHANGE TRAJECTORY

    changeWallCollisionTrajectory(p1){
        if( Math.abs(p1.x + p1.radius - this.serverW) < ROUNDING_ERROR ||
            Math.abs(p1.x - p1.radius) < ROUNDING_ERROR)
        {
            p1.dx *= -1
        }
        
        if( Math.abs(p1.y + p1.radius - this.serverH) < ROUNDING_ERROR ||
            Math.abs(p1.y - p1.radius) < ROUNDING_ERROR)
        {
            p1.dy *= -1
        }
    }

    getUnitNormalVector(p1,p2){
        const xDistance = p2.x-p1.x
        const yDistance = p2.y-p1.y
        var vector = new Vector(xDistance,yDistance)
        vector.normalise()
        return(vector)
    }

    getUnitTangentVector(unitNormalVector){
        var tangentVector = new Vector(-1*unitNormalVector.y,unitNormalVector.x)
        tangentVector.normalise()
        return(tangentVector)
    }

    getNormalVectorsForCollision(p1,p2){
        const unitNormalVector = this.getUnitNormalVector(p1,p2)

        const p1MoveVector = new Vector(p1.xMove,p1.yMove)
        const p2MoveVector = new Vector(p2.xMove,p2.yMove)

        const p1Normal = unitNormalVector.dotProduct(p1MoveVector)
        const p2Normal = unitNormalVector.dotProduct(p2MoveVector)
        const P1NormalVector = unitNormalVector.multiply(p1Normal)
        const P2NormalVector = unitNormalVector.multiply(p2Normal)

        return({
            'p1': P1NormalVector,
            'p1Magnitude': p1Normal,
            'p2': P2NormalVector,
            'p2Magnitude': p2Normal
        })
    }

    // getVectorsAfterCollision(p1,p2){
    //     const unitNormalVector = this.getUnitNormalVector(p1,p2)
    //     const unitTangentVector = this.getUnitTangentVector(unitNormalVector)

    //     const p1MoveVector = new Vector(p1.xMove,p1.yMove)
    //     const p2MoveVector = new Vector(p2.xMove,p2.yMove)

    //     const p1Normal = unitNormalVector.dotProduct(p1MoveVector)
    //     const p2Normal = unitNormalVector.dotProduct(p2MoveVector)
    //     const p1Tangent = unitTangentVector.dotProduct(p1MoveVector)
    //     const p2Tangent = unitTangentVector.dotProduct(p2MoveVector)

    //     const newP1NormalVector = unitNormalVector.multiply(p2Normal)
    //     const newP2NormalVector = unitNormalVector.multiply(p1Normal)
    //     const newP1TangentVector = unitTangentVector.multiply(p1Tangent)
    //     const newP2TangentVector = unitTangentVector.multiply(p2Tangent)

    //     const newP1Vector = newP1NormalVector.add(newP1TangentVector)
    //     const newP2Vector = newP2NormalVector.add(newP2TangentVector)

    //     return({
    //         'p1': newP1Vector,
    //         'p2': newP2Vector
    //     })
    // }

    // testchangeObjectCollisionTrajectory(p1,p2){
    //     const newMoves = this.getVectorsAfterCollision(p1,p2)
    //     const newP1Vector = newMoves.p1
    //     const newP2Vector = newMoves.p2

    //     this.calculateNewDxDy(p1,newP1Vector.x,newP1Vector.y)
    //     this.calculateNewDxDy(p2,newP2Vector.x,newP2Vector.y)
    // }
    
    changeObjectCollisionTrajectory(p1,p2){
        const p1Dx = p1.dx
        const p2Dx = p2.dx
        const p1Dy = p1.dy
        const p2Dy = p2.dy

        const numerator1 = ( (p1.xMove - p2.xMove)*(p1.x-p2.x) + 
            (p1.yMove - p2.yMove)*(p1.y - p2.y) )
        const numerator2 = ( (p2.xMove - p1.xMove)*(p2.x-p1.x) + 
            (p2.yMove - p1.yMove)*(p2.y - p1.y) )
        const denominator = (p1.radius+p2.radius)**2

        const p1XChange = numerator1/denominator*(p1.x-p2.x)
        const p1YChange = numerator1/denominator*(p1.y-p2.y)
        const p2XChange = numerator2/denominator*(p2.x-p1.x)
        const p2YChange = numerator2/denominator*(p2.y-p1.y)
        
        const p1XFinal = p1.xMove - p1XChange 
        const p1YFinal = p1.yMove - p1YChange
        const p2XFinal = p2.xMove - p2XChange 
        const p2YFinal = p2.yMove - p2YChange

        this.calculateNewDxDy(p1,p1XFinal,p1YFinal)
        this.calculateNewDxDy(p2,p2XFinal,p2YFinal)
        this.didSomethingChange(p1,p2,p1Dx,p2Dx,p1Dy,p2Dy)
    }

    didSomethingChange(p1,p2,p1Dx,p2Dx,p1Dy,p2Dy){
        if(p1.dx == p1Dx && p2.dx == p2Dx && p1.dy == p1Dy && p2.dy == p2Dy){
            console.log(p1,p2)
            strictEqual(0,1)
        }
    }

    calculateNewDxDy(player,xFinal,yFinal){
        this.setNewDx(player,xFinal)
        this.setNewDy(player,yFinal)
    }

    setNewDy(player,yFinal){
        if( (player.moveD || player.moveU) && yFinal == 0){
            //do nothing
        }
        // resisting push
        else if( (player.moveD && yFinal < 0) || (player.moveU && yFinal > 0)){
            player.dy += yFinal
        }
        // move boost
        else if(player.moveD && yFinal > 0){
            player.dy = Math.max(yFinal - player.playerSpeed,0)
        }
        else if(player.moveU && yFinal < 0){
            player.dy = Math.min(yFinal + player.playerSpeed,0)
        }
        else{
            player.dy = yFinal
        }
    }

    setNewDx(player,xFinal){
        if( (player.moveR || player.moveL) && xFinal == 0){
            //do nothing
        }
        // resisting push
        else if( (player.moveR && xFinal < 0) || (player.moveL && xFinal > 0)){
            player.dx += xFinal
        }
        // move boosted
        else if(player.moveR && xFinal > 0){
            player.dx = Math.max(xFinal - player.playerSpeed,0)
        }
        else if(player.moveL && xFinal < 0){
            player.dx = Math.min(xFinal + player.playerSpeed,0)
        }
        else{
            player.dx = xFinal
        }
    }

    // CALCULATOR

    roundSmallToZero(number){
        if(number < 0 && number >= -1*ROUNDING_ERROR){
            return(0)
        }
        return(number)
    }

    findDiscriminant(a,b,c){
        return(b**2 - 4*a*c)
    }

    findQuadraticRoot(a,b,c){
        const discriminantRoot = Math.sqrt(b**2 - 4*a*c)
        const denominator = 2*a
        var small = (-b - discriminantRoot ) / denominator
        var big = (-b + discriminantRoot ) / denominator
        
        //cant divide by 0
        if(a == 0){
            return([])
        }

        for(var root of [small,big]){
            root = this.roundSmallToZero(root)
        }

        // non-negative time only
        if(small < -1*ROUNDING_ERROR){
            return([big])
        }

        return([small,big])
    }
}
    