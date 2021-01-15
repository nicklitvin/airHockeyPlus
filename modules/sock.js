'use strict'

export default class SockManager{
    constructor(){
        this.socks = {}
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

    toLobby(socket,lobbyId){
        var a = `lobby/?a=${lobbyId}`
        socket.emit('redirect',a)
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
