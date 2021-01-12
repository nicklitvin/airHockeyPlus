'use strict'

class user{
    constructor(socket,lobbyId){
        this.lobbyId = lobbyId,
        this.socket = socket
    }
}

class sockUser{
    constructor(userId){
        this.userId = userId
    }
}

export default class userManager{
    constructor (){
        this.users = {},
        this.sockets = {},
        this.idLength = 10
    }

    makeId(){
        var hex = 'ghijklmnopqrstuvxyz'
        var id = ''
        while (true){
            for (var a=0; a<this.idLength; a++){
                id += hex[Math.floor(Math.random()*16)]
            }
            if (!Object.keys(this.users).includes(id)){
                return (id)
            }
        }
    }

    joinLobby(socket, lobbyId){
        const userId = this.makeId()
        this.users[userId] = new user(socket,lobbyId)
        this.sockets[socket.id] = new sockUser(userId)
        console.log('newUser',this.users)
        return({'userId':userId,'lobbyId':lobbyId})
    }

    leaveLobby(socket){
        if(Object.keys(this.sockets).includes(socket.id)){
            const userId = this.sockets[socket.id].userId
            const lobbyId = this.users[userId].lobbyId
            delete this.sockets[socket.id]
            delete this.users[userId]
            console.log('deleteUser',this.users)
            return({'userId':userId,'lobbyId':lobbyId})
        }
        return(0)
    }
}