'use strict'

import Vector from "../vector.js"

const ROUNDING_ERROR = 0.001
const REFRESH_RATE = 100

export default class MoveCommands{
    constructor(serverW,serverH,maxSpeed,position){
        this.serverW = serverW
        this.serverH = serverH
        this.maxSpeed = maxSpeed
        this.position = position

        this.right = false
        this.left = false
        this.up = false
        this.down = false

        this.mouse = new Vector(0,0)
        this.mouseControl = true

        this.moveVector = new Vector(0,0)
    }

    resetMove(){
        this.moveVector.x = 0
        this.moveVector.y = 0
    }

    makeMoveVector(radius){
        if(this.mouseControl){
            this.makeMouseMoveVector(radius)
        }
        else{
            this.makeKeyboardMoveVector(radius)
        }
    }

    makeMouseMoveVector(radius){
        const xDiff = this.mouse.x - this.position.x
        const yDiff = this.mouse.y - this.position.y
        var directionVector = new Vector(xDiff,yDiff)
        
        var speed = this.maxSpeed
        const directionMagnitude = directionVector.getMagnitude()
        if(directionMagnitude < speed/REFRESH_RATE){
            speed = directionMagnitude*REFRESH_RATE
        }

        directionVector.normalise()
        directionVector = directionVector.multiply(speed)
        directionVector = this.keepMoveWithinBoundary(directionVector,radius)
        this.moveVector.x = directionVector.x
        this.moveVector.y = directionVector.y
    }

    keepMoveWithinBoundary(directionVector,radius){
        if( directionVector.x > 0 && this.position.x + radius > this.serverW - ROUNDING_ERROR ||
            directionVector.x < 0 && this.position.x - radius < ROUNDING_ERROR)
        {
            directionVector.x = 0
        }
        if( directionVector.y > 0 && this.position.y + radius > this.serverH - ROUNDING_ERROR ||
            directionVector.y < 0 && this.position.y - radius < ROUNDING_ERROR)
        {
            directionVector.y = 0
        }
        return(directionVector)
    }

    makeKeyboardMoveVector(radius){
        this.deleteKeyboardMoveContradictions()
        const speed = this.getMoveSpeedKeyboard()

        if(this.up && this.position.y - radius > ROUNDING_ERROR){
            this.moveVector.y -= speed
        }
        else if(this.down &&
            this.position.y + radius < this.serverH - ROUNDING_ERROR)
        {
            this.moveVector.y += speed
        }

        if(this.left && this.position.x - radius > ROUNDING_ERROR){
            this.moveVector.x -= speed
        }
        else if(this.right &&
            this.position.x + radius < this.serverW - ROUNDING_ERROR)
        {
            this.moveVector.x += speed
        }
    }

    getMoveSpeedKeyboard(){
        var speed = this.maxSpeed
        if( (this.up || this.down) && (this.left || this.right) ){
            speed *= Math.sqrt(2)/2
        }
        return(speed)
    }

    recordMouseCommands(mouse){
        this.mouse.x = mouse.x*this.serverW
        this.mouse.y = mouse.y*this.serverH
    }

    recordMoveCommands(move){
        this.left = move.left
        this.right = move.right
        this.up = move.up
        this.down = move.down
    }
 
    resetPlayerMoveCommands(){
        this.mouse.x = 0
        this.mouse.y = 0
        this.up = false
        this.down = false
        this.left = false
        this.right = false
    }
 
    deleteKeyboardMoveContradictions(){
        if(this.up && this.down){
            this.up = false
            this.down = false
        }
        if(this.left && this.right){
            this.left = false
            this.right = false
        }
    }
}