'use strict'

import Vector from "./vector.js"

class Goal{
    constructor(x,color){
        this.position = new Vector(x,3)
        this.height = 3
        this.width = 0.2
        this.color = color
        this.goalsScored = 0
        this.lastBallToucher = ''
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
            this.goals[color] = new Goal(0,color)
        }
        else if(side == 'right'){
            this.goals[color] = new Goal(this.rightGoalX,color)
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
}