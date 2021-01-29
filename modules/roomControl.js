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
    constructor(){}

    disconnect(socket){
        const userId = socks.getUserId(socket.id)
        if(userId){
            socks.deleteSock(socket.id)
            const lobbyId = users.getLobbyId(userId)
            //if ingame
            if(lobbies.gameBegun(lobbyId)){
                console.log('leaving started game')
            }
            //if inlobby
            else{
                this.deleteUser(userId,lobbyId)
            }
        }
    }

    deleteUser(userId,lobbyId){
        users.deleteUser(userId)
        const deleted = lobbies.leaveLobby(userId,lobbyId)
        //make new owner if owner left
        if(!deleted && !lobbies.getOwner(lobbyId)){
            const newOwner = lobbies.newOwner(lobbyId)
            const socket = users.getSocket(newOwner)
            this.ownerView(socket,lobbyId)
        }
        if(!deleted){
            this.updatePlayerList(lobbyId)
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
            //unready all cause new game
            this.unreadyUsers(lobbyId)
            this.updatePlayerList(lobbyId)
            //update game text
            lobbies.changeGame(lobbyId,game)
            this.gameUpdate(lobbyId,game)
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

    startGame(lobbyId){
        console.log('startingGame')
        lobbies.goingInGame(lobbyId)
        const userIds = lobbies.getUserIds(lobbyId)
        const game = lobbies.getGame(lobbyId)
        for(var userId of userIds){
            const socket = users.getSocket(userId)
            socks.toGame(socket,game,lobbyId)
        }
    }

    weReady(lobbyId){
        const userIds = lobbies.getUserIds(lobbyId)
        //check if everyone ready
        for(var userId of userIds){
            if(!users.isReady(userId)){
                return
            }
        }
        //start game
        if(lobbies.getGame(lobbyId)){
            this.startGame(lobbyId) 
        }
    }

    readyChange(socket){
        const userId = socks.getUserId(socket.id)
        const lobbyId = users.getLobbyId(userId)
        //can't ready if no game selected
        if(!lobbies.getGame(lobbyId)){
            return
        } 
        var readyUp = users.readyChange(userId)
        this.updatePlayerList(lobbyId)
        if(readyUp){
            this.weReady(lobbyId)
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
        //check name eligibility
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
            this.updatePlayerList(lobbyId)
        }
        else{
            socks.nameTaken(socket)
        }
    }

    ownerView(socket,lobbyId){
        const lobbyGame = lobbies.getGame(lobbyId)
        const allGames = gameLib.getNames()
        socks.newOwner(socket,allGames,lobbyGame)
    }

    makeLobbyText(lobbyId){
        var text = 'players: <br>'  
        const lobbyOwner = lobbies.getOwner(lobbyId)
        const userIds = lobbies.getUserIds(lobbyId)
        for(var userId of userIds){
            var mark = '(X)'
            if(users.isReady(userId)){
                mark = '(✓)' //checkmark
            }
            if(userId == lobbyOwner){
                text += users.getName(userId) + mark + ' [party leader] <br>'
            }
            else{
                text += users.getName(userId) + mark + ' <br>'
            }
        }
        return(text)
    }

    updatePlayerList(lobbyId){
        const text = this.makeLobbyText(lobbyId)
        const userIds = lobbies.getUserIds(lobbyId)
        for(var userId of userIds){
            const socket = users.getSocket(userId)
            socks.playerUpdate(socket,text)
        }
    }

    addUser(socket,lobbyId){
        //create user
        const userIds = lobbies.getUserIds(lobbyId)
        const user = users.newUser(socket,lobbyId,userIds)
        socks.newSock(user)
        lobbies.joinLobby(user.userId,lobbyId)
        //make owner if alone
        if(lobbies.getUserIds(lobbyId).length == 1){
            lobbies.newOwner(lobbyId)
            this.ownerView(user.socket,lobbyId)
        }
        this.updatePlayerList(lobbyId)
    }

    joinLobby(socket,lobbyId){
        // check if possible to join
        const exist = lobbies.lobbyExist(lobbyId)
        if(!exist || lobbies.gameBegun(lobbyId)){
            socks.errorPage(socket)
            return
        }
        //add user TODO: remember user
        this.addUser(socket,lobbyId)
    }

    createLobby(socket=0){
        const lobbyId = lobbies.newLobby()
        if(socket){
            socks.toLobby(socket,lobbyId)
        }
    }
}
