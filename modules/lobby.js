'use strict'
class Lobby{
    constructor(lobbyId){
        this.lobbyId = lobbyId
        this.userIds = []
        this.owner = 0
        this.game = 0
        this.inGame = 0
        this.gameTimer = 0
        this.teams = []
        this.awaitingUsers = []
    }
}

export default class LobbyManager{
    constructor(){
        this.lobbies = {}
        this.idLength = 1
    }

    getAllInfo(){
        return(this.lobbies)
    }

    getInfo(lobbyId){
        return(this.lobbies[lobbyId])
    }

    doesLobbyExist(lobbyId){
        if(Object.keys(this.lobbies).includes(lobbyId)){
            return(1)
        }
    }

    makeId(){
        var hex = '0123456789abcdef'
        while (true){
            var id = ''
            for(var a=0; a<this.idLength; a++){
                id += hex[Math.floor(Math.random()*16)]
            }
            if(!Object.keys(this.lobbies).includes(id)){
                return (id)
            }
        }
    }
    
    newLobby(){
        const lobbyId = this.makeId()
        this.lobbies[lobbyId] = new Lobby(lobbyId)
        return(this.lobbies[lobbyId])
    }

    deleteLobby(lobby){
        delete this.lobbies[lobby.lobbyId]
    }
}

