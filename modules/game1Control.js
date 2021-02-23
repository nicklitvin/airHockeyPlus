'user strict'

import PlayerManager from './game1Player.js'

class Game{
    constructor(userIds){
        this.userIds = userIds,
        this.serverH = 9,
        this.serverW = 16,
        this.speed = 0.1
    }
}

export default class Game1Control{
    constructor(io,users){
        this.users = users,
        this.players = new PlayerManager(this.users,users),
        this.games = {}

        io.on('connection', (socket)=>{
            socket.on('game1Move', (userId,move)=>{
                this.movePlayer(userId,move)
            })
        })
    }

    movePlayer(userId,move){
        const lobbyId = this.users.getLobbyId(userId)
        const speed = this.games[lobbyId].speed
        const serverH = this.games[lobbyId].serverH
        const serverW = this.games[lobbyId].serverW
        this.players.move(userId,speed,move,serverW,serverH)
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
        this.games[lobbyId] = new Game(userIds)
        for(var userId of userIds){
            this.players.addPlayer(userId)
        }
    }
}

