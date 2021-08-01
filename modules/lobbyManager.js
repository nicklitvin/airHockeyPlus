'use strict'

import Lobby from './lobby.js'
import GameLibrary from './gameLibrary.js'

const gameLib = new GameLibrary()

export default class LobbyManager{
    constructor(){
        this.lobbies = {}
        this.idLength = 1
    }

    getAllInfo(){
        return(this.lobbies)
    }

    getInfo(lobbyId){ //getLobbyInfo
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

    makeNewLobby(){
        const lobbyId = this.makeId()
        this.lobbies[lobbyId] = new Lobby(lobbyId)

        const lobby = this.lobbies[lobbyId] 
        const gameName = gameLib.getDefaultGameName()
        const gameInfo = gameLib.getGameInfo(gameName)
        lobby.setNewGame(gameInfo)

        return(lobby)
    }

    isLobbyOpen(lobbyId){
        if(this.doesLobbyExist(lobbyId)){
            if(!this.getInfo(lobbyId).inGame){
                return(1)
            }
        }
    }

    deleteLobby(lobby){
        delete this.lobbies[lobby.lobbyId]
    }
}

