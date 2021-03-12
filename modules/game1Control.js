'user strict'

import PlayerManager from './game1Player.js'

class Game{
    constructor(userIds){
        this.userIds = userIds,
        this.serverH = 9,
        this.serverW = 16,
        this.speed = 0.1,
        this.impulseMagnitude = 1,
        this.impulseRadius = 2
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

    wallBounce(userId,lobbyId){
        const loc = this.players.getCoordinates(userId)
        const impMagn = this.games[lobbyId].impulseMagnitude
        const serverH = this.games[lobbyId].serverH
        const serverW = this.games[lobbyId].serverW
        
        //closest to which wall
        const yDist = Math.min(serverH-loc.y,loc.y)
        const xDist = Math.min(serverW-loc.x,loc.x)

        if(yDist < 2){ 
            if(serverH-loc.y<loc.y){
                // yDist-impMagn
                this.players.bounce(userId,'vertical',-impMagn)
                // console.log('bounceUp')
            }
            else{
                // impMagn-yDist
                this.players.bounce(userId,'vertical',impMagn)
                // console.log('bounceDown')
            }
        }
        if(xDist < 2){ 
            if(serverW-loc.x<loc.x){
                // xDist-impMagn
                this.players.bounce(userId,'horizontal',-impMagn)
                // console.log('bounceLeft')
            }
            else{
                // impMagn-xDist
                this.players.bounce(userId,'horizontal',impMagn)
                // console.log('bounceRight')
            }
        }
    }

    giveBounce(lobbyId,player,loc,dist){
        const impMagn = this.games[lobbyId].impulseMagnitude
        const angle = Math.atan(Math.abs(player.y-loc.y)/Math.abs(player.x-loc.x))
        let dy
        let dx

        //push up
        if(player.y>loc.y){
            dy = Math.sin(angle)*impMagn
        }
        //push down
        if(player.y<loc.y){
            dy = -Math.sin(angle)*impMagn
        }
        //push right
        if(player.x>loc.x){
            dx = Math.cos(angle)*impMagn
        }       
        //push left
        if(player.x<loc.x){
            dx = -Math.cos(angle)*impMagn
        }

        this.players.bounce(player.userId,'horizontal',dx)
        this.players.bounce(player.userId,'vertical',dy)
    }

    playerBounce(userId,lobbyId){
        const loc = this.players.getCoordinates(userId)
        const playerInfo = this.getPlayerInfo(lobbyId)
        const impulseRadius = this.games[lobbyId].impulseRadius

        for(var userId1 of Object.keys(playerInfo)){
            if(userId1 == userId){
                continue
            }
            const player = playerInfo[userId1]
            const dist = ( (loc.x-player.x)**2 + (loc.y-player.y)**2 )**1/2
            if(dist < impulseRadius){
                this.giveBounce(lobbyId,player,loc,dist)
            }
        }
    }

    impulsePlayer(userId){
        const lobbyId = this.users.getLobbyId(userId)

        this.wallBounce(userId,lobbyId)
        this.playerBounce(userId,lobbyId)
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

