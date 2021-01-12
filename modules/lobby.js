'use strict'

class Lobby{
    constructor() {
        this.users = []
    }
}

export default class lobbyManager{
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

    createLobby(){
        const lobbyId = this.makeId()
        this.lobbies[lobbyId] = new Lobby
        console.log('newLobby',this.lobbies)
        return(lobbyId)
    }
    
    deleteLobby(lobbyId){
        if(this.lobbies[lobbyId].users.length == 0){
            delete this.lobbies[lobbyId]
            console.log('deleteLobby',this.lobbies)
        }
    }
    
    joinLobby(userId,lobbyId){
        this.lobbies[lobbyId].users.push(userId)
        console.log('joinLobby',this.lobbies[lobbyId])
    }
    
    leaveLobby(userId,lobbyId){
        for(var a in this.lobbies[lobbyId].users){
            if (this.lobbies[lobbyId].users[a] == userId){
                this.lobbies[lobbyId].users.splice(a,1)
                console.log('leaveLobby',this.lobbies)
                this.deleteLobby(lobbyId)
                return
            }
        }
    }
}
