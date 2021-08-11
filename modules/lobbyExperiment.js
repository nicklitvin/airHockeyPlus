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
        this.gameLibrary = new GameLibrary()
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

    addNewUser(socket){
        const personalSettings = this.gameLibrary.getGamePersonalSettings()
        const user = this.users.newUserExperiment(socket,personalSettings,this.userIds,this.lobbyId)

        this.socks.deleteCookie(user.socket)
        this.socks.joinLobby(user) 

        this.addNewUserToList(user.userId)
        if(user.userId == this.owner){
            this.giveOwnerView()
        }
        else{
            user.sendGeneralGameSettingsText(this.gameLibrary.gameSettingsText)
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
        if(!this.owner){
            this.makeNewOwner()
            this.giveOwnerView()
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
            this.inGame = 1
            this.game = this.gameLibrary.makeNewGame(this.users,
                this.lobbies,this.userIds)

            this.sendUsersToGame()
            this.runGameUntilEnd()
        }
    }

    runGameUntilEnd(){
        setInterval( () =>{
            const game = this.game
            const info = game.getAllSendingInfo()
            game.sendGame(info)
            
            game.updateGameTime()

            if(game.gameTime >= game.gameTimer){
                game.endGameExperiment()
                return
            }
            game.updateGame()

        },10)
    }

    sendUsersToGame(){
        for(var userId of this.userIds){
            const user = this.users.getInfo(userId)
            const socket = user.socket
            const gameName = this.gameLibrary.getChosenGame()

            this.socks.sendCookie(socket,userId)
            this.socks.toGameExperiment(socket,gameName,this.lobbyId)
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

            if(this.owner == userId){
                user.socket.emit('stopGamePower')
            }
        }
        // wrong game but correct room
        else{
            const gameName = this.gameLibrary.getChosenGame()
            this.socks.toGameExperiment(socket,gameName,this.lobbyId)
        }
    }
}