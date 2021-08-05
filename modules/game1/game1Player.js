'use strict'
import Vector from '../vector.js'
import Ball from './game1Ball.js'
import MoveCommands from './game1MoveCommands.js'

export default class Player extends Ball{
    constructor(userId,team,userName,playerRadius){
        super(0,0)
        this.radius = playerRadius
        this.userId = userId
        this.userName = userName
        this.team = team

        this.goals = 0
        this.newImpulse = 0
        this.impulseCooldown = 0

        this.maxSpeed = 15 //must get from configuration
        this.mass = 1

        this.commands = new MoveCommands(
            this.serverW,this.serverH,this.maxSpeed,this.position,this.radius
        )
    }

    resetMotionAndMove(){
        this.resetMotion()
        this.commands.resetMove()
    }

    makeMotionVector(){
        this.commands.makeMoveVector(this.radius)
        this.motion = this.motion.add(this.commands.moveVector)

        this.addBounceToMotion()
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
        const yMove = this.commands.moveVector.y

        if(yMove && yFinal == 0){
            //do nothing
        }
        // resisting push
        else if( Math.sign(yMove) != Math.sign(yFinal) ){
            this.bounce.y += yFinal
        }
        // move boost
        else if(yMove > 0 && yFinal > 0){
            this.bounce.y = Math.max(yFinal - yMove,0)
        }
        else if(yMove < 0 && yFinal < 0){
            this.bounce.y = Math.min(yFinal - yMove,0)
        }
        else{
            this.bounce.y = yFinal
        }
    }

    setNewXBounce(xFinal){
        const xMove = this.commands.moveVector.x

        if(xMove && xFinal == 0){
            //do nothing
        }
        // resisting push
        else if( Math.sign(xMove) != Math.sign(xFinal) ){
            this.bounce.x += xFinal
        }
        // move boosted
        else if(xMove > 0 && xFinal > 0){
            this.bounce.x = Math.max(xFinal - xMove,0)
        }
        else if(xMove < 0 && xFinal < 0){
            this.bounce.x = Math.min(xFinal - xMove,0)
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

    getSendingInfo(){
        return({
            'userId': this.userId,
            'x': this.position.x/this.serverW,
            'y': this.position.y/this.serverH,
            'radiusY': this.radius/this.serverH,
            'team': this.team
        })
    }

    addGoalScored(){
        this.goals += 1 
    }
}