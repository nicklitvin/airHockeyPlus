'use strict'
class Player{
    constructor(userId,x,y,serverH,serverW,team,userName){
        this.userId = userId
        this.userName = userName
        this.x = x
        this.y = y
        this.dx = 0
        this.dy = 0
        this.radius = .5
        this.impulse = 1
        this.serverH = serverH
        this.serverW = serverW
        this.team = team
        this.goals = 0
    }
}

export default class PlayerManager{
    constructor(users){
        this.users = users
        this.players = {}
    }

    addPlayer(userId,x,y,serverH,serverW,team,userName){
        this.players[userId] = new Player(userId,x,y,serverH,serverW,team,userName)
    }

    getInfo(userId){
        return(this.players[userId])
    }

    processMove(move,speed){
        if(move['up'] && move['down']){
            move['up'] = false
            move['down'] = false
        }
        if(move['left'] && move['right']){
            move['left'] = false
            move['right'] = false
        }
        if( (move['up'] || move['down']) && (move['left'] || move['right']) ){
            speed *= Math.sqrt(2)/2
        }
        for(var i of Object.keys(move)){
            if(i!='change' && move[i]){
                if(i=='left'||i=='up'){
                    move[i] = -speed
                    continue
                }
                move[i] = speed
            }
        }
        return(move)
    }
}
