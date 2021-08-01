'use strict'

import Goal from './game1Goal.js'

export default class GoalManager{
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