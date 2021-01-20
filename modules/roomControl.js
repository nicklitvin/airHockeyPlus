'use strict'
import LobbyManager from './lobby.js'
import SockManager from './sock.js'
import UserManager from './users.js'

const lobbies = new LobbyManager()
const users = new UserManager()
const socks = new SockManager()

export default class RoomControl{
    constructor(){
        this.recentUsers = {}
    }

    newChat(socket,chat){
        if(chat.length == 0 || chat.length >500){
            socks.chatError(socket)
        }
        const userId = socks.getUserId(socket.id)
        const lobbyId = users.getLobbyId(userId)
        const userIds = lobbies.getUserIds(lobbyId)
        chat = users.getName(userId) +': ' + chat
        for(var a of userIds){
            const socket = users.getSocket(a)
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
        for(var a of userIds){
            if(a == lobbyOwner){
                text += users.getName(a) + ' [party leader] <br>'
            }
            else{
                text += users.getName(a) + ' <br>'
            }
        }
        for(var a of userIds){
            const socket = users.getSocket(a)
            socks.playerUpdate(socket,text)
        }
    }
}
