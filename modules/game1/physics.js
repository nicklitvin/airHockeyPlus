'use strict'

import Vector from '../vector.js'

const ROUNDING_ERROR = 0.001
const SMALL_ROUNDING_ERROR = 10**(-6)

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

    // IMPULSE

    isWithinImpulseRange(obj1,obj2){
        const dist = this.getDistanceBetweenTwoPoints(obj1.position,obj2.position)
        if(dist < this.impulseRadius){
            return(1)
        }
    }

    impulseOffWall(player){
        //closest to which wall
        const yDist = Math.min(this.serverH-player.position.y,player.position.y)
        const xDist = Math.min(this.serverW-player.position.x,player.position.x)

        var bounceChange = new Vector(0,0)

        if(Math.abs(yDist-player.radius) < ROUNDING_ERROR){
            bounceChange.y = Math.sign(this.serverH-2*player.position.y)*this.impulseMagnitude 
        }
        if(Math.abs(xDist-player.radius) < ROUNDING_ERROR){
            bounceChange.x = Math.sign(this.serverW-2*player.position.x)*this.impulseMagnitude
        }

        player.addBounce(bounceChange)
    }

    giveBallsBounceFromImpulse(player,lobby){
        const ballIds = lobby.getAllBallIds()

        for(var targetId of ballIds){
            if(targetId == player.userId){
                continue
            }
            const target = this.getObjectById(lobby,targetId)

            if(this.isWithinImpulseRange(player,target)){
                this.giveTargetBounce(player,target)
            }
        }
    }
    
    giveTargetBounce(giver,target){
        const impulseMagnitude = this.impulseMagnitude
    
        //1st quadrant angle
        const angle = Math.abs(Math.atan((target.position.y-giver.position.y)/(target.position.x-giver.position.x)))
        
        const bounceY = Math.sign(target.position.y-giver.position.y)*Math.sin(angle)*impulseMagnitude/target.mass
        const bounceX = Math.sign(target.position.x-giver.position.x)*Math.cos(angle)*impulseMagnitude/target.mass

        var bounce = new Vector(bounceX,bounceY)
        target.addBounce(bounce)
    }

    // WALL COLLISION

    getGameNextWallCollision(lobby){
        var ballIds = lobby.getAllBallIds()
        var nextCollision = null

        for(var objectId of ballIds){
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
        if(p1.motion.x > 0 && p1.position.x + p1.radius + p1.motion.x > this.serverW){
            const time = (this.serverW - p1.position.x - p1.radius)/p1.motion.x
            return(time)
        }
    }

    whenIsWallCollisionLeft(p1){
        if(p1.motion.x < 0 && p1.position.x - p1.radius + p1.motion.x < 0){
            const time = (p1.radius - p1.position.x)/p1.motion.x
            return(time)
        }
    }

    whenIsWallCollisionDown(p1){
        if(p1.motion.y > 0 &&
            p1.position.y + p1.radius + p1.motion.y > this.serverH)
        {
            const time = (this.serverH - p1.position.y - p1.radius)/p1.motion.y
            return(time)
        }
    }

    whenIsWallCollisionUp(p1){
        if(p1.motion.y < 0 && p1.position.y - p1.radius + p1.motion.y < 0){
            const time = (p1.radius - p1.position.y)/p1.motion.y
            return(time)
        }
    }

    // 2 OBJECT COLLISION

    getObjectCollisionTime(obj1,obj2){
        const Vx = obj2.motion.x - obj1.motion.x
        const Vy = obj2.motion.y - obj1.motion.y
        const Px = obj2.position.x-obj1.position.x
        const Py = obj2.position.y-obj1.position.y
        const squaredSumOfRadii = (obj1.radius + obj2.radius)**2

        const a = Vx**2 + Vy**2
        const b = 2*(Px*Vx + Py*Vy)
        const c = Px**2 + Py**2 - squaredSumOfRadii
        var discriminant = this.findDiscriminant(a,b,c)
        // console.log('discriminant',a,b,c)

        discriminant = this.roundSmallNegativeToZero(discriminant)

        if(discriminant < 0){return}

        const times = this.findPositiveQuadraticRoots(a,b,c)
        
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

            const normalMoves = this.getNormalVectorsForCollision(p1,p2)
            const p1Info = {'future':p1,'normal':normalMoves.p1,'magnitude':normalMoves.p1Magnitude}
            const p2Info = {'future':p2,'normal':normalMoves.p2,'magnitude':normalMoves.p2Magnitude}

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
        if( obj.position.x + obj.radius > this.serverW ||
            obj.position.x - obj.radius < 0 ||
            obj.position.y + obj.radius > this.serverH ||
            obj.position.y - obj.radius < 0)
        {
            return(1)
        }
        return(0)
    }

    // p1 will collide with p2 if p1.magnitude is less by very little to avoid overlap from rounding error
    isCollisionPossible(p1,p2){
        var timeX = -1
        var timeY = -1
        
        if(p1.normal.x){
            timeX = (p2.future.position.x - p1.future.position.x)/p1.normal.x
        }
        
        if(p1.normal.y){
            timeY = (p2.future.position.y - p1.future.position.y)/p1.normal.y
        }

        if( (timeX > 0 || timeY > 0) && 
            ((p1.magnitude > 0 && p1.magnitude + SMALL_ROUNDING_ERROR > p2.magnitude) ||
            (p1.magnitude < 0 && p1.magnitude < p2.magnitude + SMALL_ROUNDING_ERROR)) )
        {
            return(1)
        }
    }

    // CHANGE TRAJECTORY

    getUnitNormalVector(p1,p2){
        const xDistance = p2.position.x - p1.position.x
        const yDistance = p2.position.y - p1.position.y
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

        const p1MoveVector = new Vector(p1.motion.x,p1.motion.y)
        const p2MoveVector = new Vector(p2.motion.x,p2.motion.y)

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

        const p1MoveVector = new Vector(p1.motion.x,p1.motion.y)
        const p2MoveVector = new Vector(p2.motion.x,p2.motion.y)

        const p1Normal = unitNormalVector.dotProduct(p1MoveVector)
        const p2Normal = unitNormalVector.dotProduct(p2MoveVector)
        const p1Tangent = unitTangentVector.dotProduct(p1MoveVector)
        const p2Tangent = unitTangentVector.dotProduct(p2MoveVector)

        var newNormals = this.getElasticCollisionNewSpeeds(p1,p2,p1Normal,p2Normal)
        newNormals = this.makeNormalsDifferentIfNecessary(newNormals,p1,p2)

        const newP1NormalVector = unitNormalVector.multiply(newNormals.p1)
        const newP2NormalVector = unitNormalVector.multiply(newNormals.p2)
        const newP1TangentVector = unitTangentVector.multiply(p1Tangent)
        const newP2TangentVector = unitTangentVector.multiply(p2Tangent)

        const newP1Vector = newP1NormalVector.add(newP1TangentVector)
        const newP2Vector = newP2NormalVector.add(newP2TangentVector)

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

        return({
            'p1': p1NewNormal,
            'p2': p2NewNormal
        })
    }

    makeNormalsDifferentIfNecessary(newNormals,p1,p2){
        const normalDifference = newNormals.p1 - newNormals.p2
        if( Math.abs(normalDifference) < ROUNDING_ERROR){
            var timeX = 0 
            var timeY = 0

            const normalVectors = this.getNormalVectorsForCollision(p1,p2)

            if(normalVectors.p1.x){
                timeX = (p2.position.x - p1.position.x)/normalVectors.p1.x
            }
            if(normalVectors.p1.y){
                timeY = (p2.position.y - p1.position.y)/normalVectors.p1.y
            }

            // p1 is pushing
            if(timeX > 0 || timeY > 0){
                newNormals.p1 -= Math.sign(newNormals.p1)*ROUNDING_ERROR
                newNormals.p2 += Math.sign(newNormals.p1)*ROUNDING_ERROR
            }
            else{
                newNormals.p2 -= Math.sign(newNormals.p2)*ROUNDING_ERROR
                newNormals.p1 += Math.sign(newNormals.p2)*ROUNDING_ERROR
            }
        }
        return(newNormals)
    }

    changeObjectCollisionTrajectory(p1,p2){
        const newMoves = this.getVectorsAfterCollision(p1,p2)
        const newP1Vector = newMoves.p1
        const newP2Vector = newMoves.p2

        this.calculateNewBounce(p1,newP1Vector)
        this.calculateNewBounce(p2,newP2Vector)
    }

    calculateNewBounce(player,newVector){
        player.setNewXBounce(newVector.x)
        player.setNewYBounce(newVector.y)
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

    findPositiveQuadraticRoots(a,b,c){
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
    