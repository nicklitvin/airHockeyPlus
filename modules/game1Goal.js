'use strict'

import Vector from "./vector.js"

const SMALL_ROUNDING_ERROR = 10**(-6)

class Goal{
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
        if( ball.position.y < this.position.y &&
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
    }
}

export default class Goals{
    constructor(){
        this.goals = {}
        this.rightGoalX = 15.8
        this.serverW = 16
        this.serverH = 9
    }

    addGoal(side,color){
        if(side == 'left'){
            this.goals[color] = new Goal(0,color,this.serverW)
        }
        else if(side == 'right'){
            this.goals[color] = new Goal(this.rightGoalX,color,this.serverW)
        }
    }

    getGoals(){
        return(this.goals)
    }

    getGoalSendingInfo(){
        var newGoalInfo = {}

        for(var team of Object.keys(this.goals)){
            const goal = this.goals[team]
            newGoalInfo[team] = {
                'x': goal.position.x/this.serverW,
                'y': goal.position.y/this.serverH,
                'width': goal.width/this.serverW,
                'height': goal.height/this.serverH,
                'color': goal.color
            }
        }
        return(newGoalInfo)
    }

    newBallToucher(player){
        this.goals[player.team].lastBallToucher = player.userId
    }

    isGoal(ball){
        for(var team of Object.keys(this.goals)){
            const goal = this.goals[team]
            if(goal.isBallInGoal(ball)){
                return(goal.color)
            }
        }
        return(null)
    }

    countGoal(scoringTeam){
        const goal = this.getGoals()[scoringTeam]
        goal.goalsScored += 1
    }

    resetTouchers(){
        for(var team of Object.keys(this.goals)){
            const goal = this.goals[team]
            goal.lastBallToucher = null
        }
    }

    getTeamScoresOrdered(){
        var scores = []

        for(var team of Object.keys(this.goals) ){
            scores.push( {'team': team, 'score': this.goals[team].goalsScored} )
        }

        scores.sort( (a,b) => b.score - a.score)
        return(scores)
    }
}