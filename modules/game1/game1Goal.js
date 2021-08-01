'use strict'

import Vector from "../vector.js"

const SMALL_ROUNDING_ERROR = 10**(-6)

export default class Goal{
    constructor(x,color,serverW){
        this.position = new Vector(x,3)
        this.height = 3
        this.width = 0.2
        this.color = color
        this.goalsScored = 0
        this.lastBallToucher = null
        this.serverW = serverW
    }

    isBallInGoal(ball){
        // NOT GOAL IF TOO HIGH OR TOO LOW
        if( ball.position.y < this.position.y ||
            ball.position.y > this.position.y + this.height)
        {
            return(false)
        }

        // LEFT SIDE
        if( this.position.x == 0 && 
            Math.abs(ball.position.x - ball.radius) <= SMALL_ROUNDING_ERROR)
        {
            return(true)
        }

        //RIGHT SIDE
        if( this.position.x + this.width == this.serverW &&
            Math.abs(ball.position.x + ball.radius - this.serverW) <= SMALL_ROUNDING_ERROR)
        {
            return(true)
        }
        else{
            return(false)
        }
    }
}