'user strict'

import PlayerManager from './game1Player.js'

class Game{
    constructor(users,userIds){
        this.userIds = userIds,
        this.serverH = 9,
        this.serverW = 16
    }
}

export default class Game1Control{
    constructor(io,users){
        this.users = users,
        this.players = new PlayerManager(this.users,users),
        this.games = {}
    }

    sendGame(userIds,playerInfo){
        for(var userId of userIds){
            const socket = this.users.getSocket(userId)
            socket.emit('gameUpdate',playerInfo)
        }
    }

    runGame1(){
        for(var lobbyId of Object.keys(this.games)){
            const playerInfo = this.getPlayerInfo(lobbyId)
            const userIds = this.games[lobbyId].userIds
            this.sendGame(userIds,playerInfo)
        }
    }

    getPlayerInfo(lobbyId){
        const userIds = this.games[lobbyId].userIds
        const playerInfo = {}
        for(var userId of userIds){
            playerInfo[userId] = this.players.getInfo(userId)
        }
        return(playerInfo)
    }

    newGame(lobbyId,userIds){
        this.games[lobbyId] = new Game(this.users,userIds)
        for(var userId of userIds){
            this.players.addPlayer(userId)
        }
    }
}

