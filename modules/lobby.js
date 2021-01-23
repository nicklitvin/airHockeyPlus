'use strict'

class Lobby{
    constructor() {
        this.userIds = []
        this.owner = 0
        this.newOwner = 0
        this.game = 0
        this.newGame = 0
    }
}

export default class LobbyManager{
    constructor(){
        this.lobbies = {},
        this.idLength = 1
    }

    makeId(){
        var id = ''
        var hex = '0123456789abcdef'
        while (true){
            for (var a=0; a<this.idLength; a++){
                id += hex[Math.floor(Math.random()*16)]
            }
            if (!Object.keys(this.lobbies).includes(id)){
                return (id)
            }
        }
    }

    changeGame(lobbyId,game){
        this.lobbies[lobbyId].game = game
    }

    getGame(lobbyId){
        return(this.lobbies[lobbyId].game)
    }

    lobbyExist(lobbyId){
        if(Object.keys(this.lobbies).includes(lobbyId)){
            return(1)
        }
    }

    newOwner(lobbyId){
        this.lobbies[lobbyId].owner = this.lobbies[lobbyId].userIds[0]
        this.lobbies[lobbyId].newOwner = 1
    }

    isNewOwner(lobbyId){
        if(this.lobbies[lobbyId].newOwner){
            this.lobbies[lobbyId].newOwner = 0
            return(1)
        }
    }

    getOwner(lobbyId){
        return(this.lobbies[lobbyId].owner)
    }

    getUserIds(lobbyId){
        return(this.lobbies[lobbyId].userIds)
    }

    newLobby(){
        const lobbyId = this.makeId()
        this.lobbies[lobbyId] = new Lobby
        console.log('newLobby',this.lobbies)
        return(lobbyId)
    }
    
    deleteLobby(lobbyId){
        if(this.lobbies[lobbyId].userIds.length == 0){
            delete this.lobbies[lobbyId]
            console.log('deleteLobby',this.lobbies)
            return(1)
        }
    }
    
    joinLobby(user){
        this.lobbies[user.lobbyId].userIds.push(user.userId)
        console.log('joinLobby',this.lobbies[user.lobbyId])
    }
    
    leaveLobby(userId,lobbyId){
        for(var a in this.lobbies[lobbyId].userIds){
            if (this.lobbies[lobbyId].userIds[a] == userId){
                this.lobbies[lobbyId].userIds.splice(a,1)
                console.log('leaveLobby',this.lobbies[lobbyId].userIds)
                return(this.deleteLobby(lobbyId))
            }
        }
    }
}
