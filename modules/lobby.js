'use strict'

import GameLibrary from './gameLibrary.js'

const MILLISECONDS_IN_SECOND = 1000

export default class Lobby{
    constructor(users,lobbies,socks,lobbyId){
        this.users = users
        this.lobbies = lobbies
        this.socks = socks

        this.lobbyId = lobbyId
        this.userIds = []
        this.owner = null
        this.inGame = false

        this.game = null  
        this.gameLibrary = new GameLibrary()
    }

    deleteGame(){
        this.game = null
    }

    deleteAllUsers(){
        for(var userId of this.userIds){
            const user = this.users.getInfo(userId)
            this.users.deleteUser(user)
        }
    }

    addUserToLobby(socket,userId){
        //returning user
        if(userId && this.userIds.includes(userId)){
            this.rememberUser(socket,userId)
            this.deleteGameIfAllUsersReturned()
        }
        //new user
        else{
            this.addNewUser(socket)
        }
    }

    deleteUserFromUserList(userId){
        for(var a in this.userIds){
            if(this.userIds[a] == userId){
                this.userIds.splice(a,1)
            }
        }
        if(this.owner == userId){
            this.owner = ''   
        }
    }

    addNewUser(socket){
        const personalSettings = this.gameLibrary.getGamePersonalSettings()
        const user = this.users.newUserExperiment(socket,personalSettings,this.userIds,this.lobbyId)

        this.socks.deleteCookie(user.socket)
        this.socks.joinLobby(user) 
        this.addNewUserToList(user.userId)
        this.sendAppropriateGameSettings(user)
        this.updatePlayerList()
    }

    sendAppropriateGameSettings(user){
        if(user.userId == this.owner){
            this.giveOwnerView()
        }
        else{
            user.sendGeneralGameSettingsText(this.gameLibrary.gameSettingsText)
        }
    }

    addNewUserToList(userId){
        this.userIds.push(userId)
        
        if(!this.owner){
            this.makeNewOwner(userId)
        }
    }

    makeNewOwner(userId=0){
        if(userId){
            this.owner = userId
        }
        else{
            this.owner = this.userIds[0]
        }
    }

    rememberUser(socket,userId){
        const user = this.users.getInfo(userId)
        
        user.updateReturnToLobby(socket)
        this.game.removeFromWillReturnList(userId)
        this.sendAppropriateGameSettings(user)
        this.socks.joinLobby(user)
        this.socks.deleteCookie(socket)
        this.updatePlayerList()
    }

    giveOwnerView(){
        const socket = this.users.getInfo(this.owner).socket
        const gameSettings = this.gameLibrary.getGameGeneralSettings()
        socket.emit('generalGameSettingsOwner',gameSettings)
    }

    updatePlayerList(){
        const text = this.makeLobbyText()
        for(var userId of this.userIds){
            const user = this.users.getInfo(userId)
            if(user.inGame){
                continue
            }
            const socket = user.socket
            this.socks.playerUpdate(socket,text)
        }
    }

    makeLobbyText(){
        var text = ['players: <br>','black']
        for(var userId of this.userIds){
            const user = this.users.getInfo(userId)

            var lineText = `${user.userName}`
            lineText += user.ready ? ' (✓)' : ' (X)'

            if(this.owner == userId){
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

    deleteGameIfAllUsersReturned(){
        if(this.game.willReturn.length == 0){
            this.deleteGame()
        }
    }

    isAllDisconnectedFromGame(){
        for(var userId of this.userIds){
            const user = this.users.getInfo(userId)
            if(user.inGame){
                return(false)
            }
        }
        return(true)
    }

    deleteRoomUser(userId){
        this.deleteUserFromUserList(userId)

        if(this.userIds.length == 0){
            return
        }
        if(this.game && this.game.willReturn.includes(userId)){
            this.game.removeFromWillReturnList(userId)
        }
        if(!this.owner){
            this.makeNewOwner()
            const user = this.users.getInfo(this.owner)

            if(!user.inGame){
                this.giveOwnerView()
            }
        }

        this.updatePlayerList()
        this.allReadyCheck()
    }

    allReadyCheck(){
        for(var userId of this.userIds){
            if(!this.users.getInfo(userId).ready){
                return
            }
        }
        this.startGame() 
    }

    startGame(){
        if(this.gameLibrary.getChosenGame()){
            this.inGame = true
            this.game = this.gameLibrary.makeNewGame(this.users,this.lobbies,this.userIds)

            this.sendUsersToGame()
        }
    }

    sendUsersToGame(){
        for(var userId of this.userIds){
            const user = this.users.getInfo(userId)
            const socket = user.socket
            const gameName = this.gameLibrary.getChosenGame()

            this.socks.sendCookie(socket,userId)
            this.socks.toGame(socket,gameName,this.lobbyId)
        }
    }

    changeUserReadiness(userId){
        const user = this.users.getInfo(userId)
        const gameName = this.gameLibrary.getChosenGame()

        if(!gameName){
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
        
        this.updatePlayerList()
        if(user.ready){
            this.allReadyCheck()
        }
    }

    setNewGeneralGameSetting(userId,setting,value){
        if(this.owner == userId){
            this.gameLibrary.applyNewSetting(setting,value)
            this.updateGameSettingsForUsers()
        }
        this.giveOwnerView()
    }

    updateGameSettingsForUsers(){
        const text = this.gameLibrary.gameSettingsText

        for(var userId of this.userIds){
            if(userId != this.owner){
                const user = this.users.getInfo(userId)
                user.sendGeneralGameSettingsText(text)
            }
        }
    }

    updateUserToBeInGame(userId,socket,gameId){
        if(this.gameLibrary.getChosenGame() == 'game' + gameId){
            const user = this.users.getInfo(userId)
            user.updateInfoOnGameJoin(socket)
            this.socks.newSock(socket.id,userId)
            // have game library control what needs to be sent
            user.sendCurrentMovementSetting() 

            if(this.owner == userId){
                user.socket.emit('stopGamePower')
            }
        }
        // wrong game but correct room
        else{
            const gameName = this.gameLibrary.getChosenGame()
            this.socks.toGame(socket,gameName,this.lobbyId)
        }
    }
}