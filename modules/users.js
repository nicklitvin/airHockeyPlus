'use strict'

class User{
    constructor(userId,socket,lobbyId,name){
        this.userId = userId
        this.socket = socket
        this.lobbyId = lobbyId
        this.name = name
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

    getLobbyId(userId){
        return(this.users[userId].lobbyId)
    }

    getNames(userIds){
        var names = []
        for(var a of userIds){
            names.push(this.users[a].name)
        }
        return(names)
    }

    makeName(userIds){
        var names = this.getNames(userIds)
        while(true){
            var name = 'player' + Math.floor(Math.random()*999)
            if(!names.includes(name)){
                return(name)
            }
        }
    }

    changeName(userIds,userId,userName){
        var names = this.getNames(userIds)
        if(!names.includes(userName)){
            this.users[userId].name = userName
            return(1)
        }
    }

    newUser(socket,lobbyId,userIds){
        const userId = this.makeId()
        const name = this.makeName(userIds)
        this.users[userId] = new User(userId,socket,lobbyId,name)
        console.log('newUser',this.users)
        return(this.users[userId])
    }

    deleteUser(userId){
        var lobbyId = this.users[userId].lobbyId
        delete this.users[userId]
        console.log('deleteUser',this.users)
        return(lobbyId)
    }
}
