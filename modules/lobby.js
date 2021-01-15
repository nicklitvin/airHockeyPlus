'use strict'

class Lobby{
    constructor() {
        this.userIds = []
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
                this.deleteLobby(lobbyId)
                return
            }
        }
    }
}
