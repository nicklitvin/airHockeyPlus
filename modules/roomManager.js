'use strict'

import gameLibrary from "./gameLibrary.js"

const MAX_USERNAME_LENGTH = 12
const MAX_CHAT_LENGTH = 500

export default class RoomManager{
    constructor(io,gameControl,lobbies,users,socks){
        this.gameControl = gameControl
        this.lobbies = lobbies
        this.users = users
        this.socks = socks
        this.gameLib = new gameLibrary()

        io.on('connection', (socket)=>{
            socket.on('newGeneralGameSetting', (setting,value)=>{
                this.setNewGeneralGameSetting(socket,setting,value)
            })
            socket.on('newPersonalGameSetting', (setting,value)=>{
                this.setNewPersonalGameSetting(socket,setting,value)
            })
            socket.on('createLobby', () => {
                this.createLobby(socket)
            })
            socket.on('joinLobby', (lobbyId,userId) =>{
                this.joinLobby(socket,lobbyId,userId)
            })
            socket.on('joinGame', (userId,lobbyId,gameId)=>{
                this.joinGame(socket,userId,lobbyId,gameId)
            })
            socket.on('disconnect', () => {
                this.disconnect(socket)
            })
            socket.on('readyChange', ()=>{
                this.readyChange(socket)
            })
            socket.on('newChat', (chat)=>{
                this.newChat(socket,chat)
            })
            socket.on('nameUpdate', (userName) =>{
                this.updateName(socket,userName)
            })
            socket.on('returnFromGame', (userId)=>{
                this.returnFromGame(userId)
            })
        })
    }

    setNewGeneralGameSetting(socket,setting,value){
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        const lobby = this.lobbies.getInfo(user.lobbyId)

        if(lobby.owner == userId){
            lobby.setNewGeneralGameSetting(setting,value)
            this.updateGameSettingsForUsers(lobby)
        }
        this.giveOwnerView(lobby)
    }

    updateGameSettingsForUsers(lobby){
        lobby.makeGameSettingText()
        const text = lobby.gameSettingsText

        for(var userId of lobby.userIds){
            if(userId != lobby.owner){
                const user = this.users.getInfo(userId)
                user.sendGeneralGameSettingsText(text)
            }
        }
    }

    setNewPersonalGameSetting(socket,setting,value){
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        user.setNewPersonalGameSetting(setting,value)

        const lobby = this.lobbies.getInfo(user.lobbyId)
        this.updatePlayerList(lobby)
    }

    createLobby(socket=0){
        const lobby = this.lobbies.makeNewLobby(this.users,this.socks)

        if(socket){
            this.socks.toLobby(socket,lobby)
        }
    }

    joinLobby(socket,lobbyId,userId){
        if(this.lobbies.isLobbyOpen(lobbyId)){
            const lobby = this.lobbies.getInfo(lobbyId)
            
            //returning user
            if(userId && lobby.userIds.includes(userId)){
                this.rememberUser(socket,lobby,userId)
                this.deleteGameIfAllUsersReturned(lobby)
            }
            //new user
            else{
                this.addUser(socket,lobby)
            }
        }
        else{
            this.socks.errorPage(socket)
        }
    }

    rememberUser(socket,lobby,userId){
        const user = this.users.getInfo(userId)
        user.updateReturnToLobby(socket)

        lobby.removeAwaitingUser(userId)

        if(lobby.owner == userId){
            this.giveOwnerView(lobby)
        }

        this.socks.joinLobby(user)
        this.socks.deleteCookie(socket)
        this.updatePlayerList(lobby)
    }

