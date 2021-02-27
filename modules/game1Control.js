'user strict'

import PlayerManager from './game1Player.js'

class Game{
    constructor(userIds){
        this.userIds = userIds,
        this.serverH = 9,
        this.serverW = 16,
        this.speed = 0.1,
        this.impulseMagnitude = 1.3
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
            socket.on('game1Impulse', (userId)=>{
                this.impulsePlayer(userId)
            })
        })
    }

    bounceControl(userIds){
        for(var userId of userIds){
            const lobbyId = this.users.getLobbyId(userId)
            const serverH = this.games[lobbyId].serverH
            const serverW = this.games[lobbyId].serverW
            this.players.resolveBounce(userId,serverH,serverW)
        }
    }

    impulsePlayer(userId){
        const loc = this.players.getCoordinates(userId)
        const lobbyId = this.users.getLobbyId(userId)
        const serverH = this.games[lobbyId].serverH
        const serverW = this.games[lobbyId].serverW
        const impMagn = this.games[lobbyId].impulseMagnitude

        const yDist = Math.min(serverH-loc.y,loc.y)
        const xDist = Math.min(serverW-loc.x,loc.x)

        if(yDist < 2){ 
            if(serverH-loc.y<loc.y){
                this.players.bounce(userId,'vertical',yDist-impMagn)
            }
            else{
                this.players.bounce(userId,'vertical',impMagn-yDist)
            }
        }
        if(xDist < 2){ 
            if(serverW-loc.x<loc.x){
                this.players.bounce(userId,'horizontal',xDist-impMagn)
            }
            else{
                this.players.bounce(userId,'horizontal',impMagn-xDist)
            }
        }
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
            this.bounceControl(userIds)
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

