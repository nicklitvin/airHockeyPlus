'use strict'
import LobbyManager from './lobby.js'
import SockManager from './sock.js'
import UserManager from './users.js'
import gameLibrary from './gameLib.js'

const lobbies = new LobbyManager()
const users = new UserManager()
const socks = new SockManager()
const gameLib = new gameLibrary()

export default class RoomControl{
    constructor(){
        this.recentUsers = {}
    }

    startGame(lobbyId){
        console.log('startingGame')
        const userIds = lobbies.getUserIds(lobbyId)
        const game = lobbies.getGame(lobbyId)
        for(var userId of userIds){
            const socket = users.getSocket(userId)
            socks.toGame(socket,game,lobbyId)
        }
    }

    weReady(lobbyId){
        const userIds = lobbies.getUserIds(lobbyId)
        for(var userId of userIds){
            if(!users.isReady(userId)){
                return
            }
        }
        if(lobbies.getGame(lobbyId)){
            this.startGame(lobbyId) 
        }
    }

    readyChange(socket){
        const userId = socks.getUserId(socket.id)
        const lobbyId = users.getLobbyId(userId)
        if(!lobbies.getGame(lobbyId)){
            return
        } 
        var readyUp = users.readyChange(userId)
        this.updateRoom(lobbyId)
        if(readyUp){
            this.weReady(lobbyId)
        }
    }

    gameUpdate(lobbyId,game){
        const userIds = lobbies.getUserIds(lobbyId)
        for(var userId of userIds){
            const socket = users.getSocket(userId)
            socks.gameUpdate(socket,game)
        }
    }

    gameChange(socket,game){
        if(gameLib.getNames().includes(game)){
            const userId = socks.getUserId(socket.id)
            const lobbyId = users.getLobbyId(userId)
            this.unreadyUsers(lobbyId)
            lobbies.changeGame(lobbyId,game)
            this.gameUpdate(lobbyId,game)
            this.updateRoom(lobbyId)
        }
        else{
            console.log('gameChangeError')
        }
    }

    unreadyUsers(lobbyId){
        const userIds = lobbies.getUserIds(lobbyId)
        for(var userId of userIds){
            users.unready(userId)
        }
    }

    newChat(socket,chat){
        if(chat.length == 0 || chat.length >500){
            socks.chatError(socket)
        }
        const userId = socks.getUserId(socket.id)
        const lobbyId = users.getLobbyId(userId)
        const userIds = lobbies.getUserIds(lobbyId)
        chat = users.getName(userId) +': ' + chat
        for(var userId1 of userIds){
            const socket = users.getSocket(userId1)
            socks.newChat(socket,chat)
        }
    }

    updateName(socket,userName){
        if(userName.length==0 || userName.length>12){
            socks.nameError(socket)
            return
        }
        const userId = socks.getUserId(socket.id)
        const lobbyId = users.getLobbyId(userId)
        const userIds = lobbies.getUserIds(lobbyId)
        const nameChange = users.changeName(userIds,userId,userName)
        if(nameChange){
            socks.nameUpdate(socket,userName)
            this.updateRoom(lobbyId)
        }
        else{
            socks.nameTaken(socket)
        }
    }

    joinLobby(socket,lobbyId){
        let newOwner
        const exist = lobbies.lobbyExist(lobbyId)
        if(!exist){
            socks.errorPage(socket)
            return
        }
        const userIds = lobbies.getUserIds(lobbyId)
        if(userIds.length == 0){
            newOwner = 1
        }
        const user = users.newUser(socket,lobbyId,userIds)
        socks.newSock(user)
        lobbies.joinLobby(user)
        if(newOwner){
            lobbies.newOwner(lobbyId)
        }
        else{
            socks.gameUpdate(socket,lobbies.getGame(lobbyId))
        }
        this.updateRoom(lobbyId)
    }

    createLobby(socket){
        var lobbyId = lobbies.newLobby()
        socks.toLobby(socket,lobbyId)
    }

    disconnect(socket){
        var userId = socks.deleteSock(socket.id)
        if (userId){
            var lobbyId = users.deleteUser(userId)
            //if room not deleted
            if(!lobbies.leaveLobby(userId,lobbyId)){
                if(lobbies.getOwner(lobbyId)==userId){
                    lobbies.newOwner(lobbyId)
                }
                this.updateRoom(lobbyId)
            }
        }
    }

    updateRoom(lobbyId,userIds=0){
        if(!userIds){
            userIds = lobbies.getUserIds(lobbyId)
        }
        var lobbyOwner = lobbies.getOwner(lobbyId)
        var text = 'players: <br>'
        for(var userId of userIds){
            var mark = '(X)'
            var ready = users.isReady(userId)
            if(ready){
                mark = '(✓)' //checkmark
            }
            if(userId == lobbyOwner){
                text += users.getName(userId) + mark + ' [party leader] <br>'
            }
            else{
                text += users.getName(userId) + mark + ' <br>'
            }
        }
        for(var userId of userIds){
            const socket = users.getSocket(userId)
            socks.playerUpdate(socket,text)
        }
        if(lobbies.isNewOwner(lobbyId)){
            const lobbyGame = lobbies.getGame(lobbyId)
            const allGames = gameLib.getNames()
            const socket = users.getSocket(lobbyOwner)
            socks.newOwner(socket,allGames,lobbyGame)
        }
    }
}
