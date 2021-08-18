'use strict'

import SocketManager from "./socketManager.js"
import UserManager from "./userManager.js"
import Lobby from "./lobby.js"
import Game1MessageReceiver from "./game1/messageReceiver.js"

const MAX_CHAT_LENGTH = 100
const MAX_USERNAME_LENGTH = 12
const LOBBY_ID_LEGNTH = 1
const REFRESH_INTERVAL = 10

export default class LobbyManager{
    constructor(io){
        this.users = new UserManager()
        this.socks = new SocketManager()
        this.lobbies = {}

        this.setUpMessageReceivers(io)
        this.runGames()

        io.on('connection', (socket)=>{
            socket.on('createLobby', () => {
                this.createLobby(socket)
            })
            socket.on('joinLobby', (lobbyId,userId) =>{
                this.joinLobby(socket,lobbyId,userId)
            })
            socket.on('disconnect', () => {
                this.disconnect(socket)
            })
            socket.on('readyChange', ()=>{
                this.readyChange(socket)
            })
            socket.on('newGeneralGameSetting', (setting,value)=>{
                this.setNewGeneralGameSetting(socket,setting,value)
            })
            socket.on('newPersonalGameSetting', (setting,value)=>{
                this.setNewPersonalGameSetting(socket,setting,value)
            })
            socket.on('newChat', (chat)=>{
                this.newChat(socket,chat)
            })
            socket.on('nameUpdate', (userName) =>{
                this.updateName(socket,userName)
            })
            socket.on('joinGame', (userId,lobbyId,gameId)=>{
                this.joinGame(socket,userId,lobbyId,gameId)
            })
            socket.on('returnFromGame', (userId)=>{
                this.returnFromGame(userId)
            })
        })
    }

    // not best, prefer to run inside game object, but err with binding
    runGames(){
        setInterval( () =>{
            for(var lobbyId of Object.keys(this.lobbies)){
                const lobby = this.lobbies[lobbyId]
                const game = lobby.game
                if(game){
                    game.runGame()
                }
            }
        }, REFRESH_INTERVAL)
    }

    setUpMessageReceivers(io){
        new Game1MessageReceiver(io,this.lobbies,this.users,this.socks)
    }

    makeId(){
        var hex = '0123456789abcdef'
        while (true){
            var id = ''
            for(var a = 0; a < LOBBY_ID_LEGNTH; a++){
                id += hex[Math.floor(Math.random()*16)]
            }
            if(!Object.keys(this.lobbies).includes(id)){
                return (id)
            }
            if(a == LOBBY_ID_LENGTH){
                this.stopEverything()
            }
        }
    }
    
    isLobbyOpen(lobbyId){
        if(this.doesLobbyExist(lobbyId)){
            const lobby = this.getLobbyInfo(lobbyId)
            if(!lobby.game || lobby.game.gameOver){
                return(true)
            }
        }
    }

    doesLobbyExist(lobbyId){
        if(Object.keys(this.lobbies).includes(lobbyId)){
            return(true)
        }
    }

    getLobbyInfo(lobbyId){
        return(this.lobbies[lobbyId])
    }

    createLobby(socket=0){
        const lobbyId = this.makeId()
        this.lobbies[lobbyId] = new Lobby(this.users,this.lobbies,this.socks,lobbyId)

        const lobby = this.lobbies[lobbyId]

        if(socket){
            this.socks.toLobby(socket,lobby) //TO LOBBY
        }
    }

    joinLobby(socket,lobbyId,userId){
        if(this.isLobbyOpen(lobbyId)){
            const lobby = this.getLobbyInfo(lobbyId)
            lobby.addUserToLobby(socket,userId)
        }
        else{
            this.socks.errorPage(socket)
        }
    }

