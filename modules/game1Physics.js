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

    impulseOffWall(player){
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

    giveTargetBounce(giver,target){
        const impulseMagnitude = this.impulseMagnitude
    
        //1st quadrant angle
        const angle = Math.abs(Math.atan((target.y-giver.y)/(target.x-giver.x)))
        
        target.dy += Math.sign(target.y-giver.y)*Math.sin(angle)*impulseMagnitude/target.mass
        target.dx += Math.sign(target.x-giver.x)*Math.cos(angle)*impulseMagnitude/target.mass
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
        // obj.x = this.roundValue(obj.x)
        // obj.y = this.roundValue(obj.y)

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

        // obj.dx = this.roundValue(obj.dx)
        // obj.dy = this.roundValue(obj.dy)
    }

    applyFriction(objDxDy){
        if(Math.abs(objDxDy) < ROUNDING_ERROR){
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
            time = this.roundSmallNegativeToZero(time)
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
        const Vx = obj2.xMove - obj1.xMove
        const Vy = obj2.yMove - obj1.yMove
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
        time = this.roundSmallNegativeToZero(time)
        
        if(time != null && time >= 0){
            // console.log('timeForNextCollision')
            return(time)
        }
    }

    whenIsNextRealObjectCollision(obj1,obj2,times){
        for(var time of times){
            var p1 = obj1.getInfoIn(time)
            var p2 = obj2.getInfoIn(time)

            if(this.isNotWithinBoundary(p1) || this.isNotWithinBoundary(p2)){
                // console.log('denied')
                continue
            }
            // var distance = this.getDistanceBetweenTwoPoints(p1,p2)
            // console.log('prediction',p1,p2)

            const normalMoves = this.getNormalVectorsForCollision(p1,p2)
            const p1Info = {'position':p1,'normal':normalMoves.p1,'magnitude':normalMoves.p1Magnitude}
            const p2Info = {'position':p2,'normal':normalMoves.p2,'magnitude':normalMoves.p2Magnitude}

            if(
                this.isCollisionPossible(p1Info,p2Info) ||
                this.isCollisionPossible(p2Info,p1Info))
            {
                // console.log('timeOfCollision',time)
                return(time)
            }
        }
        return(null)
    }

    isNotWithinBoundary(obj){
        if( obj.x + obj.radius > this.serverW ||
            obj.x - obj.radius < 0 ||
            obj.y + obj.radius > this.serverH ||
            obj.y - obj.radius < 0)
        {
            return(1)
        }
        return(0)
    }

    // check if p1 normal greater than p2 normal speed
    isCollisionPossible(p1,p2){
        var timeX = -1
        var timeY = -1
        //sus
        if(p1.normal.x){
            timeX = (p2.position.x - p1.position.x)/p1.normal.x
        }
        
        if(p1.normal.y){
            timeY = (p2.position.y - p1.position.y)/p1.normal.y
        }

        if( (timeX > 0 || timeY > 0) && 
            ((p1.magnitude > 0 && p1.magnitude > p2.magnitude + ROUNDING_ERROR) ||
            (p1.magnitude < 0 && p1.magnitude < p2.magnitude + ROUNDING_ERROR)) )
        {
            return(1)
        }
    }

    // CHANGE TRAJECTORY

    changeWallCollisionTrajectory(p1){
        if( (Math.abs(p1.x + p1.radius - this.serverW) < ROUNDING_ERROR && p1.dx > 0) ||
            (Math.abs(p1.x - p1.radius) < ROUNDING_ERROR && p1.dx < 0) )
        {
            p1.dx *= -1
        }
        
        if( (Math.abs(p1.y + p1.radius - this.serverH) < ROUNDING_ERROR && p1.dy > 0) ||
            (Math.abs(p1.y - p1.radius) < ROUNDING_ERROR && p1.dy < 0))
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

    getVectorsAfterCollision(p1,p2){
        const unitNormalVector = this.getUnitNormalVector(p1,p2)
        const unitTangentVector = this.getUnitTangentVector(unitNormalVector)

        const p1MoveVector = new Vector(p1.xMove,p1.yMove)
        const p2MoveVector = new Vector(p2.xMove,p2.yMove)

        const p1Normal = unitNormalVector.dotProduct(p1MoveVector)
        const p2Normal = unitNormalVector.dotProduct(p2MoveVector)
        const p1Tangent = unitTangentVector.dotProduct(p1MoveVector)
        const p2Tangent = unitTangentVector.dotProduct(p2MoveVector)

        const newNormals = this.getElasticCollisionNewSpeeds(p1,p2,p1Normal,p2Normal)

        const newP1NormalVector = unitNormalVector.multiply(newNormals.p1)
        const newP2NormalVector = unitNormalVector.multiply(newNormals.p2)
        const newP1TangentVector = unitTangentVector.multiply(p1Tangent)
        const newP2TangentVector = unitTangentVector.multiply(p2Tangent)

        const newP1Vector = newP1NormalVector.add(newP1TangentVector)
        const newP2Vector = newP2NormalVector.add(newP2TangentVector)

        // console.log(newP1Vector,newP2Vector)

        return({
            'p1': newP1Vector,
            'p2': newP2Vector
        })
    }

    getElasticCollisionNewSpeeds(p1,p2,p1Speed,p2Speed){
        const numerator = 2*p1.mass*p1Speed + p2.mass*p2Speed - p1.mass*p2Speed
        const denominator = p1.mass + p2.mass

        const p2NewNormal = numerator / denominator
        const p1NewNormal = p2Speed - p1Speed + p2NewNormal
        
        // just change speeds, if same mass
        // const p1NewNormal = p2Speed
        // const p2NewNormal = p1Speed

        return({
            'p1': p1NewNormal,
            'p2': p2NewNormal
        })
    }

    changeObjectCollisionTrajectory(p1,p2){
        const newMoves = this.getVectorsAfterCollision(p1,p2)
        const newP1Vector = newMoves.p1
        const newP2Vector = newMoves.p2

        this.calculateNewDxDy(p1,newP1Vector)
        this.calculateNewDxDy(p2,newP2Vector)
    }

    didSomethingChange(p1,p2,p1Dx,p2Dx,p1Dy,p2Dy){
        if(p1.dx == p1Dx && p2.dx == p2Dx && p1.dy == p1Dy && p2.dy == p2Dy){
            console.log(p1,p2)
            strictEqual(0,1)
        }
    }

    calculateNewDxDy(player,newVector){
        this.setNewDx(player,newVector.x)
        this.setNewDy(player,newVector.y)
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

    getDistanceBetweenTwoPoints(p1,p2){
        return( ( (p1.x-p2.x)**2 + (p1.y-p2.y)**2 )**(1/2) )
    }

    roundValue(value){
        const digits = 4
        const number = 10**digits

        return(Math.round( value * number + Number.EPSILON ) / number)
    }

    roundSmallNegativeToZero(number){
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
        small = this.roundSmallNegativeToZero(small)
        big = this.roundSmallNegativeToZero(big)
        
        //cant divide by 0
        if(a == 0){
            return([])
        }

        // non-negative time only
        if(small < -1*ROUNDING_ERROR){
            return([big])
        }

        return([small,big])
    }
}
    