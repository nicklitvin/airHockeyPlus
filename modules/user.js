'use strict'

export default class User{
    constructor(userId,socket,lobbyId,userName){
        this.userId = userId
        this.socket = socket
        this.lobbyId = lobbyId
        this.userName = userName
        this.ready = 0
        this.team = 0

        this.inGame = 0
    }

    updateReturnToLobby(socket){
        this.inGame = 0 
        this.socket = socket
    }

    unready(){
        this.ready = 0
    }
}