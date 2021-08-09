'use strict'

export default class Game1Manager{
    constructor(io,lobbies,users,socks){
        this.lobbies = lobbies
        this.users = users
        this.socks = socks

        io.on('connection', (socket)=>{
            socket.on('game1Move', (userId,move)=>{
                this.recordPlayerMove(userId,move)
            })
            socket.on('game1MouseMove', (userId,mouse) =>{
                this.recordPlayerMouseMove(userId,mouse)
            })
            socket.on('game1Impulse', (userId)=>{
                this.recordPlayerImpulse(userId)
            })
            socket.on('endGame', (userId)=>{
                this.endGame(userId)
            })
        })
    }

    findGame(userId){
        const user = this.users.getInfo(userId)
        const lobby = this.users.getInfo(user.lobbyId)
        return(lobby.game)
    }

    recordPlayerMove(userId,move){
        const game = this.findGame(userId)
        game.recordPlayerMove(userId,move)
    }

    recordPlayerMouseMove(userId,mouse){
        const game = this.findGame(userId)
        game.recordPlayerMouseMove(userId,mouse)
    }

    recordPlayerImpulse(userId){
        const game = this.findGame(userId)
        game.recordPlayerImpulse(userId)
    }

    endGame(userId){
        const user = this.users.getInfo(userId)
        const lobby = this.users.getInfo(user.lobbyId)

        const game = this.findGame(userId)
        // move endInfo stuff to Game
        const endInfo = game.makeEndInfo()

        game.endGame()
        lobby.endGame()

        this.sendEndStuff(lobby,endInfo)
    }
}