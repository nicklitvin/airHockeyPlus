'use strict'

const ROUNDING_ERROR = 0.001

export default class PhysicsManager{
    constructor(serverW,serverH,players){
        this.serverW = serverW
        this.serverH = serverH
        this.players = players

        this.frictionConst = 0.92
        this.bounceStrength = 10
        this.objectBounceSpeedLimit = 10
        this.playerMoveSpeed = 15
        this.impulseMagnitude = 20
        this.impulseRadius = 1.5
    }

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
        return((object.dx**2+object.dy**2)**(1/2) >
            this.objectBounceSpeedLimit)
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
        this.roundXyPositions(obj)

        if(obj.userId){
            this.keepObjectWithinBoundary(obj)
        }
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

    roundXyPositions(obj){
        obj.x = Math.round( obj.x * 100 + Number.EPSILON ) / 100
        obj.y = Math.round( obj.y * 100 + Number.EPSILON ) / 100
    }

    applyPlayerMoveInput(player){
        const playerSpeed = player.playerSpeed

        if(player.moveU){
            player.yMove -= playerSpeed
        }
        else if(player.moveD){
            player.yMove += playerSpeed
        }
        if(player.moveL){
            player.xMove -= playerSpeed
        }
        else if(player.moveR){
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
    }

    applyFriction(obj){
        if(Math.abs(obj) < 0.01){
            obj = 0
        }
        if(obj){
            obj *= this.frictionConst
        }
        return(obj)
    }

    // WALL COLLISION

    getNextWallCollision(lobby,previousCollision){
        let nextCollision
        var objects = lobby.userIds.slice()
        objects.push('ball')

        for(var objectId of objects){
            const object = this.getObjectById(lobby,objectId)
            const collision = this.getNextObjectWallCollision(object,previousCollision)
            if(collision &&
                (!nextCollision || collision[0] < nextCollision[0]) )
            {
                nextCollision = collision
            }
        }
        if(nextCollision){
            return (nextCollision)
        }
    }

    getNextObjectWallCollision(p1,previousCollision){
        const upInfo = this.whenIsWallCollisionUp(p1)
        const downInfo = this.whenIsWallCollisionDown(p1)
        const leftInfo = this.whenIsWallCollisionLeft(p1)
        const rightInfo = this.whenIsWallCollisionRight(p1) 
        let nextCollision

        for(var collision of [upInfo,downInfo,leftInfo,rightInfo]){
            if( (collision && 
                (!previousCollision || collision[3] != previousCollision[3]) &&
                (!nextCollision || collision[0] < nextCollision[0]) ) )
            {
                nextCollision = collision
            }
        }
        return(nextCollision)
    }

    whenIsWallCollisionRight(p1){
        if(p1.x + p1.radius + p1.xMove > this.serverW && p1.dx){
            const time = (this.serverW - p1.x - p1.radius)/p1.xMove
            return([time,p1,'right','wall'])
        }
    }

    whenIsWallCollisionLeft(p1){
        if(p1.x - p1.radius + p1.xMove < 0 && p1.dx){
            const time = (p1.radius - p1.x)/p1.xMove
            return([time,p1,'left','wall'])
        }
    }

    whenIsWallCollisionDown(p1){
        if(p1.y + p1.radius + p1.yMove > this.serverH && p1.dy){
            const time = (this.serverH - p1.y - p1.radius)/p1.yMove
            return([time,p1,'down','wall'])
        }
    }

    whenIsWallCollisionUp(p1){
        if(p1.y - p1.radius + p1.yMove < 0 && p1.dy){
            const time = (p1.radius - p1.y)/p1.yMove
            return([time,p1,'up','wall'])
        }
    }

    // 2 OBJECT COLLISION

    getNext2ObjectCollision(lobby,previousCollision){
        const contacts = lobby.contacts
        let nextCollision

        for(var count=0; count<contacts.length; count++){
            const contact = contacts[count]
            const p1 = this.getObjectById(lobby,contact[0])
            const p2 = this.getObjectById(lobby,contact[1])
            const time = this.getObjectCollisionTime(p1,p2)

            if(time >= 0 &&
                (!nextCollision || time < nextCollision[0]) &&
                !this.isSame2ObjectCollision(p1,p2,previousCollision) )
            {
                nextCollision = [time,p1,p2,'player']
            }
        }
        return(nextCollision)
    }
    
    getObjectCollisionTime(obj1,obj2){
        const Vx = obj2.xMove - obj1.xMove
        const Vy = obj2.yMove - obj1.yMove
        const Px = obj2.x-obj1.x
        const Py = obj2.y-obj1.y

        const a = Vx**2 + Vy**2
        const b = 2*(Px*Vx + Py*Vy)
        const c = Px**2 + Py**2 - (obj1.radius + obj2.radius)**2
        const discriminant = this.findDiscriminant(a,b,c)

        if(discriminant >= 0){
            const time = this.findQuadraticRoot(a,b,c)

            if(time >= 0){
                return(time)
            }
        }
    }

    isSame2ObjectCollision(obj1,obj2=0,previousCollision){
        if(previousCollision.length == 4 &&
            obj1.userId == previousCollision[1].userId)
        {
            // ball collision repeat
            if(!obj2.userId && !previousCollision[2].userId)
            {
                // console.log('sameBall')
                return(1)
            }
            //player collision repeat
            if(obj2.userId && obj2.userId == previousCollision[2].userId)
            {
                // console.log('samePlayer')
                return(1)
            }
        }
    }        

    // CHANGE TRAJECTORY

    changeObjectCollisionTrajectory(p1,p2){
        const normalVector = this.calculateNormalVector(p1,p2)

        // reverse normal for p1
        if(Math.abs(p1.x + normalVector.x - p2.x) < ROUNDING_ERROR &&
            Math.abs(p1.y + normalVector.y - p2.y) < ROUNDING_ERROR)
        {
            this.applyNormalVector(p1,p2,normalVector)
        }
        //reverse normal for p2
        else{
            this.applyNormalVector(p2,p1,normalVector)
        }
    }

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

    calculateNormalVector(p1,p2){
        // vector tangent to <x,y> is <-y,x>
        const tangentY = p1.x - p2.x
        const tangentX = p2.y - p1.y
        // console.log('tangent',tangentX,tangentY)
        const scalar = 1/( (tangentY**2 + tangentX**2)**(1/2))
        
        // normal vector to tangent vector
        var normalX = tangentY
        var normalY = -tangentX

        return({
            'x':normalX,
            'y':normalY,
            'unitX': normalX*scalar,
            'unitY': normalY*scalar
        })
    }

    applyNormalVector(reversedPlayer,standardPlayer,normal){
        reversedPlayer.dx = -1*normal.unitX*this.bounceStrength 
        reversedPlayer.dy = -1*normal.unitY*this.bounceStrength 
        standardPlayer.dx = normal.unitX*this.bounceStrength 
        standardPlayer.dy = normal.unitY*this.bounceStrength
    }


    // CALCULATOR

    findDiscriminant(a,b,c){
        if(!a && !b){
            return(-1)
        }
        return(b**2 - 4*a*c)
    }

    findQuadraticRoot(a,b,c){
        const small = ( -b-Math.sqrt(b**2 - 4*a*c) ) / (2*a)
        const big = ( -b+Math.sqrt(b**2 - 4*a*c) ) / (2*a)
        if(small < 0){
            return(big)
        }
        return(Math.min(small,big))
    }
}
    