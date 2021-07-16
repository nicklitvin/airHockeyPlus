'use strict'
import Ball from './game1Ball.js'

const ROUNDING_ERROR = 0.001

export default class Player extends Ball{
    constructor(userId,team,userName,playerRadius){
        super(0,0)
        this.radius = playerRadius
        this.userId = userId
        this.userName = userName
        this.team = team

        this.moveL = 0
        this.moveR = 0
        this.moveU = 0
        this.moveD = 0
        this.speed = 0

        this.goals = 0
        this.newImpulse = 0
        this.impulseCooldown = 0

        this.maxSpeed = 15 //must get from configuration
        this.mass = 1
    }

    recordPlayerMove(move){
        if(move.left){
            this.moveL = 1
        }
        if(move.right){
            this.moveR = 1
        }
        if(move.up){
            this.moveU = 1
        }
        if(move.down){
            this.moveD = 1
        }
    }

    resetPlayerMoveCommands(){
        this.moveL = 0
        this.moveR = 0
        this.moveU = 0
        this.moveD = 0
    }

    deleteMoveContradictions(){
        if(this.moveU && this.moveD){
            this.moveU = 0
            this.moveD = 0
        }
        if(this.moveL && this.moveR){
            this.moveL = 0
            this.moveR = 0
        }
    }

    setMoveSpeed(){
        this.speed = this.maxSpeed
        if( (this.moveU || this.moveD) && (this.moveL || this.moveR) ){
            this.speed *= Math.sqrt(2)/2
        }
    }

    makeMotionVector(){
        this.addMoveInputToMotion()
        this.addBounceToMotion()
    }

    addMoveInputToMotion(){
        if(this.moveU && this.position.y - this.radius > ROUNDING_ERROR){
            this.motion.y -= this.speed
        }
        else if(this.moveD &&
            this.position.y + this.radius < this.serverH - ROUNDING_ERROR)
        {
            this.motion.y += this.speed
        }

        if(this.moveL && this.position.x - this.radius > ROUNDING_ERROR){
            this.motion.x -= this.speed
        }
        else if(this.moveR &&
            this.position.x + this.radius < this.serverW - ROUNDING_ERROR)
        {
            this.motion.x += this.speed
        }
    }

    activateImpulse(cooldown){
        this.newImpulse = 1
        this.impulseCooldown = cooldown
    }

    decreaseImpulseCooldown(timeDiff){
        this.impulseCooldown -= timeDiff
            
        if(this.impulseCooldown < 0){
            this.impulseCooldown = 0
        }
    }

    deactivateImpulse(){
        this.newImpulse = 0
    }

    setNewDy(yFinal){
        if( (this.moveD || this.moveU) && yFinal == 0){
            //do nothing
        }
        // resisting push
        else if( (this.moveD && yFinal < 0) || (this.moveU && yFinal > 0)){
            this.bounce.y += yFinal
        }
        // move boost
        else if(this.moveD && yFinal > 0){
            this.bounce.y = Math.max(yFinal - this.speed,0)
        }
        else if(this.moveU && yFinal < 0){
            this.bounce.y = Math.min(yFinal + this.speed,0)
        }
        else{
            this.bounce.y = yFinal
        }
    }

    setNewDx(xFinal){
        if( (this.moveR || this.moveL) && xFinal == 0){
            //do nothing
        }
        // resisting push
        else if( (this.moveR && xFinal < 0) || (this.moveL && xFinal > 0)){
            this.bounce.x += xFinal
        }
        // move boosted
        else if(this.moveR && xFinal > 0){
            this.bounce.x = Math.max(xFinal - this.speed,0)
        }
        else if(this.moveL && xFinal < 0){
            this.bounce.x = Math.min(xFinal + this.speed,0)
        }
        else{
            this.bounce.x = xFinal
        }
    }

    resetPlayerMotion(){
        this.motion.x = 0
        this.motion.y = 0
        this.bounce.x = 0
        this.bounce.y = 0
        this.impulseCooldown = 0
    }

    getImpulseColor(){
        if(this.impulseCooldown){
            return('red')
        }
        return('green')
    }
}