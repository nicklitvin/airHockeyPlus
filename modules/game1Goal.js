'use strict'
class Goal{
    constructor(x,color){
        this.x = x
        this.y = 3

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
}