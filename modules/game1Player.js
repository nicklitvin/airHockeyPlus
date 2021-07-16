'use strict'
import Ball from './game1Ball.js'
import MoveCommands from './game1MoveCommands.js'

const ROUNDING_ERROR = 0.001

export default class Player extends Ball{
    constructor(userId,team,userName,playerRadius){
        super(0,0)
        this.radius = playerRadius
        this.userId = userId
        this.userName = userName
        this.team = team

        this.commands = new MoveCommands()
        this.speed = 0

        this.goals = 0
        this.newImpulse = 0
        this.impulseCooldown = 0

        this.maxSpeed = 15 //must get from configuration
        this.mass = 1
    }

    setMoveSpeed(){
        this.speed = this.maxSpeed
        if( (this.commands.up || this.commands.down) && (this.commands.left || this.commands.right) ){
            this.speed *= Math.sqrt(2)/2
        }
    }

    makeMotionVector(){
        this.addMoveInputToMotion()
        this.addBounceToMotion()
    }

    addMoveInputToMotion(){
        if(this.commands.up && this.position.y - this.radius > ROUNDING_ERROR){
            this.motion.y -= this.speed
        }
        else if(this.commands.down &&
            this.position.y + this.radius < this.serverH - ROUNDING_ERROR)
        {
            this.motion.y += this.speed
        }

        if(this.commands.left && this.position.x - this.radius > ROUNDING_ERROR){
            this.motion.x -= this.speed
        }
        else if(this.commands.right &&
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

    setNewYBounce(yFinal){
        if( (this.commands.down || this.commands.up) && yFinal == 0){
            //do nothing
        }
        // resisting push
        else if( (this.commands.down && yFinal < 0) || (this.commands.up && yFinal > 0)){
            this.bounce.y += yFinal
        }
        // move boost
        else if(this.commands.down && yFinal > 0){
            this.bounce.y = Math.max(yFinal - this.speed,0)
        }
        else if(this.commands.up && yFinal < 0){
            this.bounce.y = Math.min(yFinal + this.speed,0)
        }
        else{
            this.bounce.y = yFinal
        }
    }

    setNewXBounce(xFinal){
        if( (this.commands.right || this.commands.left) && xFinal == 0){
            //do nothing
        }
        // resisting push
        else if( (this.commands.right && xFinal < 0) || (this.commands.left && xFinal > 0)){
            this.bounce.x += xFinal
        }
        // move boosted
        else if(this.commands.right && xFinal > 0){
            this.bounce.x = Math.max(xFinal - this.speed,0)
        }
        else if(this.commands.left && xFinal < 0){
            this.bounce.x = Math.min(xFinal + this.speed,0)
        }
        else{
            this.bounce.x = xFinal
        }
    }

    getImpulseColor(){
        if(this.impulseCooldown){
            return('red')
        }
        return('green')
    }
}