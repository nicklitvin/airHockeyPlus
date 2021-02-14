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

    addPlayer(userId){
        const userName = this.users.getName(userId)
        this.players[userId] = new Player(userId,userName)
    }

    getInfo(userId){
        return(this.players[userId])
    }
}
