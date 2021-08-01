'use strict'

import LobbyManager from "./lobbyManager.js"

export default class RoomTester{
    constructor(){

    }

    runTests(){
        this.makeLobby()
    }

    makeLobby(){
        const lobbyManager = new LobbyManager()
        const lobby = lobbyManager.makeNewLobby()
        console.log(lobby)
    }
}