    disconnect(socket){
        const userId = this.socks.getUserId(socket.id)
        if(userId){
            const user = this.users.getInfo(userId)
            const lobby = this.getLobbyInfo(user.lobbyId)
            this.socks.deleteSock(socket.id)

            //redirecting from room to game
            if(lobby.game && !user.inGame){
                // nothing
            }
            else if(lobby.game && !lobby.game.gameOver){
                this.disconnectUserDuringGame(user,lobby)
            }
            else if(!lobby.game || !user.isReturning){
                this.disconnectUserFromRoom(user,lobby)
            }
        }
    }

    disconnectUserDuringGame(user,lobby){
        user.leaveGame()
        if(lobby.isAllDisconnectedFromGame()){
            lobby.deleteGame()
            lobby.deleteAllUsers()
            delete this.lobbies[lobby.lobbyId]
        }
    }

    disconnectUserFromRoom(user,lobby){
        lobby.deleteRoomUser(user.userId)
        this.users.deleteUser(user)
        
        if(lobby.userIds.length == 0){
            lobby.deleteAllUsers()
            delete this.lobbies[lobby.lobbyId]
        }
    }

    readyChange(socket){
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const lobby = this.getLobbyInfo(lobbyId)

        lobby.changeUserReadiness(userId)
    }

    setNewGeneralGameSetting(socket,setting,value){
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        const lobby = this.getLobbyInfo(user.lobbyId)

        lobby.setNewGeneralGameSetting(userId,setting,value)
    }

    setNewPersonalGameSetting(socket,setting,value){
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        user.setNewPersonalGameSetting(setting,value)

        const lobby = this.getLobbyInfo(user.lobbyId)
        lobby.updatePlayerList()
    }

    newChat(socket,chat){
        if(chat.length == 0 || chat.length > MAX_CHAT_LENGTH){
            this.socks.chatError(socket)
        }
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        const userIds = this.getLobbyInfo(user.lobbyId).userIds

        chat = user.userName +': ' + chat
        for(var userId1 of userIds){
            const user1 = this.users.getInfo(userId1)
            if(user1.inGame){
                continue
            }
            const socket1 = user1.socket
            this.socks.newChat(socket1,chat)
        }
    }

    updateName(socket,userName){
        if(!this.isUsernameValid(userName)){
            this.socks.nameError(socket)
            return
        }
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const lobby = this.getLobbyInfo(lobbyId)
        const nameChanged = this.users.changeName(lobby.userIds,userId,userName)

        if(nameChanged){
            this.socks.nameUpdate(socket,userName)
            lobby.updatePlayerList()
        }
        else{
            this.socks.nameTaken(socket)
        }
    }

    isUsernameValid(userName){
        if(userName.length == 0 || userName.length > MAX_USERNAME_LENGTH){
            return(false)
        }

        for(var a in userName){
            var code = userName.charCodeAt(a)
            //UTF8 selection includes only a-z, A-Z, 0-9 
            if((code < 48) || (code < 65 && code > 57) || (code > 122)){
                return(false)
            }
        }
        return(true)
    }

    joinGame(socket,userId,lobbyId,gameId){
        if(!this.doesLobbyExist(lobbyId)){
            this.socks.errorPage(socket)
            return
        }

        const lobby = this.getLobbyInfo(lobbyId)
        if(!lobby.game || lobby.game.gameOver){
            this.socks.toLobby(socket,lobby,socket)
            return
        }
        if(lobby.game && lobby.userIds.includes(userId)){
            lobby.updateUserToBeInGame(userId,socket,gameId)
        }
        else{
            this.socks.errorPage(socket)
        }
    }

    returnFromGame(userId){
        const user = this.users.getInfo(userId)

        user.isNowReturning()

        if(!this.doesLobbyExist(user.lobbyId)){
            this.socks.errorPage(user.socket)
        }
        const lobby = this.getLobbyInfo(user.lobbyId)

        if(!lobby.userIds.includes(userId)){
            this.socks.errorPage(user.socket)
        }
        this.socks.toLobby(user.socket,lobby)
    }

    stopEverything(){
        strictEqual(0,1)
    }
}