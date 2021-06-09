'use strict'
export default class PhysicsManager{
    constructor(serverW,serverH){
        this.frictionConst = 0.92
        this.bounceStrength = 10
        this.serverW = serverW
        this.serverH = serverH
    }

    applyFriction(d){
        if(Math.abs(d) < 0.01){
            d = 0
        }
        if(d){
            d *= this.frictionConst
        }
        return(d)
    }

    resolveFriction(obj){
        obj.dx = this.applyFriction(obj.dx)
        obj.dy = this.applyFriction(obj.dy)
    }

    moveObject(obj,time){
        if(obj.xMove>0){
            obj.xMove *= time
            this.moveRight(obj)
        }
        else if(obj.xMove<0){
            obj.xMove *= time
            this.moveLeft(obj)
        }
        if(obj.yMove>0){
            obj.yMove *= time
            this.moveDown(obj)
        }
        else if(obj.yMove<0){
            obj.yMove *= time
            this.moveUp(obj)
        }
    }

    // moveObject(obj){
    //     if(obj.xMove>0){
    //         this.moveRight(obj)
    //     }
    //     else if(obj.xMove<0){
    //         this.moveLeft(obj)
    //     }
    //     if(obj.yMove>0){
    //         this.moveDown(obj)
    //     }
    //     else if(obj.yMove<0){
    //         this.moveUp(obj)
    //     }
    //     obj.xMove = 0
    //     obj.yMove = 0
        
    //     this.resolveFriction(obj)
    // }

    moveLeft(obj){
        if(obj.x + obj.xMove - obj.radius < 0){
            obj.x = obj.radius
            obj.dx *= -1
        }
        else{
            obj.x += obj.xMove
        }
    }

    moveRight(obj){
        if(obj.x + obj.xMove + obj.radius > this.serverW){
            obj.x = this.serverW - obj.radius
            obj.dx *= -1
        }
        else{
            obj.x += obj.xMove
        }
    }

    moveUp(obj){
        if(obj.y + obj.yMove - obj.radius < 0){
            obj.y = obj.radius
            obj.dy *= -1
        }
        else{
            obj.y += obj.yMove
        }
    }

    moveDown(obj){
        if(obj.y + obj.yMove + obj.radius > this.serverH){
            obj.y = this.serverH - obj.radius
            obj.dy *= -1
        }
        else{
            obj.y += obj.yMove
        }
    }

    isWithinImpulseRange(obj0,obj1){
        const dist = ( (obj0.x-obj1.x)**2 + (obj0.y-obj1.y)**2 )**(1/2)
        if(dist < this.impulseRadius){
            return(1)
        }
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

    getNextPlayerWallCollision(p1,previousCollision){
        const upInfo = this.whenIsWallCollisionUp(p1)
        const downInfo = this.whenIsWallCollisionDown(p1)
        const leftInfo = this.whenIsWallCollisionLeft(p1)
        const rightInfo = this.whenIsWallCollisionRight(p1) 
        let nextCollision

        for(var collision of [upInfo,downInfo,leftInfo,rightInfo]){
            if( (collision && 
                (!previousCollision || collision[2] != previousCollision[2]) &&
                (!nextCollision || collision[0] < nextCollision[0])) )
            {
                nextCollision = collision
            }
        }
        return(nextCollision)
    }

    getNextWallCollision(p1,p2,previousCollision){
        let nextCollision

        for(var player of [p1,p2]){
            const collision = this.getNextPlayerWallCollision(player,previousCollision)
            if(collision && (!nextCollision || collision[0] < nextCollision[0]) ){
                nextCollision = collision
            }
        }
        if(nextCollision){
            return (nextCollision)
        }
    }

    getNextPlayerCollision(obj1,obj2,previousCollision){
        const Vx = obj2.xMove - obj1.xMove
        const Vy = obj2.yMove - obj1.yMove
        const Px = obj2.x-obj1.x
        const Py = obj2.y-obj1.y

        const a = Vx**2 + Vy**2
        const b = 2*(Px*Vx + Py*Vy)
        const c = Px**2 + Py**2 - (obj1.radius + obj2.radius)**2

        const discriminant = this.findDiscriminant(a,b,c)

        if(discriminant >= 0 && !this.isSamePlayerCollision(obj1,obj2,previousCollision)){
            const time = this.findQuadraticRoot(a,b,c)
            // console.log(a,b,c,discriminant,time)
            if(time>0){
                return([time,obj1,obj2,'player'])
            }
        }
    }

    isSamePlayerCollision(obj1,obj2=0,previousCollision){
        if(obj2.userId){
            if(obj1 == previousCollision[1] &&
            obj2 == previousCollision[2])
            {
                return(1)
            }
        }
    }

    calculateNormalVector(p1,p2){
        // vector tangent to <x,y> is <-y,x>
        const tangentY = p1.x - p2.x
        const tangentX = p2.y - p1.y
        const scalar = 1/( (tangentY**2 + tangentX**2)**(1/2))
        
        // normal vector to tangent vector
        var normalX = tangentY
        var normalY = tangentX

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

    // CALCULATION FUNCTIONS

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
    