'use strict'

const ROUNDING_ERROR = 0.001

export default class Ball{
    constructor(x,y){
        this.x = x
        this.y = y
        this.dx = 0
        this.dy = 0
        this.radius = .25
        this.mass = 0.5

        this.xMove = 0
        this.yMove = 0

        // to get from Game settings
        this.serverW = 16
        this.serverH = 9
        this.objectBounceSpeedLimit = 100
        this.frictionConst = 0.85
    }

    getInfoIn(time){
        return({
            'x': this.x + this.xMove*time,
            'y': this.y + this.yMove*time,
            'xMove': this.xMove,
            'yMove': this.yMove,
            'radius': this.radius
        })
    }

    logInfo(){
        console.log('%s x=%f y=%f dx=%f dy=%f', (this.userId || 'ball'), this.x, this.y, this.dx, this.dy)
    }

    resetXyMoves(){
        this.xMove = 0
        this.yMove = 0
    }

    makeXyMove(){
        this.makeXyMoveFromDxDy()
    }

    makeXyMoveFromDxDy(){
        this.xMove += this.dx
        this.yMove += this.dy
    }

    move(time){
        this.x += this.xMove*time
        this.y += this.yMove*time

        this.keepObjectWithinBoundary()
    }

    keepObjectWithinBoundary(){
        if(this.x + this.radius > this.serverW){
            this.x = this.serverW - this.radius
        }
        if(this.x - this.radius < 0){
            this.x = this.radius
        }
        if(this.y + this.radius > this.serverH){
            this.y = this.serverH - this.radius
        }
        if(this.y - this.radius < 0){
            this.y = this.radius
        }
    }

    isBounceTooFast(){
        const bounceMagnitude = this.getBounceMagnitude()
        return(bounceMagnitude > this.objectBounceSpeedLimit)
    }

    getBounceMagnitude(){
        return( (this.dx**2 + this.dy**2)**(1/2) )
    }

    limitBounceSpeed(){
        const angle = Math.atan(this.dy/this.dx)
        this.dx = Math.sign(this.dx || 1)*Math.cos(angle)*
            this.objectBounceSpeedLimit
        this.dy = Math.sign(this.dx || 1)*Math.sin(angle)*
            this.objectBounceSpeedLimit
    }

    addBounce(bounce){
        this.dx += bounce.x
        this.dy += bounce.y
    }

    resolveFriction(){
        this.dx = this.applyFriction(this.dx)
        this.dy = this.applyFriction(this.dy)
    }

    applyFriction(bounce){
        if(Math.abs(bounce) < ROUNDING_ERROR){
            bounce = 0
        }
        if(bounce){
            bounce *= this.frictionConst
        }
        return(bounce)
    }

    changeTrajectoryFromWallCollision(){
        if( (Math.abs(this.x + this.radius - this.serverW) < ROUNDING_ERROR && this.dx > 0) ||
            (Math.abs(this.x - this.radius) < ROUNDING_ERROR && this.dx < 0) )
        {
            this.dx *= -1
        }
        
        if( (Math.abs(this.y + this.radius - this.serverH) < ROUNDING_ERROR && this.dy > 0) ||
            (Math.abs(this.y - this.radius) < ROUNDING_ERROR && this.dy < 0))
        {
            this.dy *= -1
        }
    }

    setNewDx(xFinal){
        this.dx = xFinal
    }

    setNewDy(yFinal){
        this.dy = yFinal
    }

    resetPositionAndMotion(){
        this.x = this.serverW/2
        this.y = this.serverH/2
        this.dx = 0
        this.dy = 0
        this.xMove = 0
        this.yMove = 0
    }
}