    deleteGameIfAllUsersReturned(lobby){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            if(user.inGame){
                return
            }
        }
        this.gameControl.deleteGame(lobby)
    }

    addUser(socket,lobby){
        const settings = this.gameLib.getGamePersonalSettings(lobby.gameSettings.gameChoices.chosen)
        const user = this.users.newUser(socket,lobby,settings)

        this.socks.deleteCookie(user.socket)
        this.socks.joinLobby(user) 

        lobby.addNewUser(user.userId)
        if(user.userId == lobby.owner){
            this.giveOwnerView(lobby)
        }
        else{
            user.sendGeneralGameSettingsText(lobby.gameSettingsText)
        }

        this.updatePlayerList(lobby)
    }

    giveOwnerView(lobby){
        const socket = this.users.getInfo(lobby.owner).socket
        socket.emit('generalGameSettingsOwner',lobby.gameSettings)
    }

    updatePlayerList(lobby){
        const text = this.makeLobbyText(lobby)
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            if(user.inGame){
                continue
            }
            const socket = user.socket
            this.socks.playerUpdate(socket,text)
        }
    }

    makeLobbyText(lobby){
        var text = ['players: <br>','black']
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)

            var lineText = `${user.userName}`
            lineText += user.ready ? ' (✓)' : ' (X)'

            if(lobby.owner == userId){
                lineText += ' [party leader]'
            }
            if(user.inGame){
                lineText += ' [not returned]'
            }
            lineText += '<br>'
            text.push(lineText)

            if(user.personalGameSettings.teamChoices.chosen){
                text.push(user.personalGameSettings.teamChoices.chosen)
            }
            else{
                text.push('black')
            }
        }
        return(text)
    }

    // UPDATE STATUS

    joinTeam(socket,team){
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        const lobby = this.lobbies.getInfo(user.lobbyId)

        if(!lobby.teams.includes(team)){
            return
        }
        //cant change color if ready
        if(user.ready){
            this.socks.forceColor(user)
            return
        }
        //change to team
        if(user.team != team){
            user.team = team
        }
        this.updatePlayerList(lobby)
    }

    updateUserGameInfo(userId,lobby,socket){
        const user = this.users.getInfo(userId)
        user.socket = socket
        user.inGame = 1
        this.socks.newSock(socket.id,userId)

        if(lobby.owner == userId){
            user.socket.emit('stopGamePower')
        }
    }

    joinGame(socket,userId,lobbyId,gameId){
        if(!this.lobbies.doesLobbyExist(lobbyId)){
            this.socks.errorPage(socket)
            return
        }

        const lobby = this.lobbies.getInfo(lobbyId)
        if(!lobby.inGame){
            this.socks.toLobby(socket,lobby,socket)
            return
        }

        if(lobby.userIds.includes(userId)){
            if(lobby.gameSettings.gameChoices.chosen == 'game' + gameId){
                this.updateUserGameInfo(userId,lobby,socket)
            }
            // wrong game but correct room
            else{
                this.socks.toGame(socket,lobby)
            }
        }
        else{
            this.socks.errorPage(socket)
        }
    }

    startGame(lobby){
        if(lobby.gameSettings.gameChoices.chosen){
            lobby.inGame = 1
            this.gameControl.newGame(lobby)

            for(var userId of lobby.userIds){
                const user = this.users.getInfo(userId)
                const socket = user.socket
                this.socks.sendCookie(socket,userId)
                this.socks.toGame(socket,lobby)
            }
        }
    }

    unreadyUsers(lobby){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            user.unready()
        }
        this.updatePlayerList(lobby)
    }

    allReadyCheck(lobby){
        for(var userId of lobby.userIds){
            if(!this.users.getInfo(userId).ready){
                return
            }
        }
        this.startGame(lobby) 
    }

    readyChange(socket){
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getInfo(userId).lobbyId   
        const lobby = this.lobbies.getInfo(lobbyId)
        const user = this.users.getInfo(userId)

        if(!lobby.gameSettings.gameChoices.chosen){
            console.log('noGame')
        }
        else if(!user.personalGameSettings.teamChoices.chosen){
            user.sendNoTeamSelectedError()
        }
        else if(user.ready){
            user.unready()
        }
        else{
            user.readyUp()
        }
        
        this.updatePlayerList(lobby)
        if(user.ready){
            this.allReadyCheck(lobby)
        }
    }

    isUsernameValid(userName){
        if(userName.length == 0 || userName.length > MAX_USERNAME_LENGTH){
            return(0)
        }

        for(var a in userName){
            var code = userName.charCodeAt(a)
            //UTF8 selection includes only a-z, A-Z, 0-9 
            if((code < 48) || (code < 65 && code > 57) || (code > 122)){
                return(0)
            }
        }
        return(1)
    }
    
    updateName(socket,userName){
        if(!this.isUsernameValid(userName)){
            this.socks.nameError(socket)
            return
        }
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const lobby = this.lobbies.getInfo(lobbyId)
        const nameChanged = this.users.changeName(lobby.userIds,userId,userName)

        if(nameChanged){
            this.socks.nameUpdate(socket,userName)
            this.updatePlayerList(lobby)
        }
        else{
            this.socks.nameTaken(socket)
        }
    }

    newChat(socket,chat){
        if(chat.length == 0 || chat.length > MAX_CHAT_LENGTH){
            this.socks.chatError(socket)
        }
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        const userIds = this.lobbies.getInfo(user.lobbyId).userIds

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

    // JOIN/LEAVE

    returnFromGame(userId){
        const user = this.users.getInfo(userId)
        if(!this.lobbies.doesLobbyExist(user.lobbyId)){
            this.socks.errorPage(user.socket)
        }
        const lobby = this.lobbies.getInfo(user.lobbyId)
        if(!lobby.userIds.includes(userId)){
            this.socks.errorPage(user.socket)
        }
        lobby.awaitingUsers.push(userId)
        this.socks.toLobby(user.socket,lobby)
    }

    disconnect(socket){
        const userId = this.socks.getUserId(socket.id)
        if(userId){
            const user = this.users.getInfo(userId)
            const lobby = this.lobbies.getInfo(user.lobbyId)
            this.socks.deleteSock(socket.id)

            // disconnecting while gaming
            if(lobby.inGame && user.inGame){
                user.inGame = 0
                this.isAllDisconnected(lobby)
            }
            // disconnecting while no gaming
            else if(!lobby.inGame && !lobby.awaitingUsers.includes(userId)){
                this.deleteRoomUser(user,lobby)
            }
        }
    }

    isAllDisconnected(lobby){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            if(user.inGame){
                return
            }
        }
        this.deleteGameAndRoom(lobby)
    }

    deleteGameAndRoom(lobby){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            this.users.deleteUser(user)
        }
        this.lobbies.deleteLobby(lobby)
        this.gameControl.deleteGame(lobby)
    }

    deleteRoomUser(user,lobby){
        lobby.deleteUser(user.userId)

        if(lobby.userIds.length == 0){
            this.lobbies.deleteLobby(lobby)
            return
        }
        if(!lobby.owner){
            lobby.makeNewOwner()
            this.giveOwnerView(lobby)
        }

        this.users.deleteUser(user)
        this.updatePlayerList(lobby)
        this.allReadyCheck(lobby)
    }
}
