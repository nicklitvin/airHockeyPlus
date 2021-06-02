'use strict'
export default class PhysicsManager{
    constructor(serverW,serverH){
        this.frictionConst = 0.92
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

    moveObject(obj){
        if(obj.xMove>0){
            this.moveRight(obj)
        }
        else if(obj.xMove<0){
            this.moveLeft(obj)
        }
        if(obj.yMove>0){
            this.moveDown(obj)
        }
        else if(obj.yMove<0){
            this.moveUp(obj)
        }
        obj.xMove = 0
        obj.yMove = 0
        
        this.resolveFriction(obj)
    }

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
}
    