'use strict'

import Vector from "./vector.js"

const ROUNDING_ERROR = 0.001

export default class Ball{
    constructor(x,y){
        this.position = new Vector(x,y)
        this.bounce = new Vector(0,0)
        this.motion = new Vector(0,0)

        this.radius = .25
        this.mass = 0.5

        // to get from Game settings
        this.serverW = 16
        this.serverH = 9
        this.objectBounceSpeedLimit = 100
        this.frictionConst = 0.85
    }

    getInfoIn(time){
        const future = new Ball(this.position.x,this.position.y)

        future.position.x += this.motion.x*time
        future.position.y += this.motion.y*time
        future.motion.x = this.motion.x
        future.motion.y = this.motion.y
        
        return(future)
    }

    logInfo(){
        console.log('%s x=%f y=%f dx=%f dy=%f',
            (this.userId || 'ball'),
            this.position.x,
            this.position.y,
            this.bounce.x,
            this.bounce.y
        )
    }

    resetXyMoves(){
        this.motion.x = 0
        this.motion.y = 0
    }

    makeMotionVector(){
        this.addBounceToMotion()
    }

    addBounceToMotion(){
        this.motion.x += this.bounce.x
        this.motion.y += this.bounce.y
    }

    move(time){
        this.position.x += this.motion.x*time
        this.position.y += this.motion.y*time

        this.keepObjectWithinBoundary()
    }

    keepObjectWithinBoundary(){
        if(this.position.x + this.radius > this.serverW){
            this.position.x = this.serverW - this.radius
        }
        if(this.position.x - this.radius < 0){
            this.position.x = this.radius
        }
        if(this.position.y + this.radius > this.serverH){
            this.position.y = this.serverH - this.radius
        }
        if(this.position.y - this.radius < 0){
            this.position.y = this.radius
        }
    }

    isBounceTooFast(){
        const bounceMagnitude = this.getBounceMagnitude()
        return(bounceMagnitude > this.objectBounceSpeedLimit)
    }

    getBounceMagnitude(){
        return( (this.bounce.x**2 + this.bounce.y**2)**(1/2) )
    }

    limitBounceSpeed(){
        const angle = Math.atan(this.bounce.y/this.bounce.x)
        this.bounce.x = Math.sign(this.bounce.x || 1)*Math.cos(angle)*
            this.objectBounceSpeedLimit
        this.bounce.y = Math.sign(this.bounce.x || 1)*Math.sin(angle)*
            this.objectBounceSpeedLimit
    }

    addBounce(bounce){
        this.bounce.x += bounce.x
        this.bounce.y += bounce.y
    }

    resolveFriction(){
        this.bounce.x = this.applyFriction(this.bounce.x)
        this.bounce.y = this.applyFriction(this.bounce.y)
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
        if( (Math.abs(this.position.x + this.radius - this.serverW) < ROUNDING_ERROR && this.bounce.x > 0) ||
            (Math.abs(this.position.x - this.radius) < ROUNDING_ERROR && this.bounce.x < 0) )
        {
            this.bounce.x *= -1
        }
        
        if( (Math.abs(this.position.y + this.radius - this.serverH) < ROUNDING_ERROR && this.bounce.y > 0) ||
            (Math.abs(this.position.y - this.radius) < ROUNDING_ERROR && this.bounce.y < 0))
        {
            this.bounce.y *= -1
        }
    }

    setNewDx(xFinal){
        this.bounce.x = xFinal
    }

    setNewDy(yFinal){
        this.bounce.y = yFinal
    }

    setPosition(x,y){
        this.position.x = x
        this.position.y = y
    }

    resetPositionAndMotion(){
        this.position.x = this.serverW/2
        this.position.y = this.serverH/2
        this.bounce.x = 0
        this.bounce.y = 0
        this.motion.x = 0
        this.motion.y = 0
    }
}
