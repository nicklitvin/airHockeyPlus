'use strict'

class Player{
    constructor(userName){
        this.userName = userName,
        this.x = 0,
        this.y = 0
    }
}

export default class PlayerManager{
    constructor(users){
        this.users = users
        this.players = {}
    }

    addPlayer(userId){
        const userName = this.users.getName(userId)
        this.players[userId] = new Player(userName)
    }
}