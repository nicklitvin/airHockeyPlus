'use strict'

export default class SockManager{
    constructor(){
        this.socks = {}
    }

    nameUpdate(socket,userName){
        socket.emit('nameUpdate',userName)
    }
    
    nameError(socket){
        socket.emit('nameError','nameError')
    }

    newOwner(socket,games,game){
        socket.emit('newOwner',games,game)
    }

    playerUpdate(socket,text){
        socket.emit('playerUpdate',text)
    }

    newSock(user){
        const socket = user.socket
        this.socks[user.socket.id] = user.userId
        socket.emit('newCookie',user.userId)
        socket.emit('lobbyUpdate',user.lobbyId)
        socket.emit('nameUpdate',user.name)
        console.log('newSock',this.socks)
    }

    errorPage(socket){
        socket.emit('lobbyError','/error')
    }

    toLobby(socket,lobbyId){
        const url = `lobby/?a=${lobbyId}`
        socket.emit('redirect',url)
    }

    updateSock(socketId,userId){
        this.socks[socketId] = userId
    }

    toGame(socket,game,lobbyId){
        const url = `${game}/?a=${lobbyId}`
        socket.emit('redirect',url)
    }

    gameUpdate(socket,game){
        socket.emit('gameUpdate',game)
    }

    chatError(socket){
        socket.emit('chatError','chatError')
    }

    newChat(socket,chat){
        socket.emit('newChat',chat)
    }

    getUserId(socketId){
        if(Object.keys(this.socks).includes(socketId)){
            return(this.socks[socketId])
        }
    }

    nameTaken(socket){
        socket.emit('nameError','nameTaken')
    }

    deleteSock(socketId){
        if(Object.keys(this.socks).includes(socketId)){
            delete this.socks[socketId]
            console.log('deleteSock',this.socks)
        }
    }
}
