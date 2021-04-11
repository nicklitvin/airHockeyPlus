'use strict'
class Goal{
    constructor(x,y,width,height,color){
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.color = color
        this.goalsScored = 0
        this.lastBallToucher = ''
    }
}

export default class Goals{
    constructor(){
        this.goals = {}
    }

    addGoal(x,y,width,height,color){
        this.goals[color] = new Goal(x,y,width,height,color)
    }

    getGoals(){
        return(this.goals)
    }
}