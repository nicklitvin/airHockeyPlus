'use strict'
import RoomControl from './roomControl.js'
import Game1Control from './game1Control.js'

import LobbyManager from './lobby.js'
import SockManager from './sock.js'
import UserManager from './users.js'
import gameLibrary from './gameLib.js'

export default class MainControl{
    constructor(io,refreshRate){
        this.lobbies = new LobbyManager()
        this.users = new UserManager()
        this.socks = new SockManager()
        this.gameLib = new gameLibrary()

        this.game1Control = new Game1Control(io,this.users,this.lobbies,refreshRate)
        this.room = new RoomControl(
            io,
            this.game1Control,
            this.lobbies,
            this.users,
            this.socks,
            this.gameLib
        )
    }

    runGame1(){
        this.game1Control.runGame1()
    }
}