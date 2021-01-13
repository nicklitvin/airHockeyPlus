'use strict'

export default class SockManager{
    constructor(){
        this.socks = {}
    }

    toLobby(socket,lobbyId){
        var a = `lobby/?a=${lobbyId}`
        socket.emit('redirect',a)
    }

    newSock(socketId,userId){
        this.socks[socketId] = userId
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
