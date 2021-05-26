'use strict'
export default class PhysicsManager{
    constructor(){
        this.frictionConst = 0.92
    }

    addDx(obj,dx){
        obj.dx += dx
    }

    addDy(obj,dy){
        obj.dy += dy
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

    resolveBounce(obj){
        if(obj.dx>0){
            this.moveRight(obj,obj.dx)
        }
        else if(obj.dx<0){
            this.moveLeft(obj,obj.dx)
        }
        if(obj.dy>0){
            this.moveDown(obj,obj.dy)
        }
        else if(obj.dy<0){
            this.moveUp(obj,obj.dy)
        }
        this.resolveFriction(obj)
    }

    moveRight(obj,dx){
        if(obj.x+dx+obj.radius > obj.serverW){
            obj.x = obj.serverW - obj.radius
            obj.dx *= -1
        }
        else{
            obj.x += dx
        }
    }

    moveLeft(obj,dx){
        if(obj.x+dx-obj.radius < 0){
            obj.x = obj.radius
            obj.dx *= -1
        }
        else{
            obj.x += dx
        }
    }

    moveUp(obj,dy){
        if(obj.y+dy-obj.radius < 0){
            obj.y = obj.radius
            obj.dy *= -1
        }
        else{
            obj.y += dy
        }
    }

    moveDown(obj,dy){
        if(obj.y+dy+obj.radius > obj.serverH){
            obj.y = obj.serverH - obj.radius
            obj.dy *= -1
        }
        else{
            obj.y += dy
        }
    }
}
    