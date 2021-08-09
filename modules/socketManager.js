'use strict'

export default class SocketManager{
    constructor(){
        this.socks = {}
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

    nameTaken(socket){
        socket.emit('nameError','nameTaken')
    }

    playerUpdate(socket,text){
        socket.emit('playerUpdate',text)
    }

    joinLobby(user){
        const socket = user.socket
        this.newSock(user.socket.id,user.userId)
        socket.emit('lobbyUpdate',user.lobbyId)
        socket.emit('nameUpdate',user.userName)
        socket.emit('personalGameSettings',user.personalGameSettings)
    }

    errorPage(socket){
        socket.emit('redirect','/error')
    }

    toLobby(socket,lobby){
        const url = `lobby/?a=${lobby.lobbyId}`
        socket.emit('redirect',url)
    }

    toGame(socket,lobby){
        const url = `${lobby.gameSettings.gameChoices.chosen}/?a=${lobby.lobbyId}`
        socket.emit('redirect',url)
    }

    toGameExperiment(socket,gameName,lobbyId){
        const url = `${gameName}/?a=${lobbyId}`
        socket.emit('redirect',url)
    }

    chatError(socket){
        socket.emit('chatError','chatError')
    }

    newChat(socket,chat){
        socket.emit('newChat',chat)
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
