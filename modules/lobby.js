'use strict'

class Lobby{
    constructor() {
        this.userIds = []
        this.owner = 0
        this.game = 0
        this.inGame = 0
    }
}

export default class LobbyManager{
    constructor(){
        this.lobbies = {},
        this.idLength = 1
    }

    changeGame(lobbyId,game){
        this.lobbies[lobbyId].game = game
    }

    gameBegun(lobbyId){
        return(this.lobbies[lobbyId].inGame)
    }

    lobbyExist(lobbyId){
        if(Object.keys(this.lobbies).includes(lobbyId)){
            return(1)
        }
    }

    goingInGame(lobbyId){
        this.lobbies[lobbyId].inGame = 1
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

    getGame(lobbyId){
        return(this.lobbies[lobbyId].game)
    }

    getOwner(lobbyId){
        return(this.lobbies[lobbyId].owner)
    }
    
    newOwner(lobbyId){
        const newOwner = this.lobbies[lobbyId].userIds[0]
        this.lobbies[lobbyId].owner = newOwner
        return(newOwner)
    }

    getUserIds(lobbyId){
        return(this.lobbies[lobbyId].userIds)
    }

    joinLobby(userId,lobbyId){
        this.lobbies[lobbyId].userIds.push(userId)
        console.log('joinLobby',this.lobbies[lobbyId])
    }

    newLobby(){
        const lobbyId = this.makeId()
        this.lobbies[lobbyId] = new Lobby
        console.log('newLobby',this.lobbies[lobbyId])
        return(lobbyId)
    }

    deleteLobby(lobbyId){
        if(this.lobbies[lobbyId].userIds.length == 0){
            delete this.lobbies[lobbyId]
            console.log('deleteLobby',this.lobbies)
            return(1)
        }
    }
    
    leaveLobby(userId,lobbyId){
        //delete if owner
        if(this.lobbies[lobbyId].owner == userId){
            this.lobbies[lobbyId].owner = 0
        }
        //delete from userIds
        for(var a in this.lobbies[lobbyId].userIds){
            if (this.lobbies[lobbyId].userIds[a] == userId){
                this.lobbies[lobbyId].userIds.splice(a,1)
                console.log('leaveLobby',this.lobbies[lobbyId].userIds)
                return(this.deleteLobby(lobbyId))
            }
        }
    }
}
