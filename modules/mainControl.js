'use strict'

import RoomControl from './roomControl.js'
import Game1Control from './game1Control.js'

import LobbyManager from './lobby.js'
import SockManager from './sock.js'
import UserManager from './users.js'
import gameLibrary from './gameLib.js'

export default class MainControl{
    constructor(io){
        this.lobbies = new LobbyManager()
        this.users = new UserManager()
        this.socks = new SockManager()
        this.gameLib = new gameLibrary()

        this.gameControl = new Game1Control(io,this.users)
        this.room = new RoomControl(
            io,
            this.gameControl,
            this.lobbies,
            this.users,
            this.socks,
            this.gameLib
        )
    }

    TESTaddPlayers(userIds){
        this.gameControl.TESTaddPlayers(userIds)
    }

    runGame1(){
        this.gameControl.runGame1()
    }
}