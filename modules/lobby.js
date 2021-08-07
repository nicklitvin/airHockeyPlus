'use strict'

export default class Lobby{
    constructor(lobbyId){
        this.lobbyId = lobbyId
        this.userIds = []
        this.owner = 0
        this.inGame = 0
        this.awaitingUsers = []

        this.game = 0  //change to gameName
        this.gameTimer = 0
        this.teams = []

        this.gameSettings = null
        this.gameSettingsText = null
    }

    setTeams(teams){
        for(var team of teams){
            if(team){
                this.teams.push(team)
            }
        }
    }

    setNewGame(gameSettings){
        this.gameSettings = gameSettings
        this.makeGameSettingText()
    }

    setNewGeneralGameSetting(setting,value){
        if( this.gameSettings[setting] &&
            this.gameSettings[setting].options.includes(value))
        {
            this.gameSettings[setting].chosen = value
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

    removeAwaitingUser(userId){
        var awaitingUsers = this.awaitingUsers
        for(var a in awaitingUsers){
            if(awaitingUsers[a] == userId){
                awaitingUsers.splice(a,1)
            }
        }
    }

    addNewUser(userId){
        this.userIds.push(userId)
        
        if(!this.owner){
            this.makeNewOwner(userId)
        }
    }

    deleteUser(userId){
        for(var a in this.userIds){
            if(this.userIds[a] == userId){
                this.userIds.splice(a,1)
            }
        }
        if(this.owner == userId){
            this.owner = ''   
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

    endGame(){
        this.inGame = 0
    }
}