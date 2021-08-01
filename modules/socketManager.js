'use strict'

export default class SocketManager{
    constructor(){
        this.socks = {}
    }

    noTeamSelected(socket){
        socket.emit('noTeamSelected','noTeamSelected')
    }

    forceColor(user){
        const socket = user.socket
        socket.emit('forceTeam',user.team,`can't change team if ready`)
    }

    deleteCookie(socket){
        socket.emit('deleteCookie')
    }

    sendCookie(socket,userId){
        socket.emit('newCookie',userId)
    }

    nameUpdate(socket,userName){
        socket.emit('nameUpdate',userName)
    }
    
    nameError(socket){
        socket.emit('nameError','nameError')
    }

    newOwner(socket,games,game,currTimer,timers){
        socket.emit('newOwner',games,game,currTimer,timers)
    }

    playerUpdate(socket,text){
        socket.emit('playerUpdate',text)
    }

    joinLobby(user,lobby){
        const socket = user.socket
        this.newSock(user.socket.id,user.userId)
        socket.emit('lobbyUpdate',user.lobbyId)
        socket.emit('nameUpdate',user.userName)
        socket.emit('gameUpdate',lobby.game)
        socket.emit('teamOptions',lobby.teams)
        socket.emit('timerUpdate',lobby.gameTimer)
        
        if(user.team){
            socket.emit('oldColor',user.team)
        }
    }

    errorPage(socket){
        socket.emit('redirect','/error')
    }

    toLobby(socket,lobby){
        const url = `lobby/?a=${lobby.lobbyId}`
        socket.emit('redirect',url)
    }

    toGame(socket,lobby){
        const url = `${lobby.game}/?a=${lobby.lobbyId}`
        socket.emit('redirect',url)
    }

    gameUpdate(socket,game){
        socket.emit('gameUpdate',game)
    }

    timerUpdate(socket,timer){
        socket.emit('timerUpdate',timer)
    }

    chatError(socket){
        socket.emit('chatError','chatError')
    }

    newChat(socket,chat){
        socket.emit('newChat',chat)
    }

    nameTaken(socket){
        socket.emit('nameError','nameTaken')
    }

    newSock(socketId,userId){
        this.socks[socketId] = userId
    }

    getUserId(socketId){
        if(Object.keys(this.socks).includes(socketId)){
            return(this.socks[socketId])
        }
    }

    deleteSock(socketId){
        if(Object.keys(this.socks).includes(socketId)){
            delete this.socks[socketId]
        }
    }
}
