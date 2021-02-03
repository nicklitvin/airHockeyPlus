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

    //TEMPORARY
    endGame(socket){
        const userId = socks.getUserId(socket.id)
        const lobbyId = users.getLobbyId(userId)
        const userIds = lobbies.getUserIds(lobbyId)
        for(var userId1 of userIds){
            const socket1 = users.getSocket(userId1)
            users.readyChange(userId1)
            socks.toLobby(socket1,lobbyId)
        }
        lobbies.endGame(lobbyId)
    }   

    joinGame(socket,userId,lobbyId){
        if(lobbies.lobbyExist(lobbyId) && lobbies.getUserIds(lobbyId).includes(userId)){
            users.joinGame(userId)
            socks.newSock(socket.id,userId)
            users.updateSock(userId,socket)
            return
        }
        socks.errorPage(socket)
    }

    updateGame(lobbyId,game){
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
            this.updateGame(lobbyId,game)
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
        this.updatePlayerList(lobbyId)
    }

    startGame(lobbyId){
        const userIds = lobbies.getUserIds(lobbyId)
        const game = lobbies.getGame(lobbyId)

        lobbies.goingInGame(lobbyId)
        for(var userId of userIds){
            const socket = users.getSocket(userId)
            users.joinGame(userId)
            socks.sendCookie(socket,userId)
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
        this.startGame(lobbyId) 
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
            const socket1 = users.getSocket(userId1)
            socks.newChat(socket1,chat)
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

    returningUser(socket,lobbyId,userId){
        if(lobbies.getOwner(lobbyId) == userId){
            this.ownerView(socket,lobbyId)
        }
        users.updateSock(userId,socket)

        const user = users.getUser(userId)
        const game = lobbies.getGame(lobbyId)
        
        socks.joinLobby(user,game)
        users.notInGame(userId)
        socks.deleteCookie(socket)
        this.updatePlayerList(lobbyId)
    }

    isNewOwner(socket,lobbyId){
        if(lobbies.getUserIds(lobbyId).length == 1){
            lobbies.newOwner(lobbyId)
            this.ownerView(socket,lobbyId)
        }
    }

    addUser(socket,lobbyId){
        const userIds = lobbies.getUserIds(lobbyId)
        const user = users.newUser(socket,lobbyId,userIds)
        const game = lobbies.getGame(lobbyId)

        socks.deleteCookie(socket)
        socks.joinLobby(user,game)
        lobbies.joinLobby(user.userId,lobbyId)
        this.isNewOwner(user.socket,lobbyId)
        this.updatePlayerList(lobbyId)
        
    }

    canJoin(lobbyId){
        const exist = lobbies.lobbyExist(lobbyId)
        if(!exist || lobbies.gameBegun(lobbyId)){
            socks.errorPage(socket)
            return
        }
        return(1)
    }

    joinLobby(socket,lobbyId,userId){
        if(this.canJoin(lobbyId)){
            //returning user
            if(userId && lobbies.getUserIds(lobbyId).includes(userId)){
                this.returningUser(socket,lobbyId,userId)
            }
            //new user
            else{
                this.addUser(socket,lobbyId)
            }
        }
    }

    createLobby(socket=0){
        const lobbyId = lobbies.newLobby()
        if(socket){
            socks.toLobby(socket,lobbyId)
        }
    }

    disconnect(socket){
        const userId = socks.getUserId(socket.id)
        if(userId){
            const lobbyId = users.getLobbyId(userId)
            socks.deleteSock(socket.id)
            //if ingame
            if(users.isInGame(userId)){
                console.log('leaving started game')
            }
            //if inlobby
            else{
                this.deleteUser(userId,lobbyId)
            }
        }
    }

    deleteUser(userId,lobbyId){
        const deleted = lobbies.leaveLobby(userId,lobbyId)
        users.deleteUser(userId)
        //make new owner if owner left
        if(!deleted && !lobbies.getOwner(lobbyId)){
            const newOwner = lobbies.newOwner(lobbyId)
            const socket = users.getSocket(newOwner)
            this.ownerView(socket,lobbyId)
        }
        //just update playerList
        if(!deleted){
            this.updatePlayerList(lobbyId)
        }
    }
}
