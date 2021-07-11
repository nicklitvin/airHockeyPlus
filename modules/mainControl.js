'use strict'
import RoomControl from './roomControl.js'
import Game1Control from './game1Control.js'
import Game1Testing from './game1Test.js'

import LobbyManager from './lobby.js'
import SockManager from './sock.js'
import UserManager from './users.js'
import gameLibrary from './gameLib.js'

export default class MainControl{
    constructor(io,refreshRate){
        this.io = io
        this.refreshRate = refreshRate

        this.lobbies = new LobbyManager()
        this.users = new UserManager()
        this.socks = new SockManager()
        this.gameLib = new gameLibrary()

        this.game1Control = new Game1Control(
            this.io,
            this.users,
            this.lobbies,
            this.refreshRate
        )

        this.room = new RoomControl(
            this.io,
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

    runGame1Test(){
        const game1Test = new Game1Testing(
            this.io,
            this.users,
            this.lobbies,
            this.refreshRate
        )
        game1Test.runTests()
    }
}