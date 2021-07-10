'use strict'
class Player{
    constructor(userId,team,userName,playerRadius){
        this.userId = userId
        this.userName = userName
        this.radius = playerRadius
        this.team = team
        this.goals = 0
        this.mass = 1
        
        this.x = 0
        this.y = 0
        this.dx = 0
        this.dy = 0

        this.moveL = 0
        this.moveR = 0
        this.moveU = 0
        this.moveD = 0
        this.xMove = 0
        this.yMove = 0
        
        this.newImpulse = 0
        this.impulseCooldown = 0
        this.playerSpeed = 0
    }

    getInfoIn(time){
        return({
            'x': this.x + this.xMove*time,
            'y': this.y + this.yMove*time,
            'xMove': this.xMove,
            'yMove': this.yMove,
            'radius': this.radius
        })
    }
}

export default class PlayerManager{
    constructor(users){
        this.users = users
        this.players = {}
    }

    getAllInfo(){
        return(this.players)
    }

    addPlayer(userId,team,userName,playerRadius){
        this.players[userId] = new Player(userId,team,userName,playerRadius)
    }

    deletePlayer(playerId){
        delete this.players[playerId]
    }

    getInfo(playerId){
        return(this.players[playerId])
    }
}
