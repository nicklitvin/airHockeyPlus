'use strict'
import RoomManager from './roomManager.js'
import Game1Manager from './game1/game1GameManager.js'
import Game1Testing from './game1/game1Test.js'
import RoomTester from './roomTest.js' 

import LobbyManager from './lobbyManager.js'
import SocketManager from './socketManager.js'
import UserManager from './userManager.js'

export default class MainControl{
    constructor(io,refreshRate){
        this.io = io
        this.refreshRate = refreshRate

        this.lobbies = new LobbyManager()
        this.users = new UserManager()
        this.socks = new SocketManager()

        this.game1Manager = new Game1Manager(
            this.io,
            this.users,
            this.lobbies,
            this.refreshRate
        )

        this.room = new RoomManager(
            this.io,
            this.game1Manager,
            this.lobbies,
            this.users,
            this.socks
        )
    }

    runGame1(){
        this.game1Manager.runGame1()
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

    runRoomTest(){
        const roomTest = new RoomTester()
        roomTest.runTests()
    }
}