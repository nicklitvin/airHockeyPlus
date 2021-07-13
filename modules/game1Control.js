'use strict'
import Game from './game1Game.js'

export default class Game1Control{
    constructor(io,users,lobbies,refreshRate){
        this.users = users
        this.lobbies = lobbies
        this.games = {}
        this.refreshRate = refreshRate

        io.on('connection', (socket)=>{
            socket.on('game1Move', (userId,move)=>{
                this.recordPlayerMove(userId,move)
            })
            socket.on('game1Impulse', (userId)=>{
                this.recordPlayerImpulse(userId)
            })
            socket.on('endGame', (userId)=>{
                this.endGame(userId)
            })
        })
    }

    newGame(roomLobby){
        const lobbyId = roomLobby.lobbyId 
        this.games[lobbyId] = new Game(roomLobby,this.users)

        const game = this.games[lobbyId]
        
        game.makePlayerRadius()
        game.addGoals()
        game.addPlayers()
        game.addBall()
    }

    deleteGame(lobby){
        delete this.games[lobby.lobbyId]
    }

    recordPlayerMove(userId,move){
        const lobbyId = this.users.getInfo(userId).lobbyId
        const game = this.games[lobbyId]
        game.recordPlayerMove(userId,move)
    }

    recordPlayerImpulse(userId){
        const lobbyId = this.users.getInfo(userId).lobbyId
        const game = this.games[lobbyId]
        game.recordPlayerImpulse(userId)
    }

    runGame1(){
        for(var lobbyId of Object.keys(this.games)){
            const game = this.games[lobbyId]
            if(!game.inGame){
                continue
            }
            this.updateGameTime(game)
            if(!game.inGame){
                continue
            }
            if(game.countdown == 0){
                game.updateGame()
            }
            const allInfo = game.getAllInfo()
            this.sendAllInfo(game,allInfo)
        }
    }

    sendAllInfo(lobby,allInfo){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            const socket = user.socket

            if(!socket){
                continue
            }

            const player = lobby.players.getInfo(userId)
            allInfo['impulseColor'] = player.getImpulseColor()

            socket.emit('game1Update',allInfo)
        }
    }

    updateGameTime(game){
        game.updateGameTime()

        if(game.gameTime >= game.gameTimer){
            this.endGame(game.userIds[0])
            return
        }
    }

    endGame(userId){
        const lobbyId = this.users.getInfo(userId).lobbyId
        const roomLobby = this.lobbies.getInfo(lobbyId)

        if(userId != roomLobby.owner){
            return
        }
        
        const game = this.games[lobbyId]        
        const endInfo = game.makeEndInfo()

        game.endGame()
        roomLobby.inGame = 0

        this.sendEndStuff(roomLobby,endInfo)
    }

    sendEndStuff(lobby,endInfo){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            const socket = user.socket
            if(socket && user.inGame == 1){
                user.ready = 0
                socket.emit('endStuff',endInfo)  
            }
            else{
                this.deleteUserExistence(lobby,user)
            }
        }
    }

    deleteUserExistence(lobby,user){
        var userIds = lobby.userIds
        for(var a in userIds){
            if(userIds[a] == user.userId){
                userIds.splice(a,1)
            }
        }
        this.users.deleteUser(user)
    }
}
