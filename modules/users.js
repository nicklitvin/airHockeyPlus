'use strict'

class User{
    constructor(socket,lobbyId){
        this.socket = socket
        this.lobbyId = lobbyId
    }
}

export default class UserManager{
    constructor (){
        this.users = {},
        this.idLength = 10
    }

    makeId(){
        var hex = 'ghijklmnopqrstuvxyz'
        var userId = ''
        while (true){
            for (var a=0; a<this.idLength; a++){
                userId += hex[Math.floor(Math.random()*16)]
            }
            if (!Object.keys(this.users).includes(userId)){
                return(userId)
            }
        }
    }

    newUser(socket,lobbyId){
        const userId = this.makeId()
        this.users[userId] = new User(socket,lobbyId)
        console.log('newUser',this.users)
        return(userId)
    }

    deleteUser(userId){
        var lobbyId = this.users[userId].lobbyId
        delete this.users[userId]
        console.log('deleteUser',this.users)
        return(lobbyId)
    }
}