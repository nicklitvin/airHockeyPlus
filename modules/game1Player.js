'use strict'

class Player{
    constructor(userId,userName){
        this.userId = userId,
        this.userName = userName,
        this.x = 4,
        this.y = 3,
        this.radius = .5
    }
}

export default class PlayerManager{
    constructor(users){
        this.users = users
        this.players = {}
    }

    move(userId,speed,move,serverW,serverH){
        const radius = this.players[userId].radius
        if(move['up']){
            if(this.players[userId].y-radius-speed < 0){
                this.players[userId].y = radius
            }
            else{
                this.players[userId].y -= speed
            }
        }
        if(move['down']){
            if(this.players[userId].y+radius+speed > serverH){
                this.players[userId].y = serverH - radius
            }
            else{
                this.players[userId].y += speed
            }
        }
        if(move['left']){
            if(this.players[userId].x-radius-speed < 0){
                this.players[userId].x = radius
            }
            else{
                this.players[userId].x -= speed
            }
        }
        if(move['right']){
            if(this.players[userId].x+radius+speed > serverW){
                this.players[userId].x = serverW - radius
            }
            else{
                this.players[userId].x += speed
            }
        }
    }

    addPlayer(userId){
        const userName = this.users.getName(userId)
        this.players[userId] = new Player(userId,userName)
    }

    getInfo(userId){
        return(this.players[userId])
    }
}
