'user strict'

import PlayerManager from './game1Player.js'

class Game{
    constructor(userIds){
        this.userIds = userIds,
        this.serverH = 9,
        this.serverW = 16
    }
}

export default class Game1Control{
    constructor(io,users){
        this.players = new PlayerManager(users)
        this.users = users
        this.games = {}
    }

    newGame(lobbyId,userIds){
        this.games[lobbyId] = new Game(userIds)
        for(var userId of userIds){
            this.players.addPlayer(userId)
        }
    }
}

