'use strict'

import GameLibrary from './gameLibrary.js'

export default class Lobby{
    constructor(users,socks,lobbyId){
        this.users = users
        this.socks = socks

        this.lobbyId = lobbyId
        this.userIds = []
        this.owner = 0
        this.inGame = 0
        this.awaitingUsers = []

        this.game = null  
        this.gameTimer = 0
        this.teams = []

        this.gameSettings = null
        this.gameSettingsText = null
        this.gameLibrary = new GameLibrary()

        this.setGameSettings()
    }

    setGameSettings(){
        const gameName = this.gameLibrary.getDefaultGameName()
        const generalSettings = this.gameLibrary.getGameGeneralSettings(gameName)
        this.setNewGame(generalSettings)

        const personalSettings = this.gameLibrary.getGamePersonalSettings(gameName) 
        const teams = personalSettings.teamChoices.options
        this.setTeams(teams)
    }

    setNewGame(gameSettings){
        this.gameSettings = gameSettings
        this.makeGameSettingText()
    }

    setTeams(teams){
        for(var team of teams){
            if(team){
                this.teams.push(team)
            }
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

    addAwaitingUser(userId){
        this.awaitingUsers.push(userId)
    }

    getGameName(){
        return(this.gameSettings.gameChoices.chosen)
    }

    addNewUser(socket){
        const gameName = this.getGameName()
        const personalSettings = this.gameLibrary.getGamePersonalSettings(gameName)
        const user = this.users.newUserExperiment(socket,personalSettings,this.userIds,this.lobbyId)

        this.socks.deleteCookie(user.socket)
        this.socks.joinLobby(user) 

        this.addNewUserToList(user.userId)
        if(user.userId == this.owner){
            this.   giveOwnerView()
        }
        else{
            user.sendGeneralGameSettingsText(this.gameSettingsText)
        }

        this.updatePlayerList()
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

        this.removeAwaitingUser(userId)

        if(this.owner == userId){
            this.giveOwnerView()
        }

        this.socks.joinLobby(user)
        this.socks.deleteCookie(socket)
        this.updatePlayerList()
    }

    removeAwaitingUser(userId){
        var awaitingUsers = this.awaitingUsers
        for(var a in awaitingUsers){
            if(awaitingUsers[a] == userId){
                awaitingUsers.splice(a,1)
            }
        }
    }

    giveOwnerView(){
        const socket = this.users.getInfo(this.owner).socket
        socket.emit('generalGameSettingsOwner',this.gameSettings)
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

    // GAME CONTROL REMOVED
    deleteGameIfAllUsersReturned(){
        for(var userId of this.userIds){
            const user = this.users.getInfo(userId)
            if(user.inGame){
                return
            }
        }
        this.game = null
    }

    disconnectUserFromLobby(user){
        // disconnecting while gaming
        if(this.inGame && user.inGame){
            user.inGame = 0
        }
        // disconnecting while no gaming
        else if(!this.inGame && !this.awaitingUsers.includes(user.userId)){
            this.deleteRoomUser(user)
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

    deleteRoomUser(user){
        this.deleteUserFromUserList(user.userId)

        if(this.userIds.length == 0){
            return
        }
        if(!this.owner){
            this.makeNewOwner()
            this.giveOwnerView()
        }

        this.users.deleteUser(user)
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
        if(this.gameSettings.gameChoices.chosen){
            this.inGame = 1
            // this.gameLibrary.makeNewGame(gameName)

            for(var userId of this.userIds){
                const user = this.users.getInfo(userId)
                const socket = user.socket
                this.socks.sendCookie(socket,userId)
                this.socks.toGameExperiment(socket,this.getGameName(),this.lobbyId)
                // this.socks.toGame(socket,lobby) // LOBBY SENDING?
            }
        }
    }

    changeUserReadiness(userId){
        const user = this.users.getInfo(userId)

        if(!this.gameSettings.gameChoices.chosen){
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
            this.updateGeneralGameSetting(setting,value)
            this.updateGameSettingsForUsers()
        }
        this.giveOwnerView()
    }

    updateGeneralGameSetting(setting,value){
        if( this.gameSettings[setting] &&
            this.gameSettings[setting].options.includes(value))
        {
            this.gameSettings[setting].chosen = value
        }
    }

    updateGameSettingsForUsers(){
        this.makeGameSettingText()
        const text = this.gameSettingsText

        for(var userId of this.userIds){
            if(userId != this.owner){
                const user = this.users.getInfo(userId)
                user.sendGeneralGameSettingsText(text)
            }
        }
    }

    makeGameSettingText(){
        var text = ''
        for(var settingName of Object.keys(this.gameSettings)){
            const setting = this.gameSettings[settingName]
            text += setting.chosenText + setting.chosen + '<br>'
        }
        this.gameSettingsText = text
    }
}