'use strict'
class Lobby{
    constructor(lobbyId,timer){
        this.lobbyId = lobbyId
        this.userIds = []
        this.owner = 0
        this.game = 0
        this.inGame = 0
        this.gameTimer = timer
        this.teams = ['orange','blue']
    }
}

export default class LobbyManager{
    constructor(){
        this.lobbies = {}
        this.idLength = 1
        this.teams = ['orange','blue']
    }

    getInfo(lobbyId){
        return(this.lobbies[lobbyId])
    }

    getTeams(){
        return(this.teams)
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
            for (var a=0; a<this.idLength; a++){
                id += hex[Math.floor(Math.random()*16)]
            }
            if (!Object.keys(this.lobbies).includes(id)){
                return (id)
            }
        }
    }
    
    newLobby(timer){
        const lobbyId = this.makeId()
        this.lobbies[lobbyId] = new Lobby(lobbyId,timer)
        return(this.lobbies[lobbyId])
    }

    deleteLobby(lobby){
        delete this.lobbies[lobby.lobbyId]
    }
}

