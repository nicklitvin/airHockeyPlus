'use strict'

export default class SockManager{
    constructor(){
        this.socks = {}
    }

    toGame(socket,game,lobbyId){
        const url = `${game}/?a=${lobbyId}`
        socket.emit('redirect',url)
    }

    toLobby(socket,lobbyId){
        var url = `lobby/?a=${lobbyId}`
        socket.emit('redirect',url)
    }

    gameUpdate(socket,game){
        socket.emit('gameUpdate',game)
    }

    newOwner(socket,games,game){
        socket.emit('newOwner',games,game)
    }

    errorPage(socket){
        socket.emit('lobbyError','/error')
    }

    playerUpdate(socket,text){
        socket.emit('playerUpdate',text)
    }

    chatError(socket){
        socket.emit('chatError','chatError')
    }

    newChat(socket,chat){
        socket.emit('newChat',chat)
    }

    getUserId(socketId){
        return(this.socks[socketId])
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

    newSock(user){
        const socket = user.socket
        this.socks[user.socket.id] = user.userId
        socket.emit('newCookie',user.userId)
        socket.emit('lobbyUpdate',user.lobbyId)
        socket.emit('nameUpdate',user.name)
        console.log('newSock',this.socks)
    }

    deleteSock(socketId){
        if (Object.keys(this.socks).includes(socketId)){
            var userId = this.socks[socketId]
            delete this.socks[socketId]
            console.log('deleteSock',this.socks)
            return(userId)
        }
    }
}
