'use strict'

export default class User{
    constructor(userId,socket,lobbyId,userName){
        this.userId = userId
        this.socket = socket
        this.lobbyId = lobbyId
        this.userName = userName
        this.ready = 0
        // this.team = 0

        this.inGame = 0
        this.personalGameSettings = null
    }

    updateReturnToLobby(socket){
        this.inGame = 0 
        this.socket = socket
    }

    unready(){
        this.ready = 0
    }

    readyUp(){
        this.ready = 1
    }

    setPersonalGameSettings(personalGameSettings){
        this.personalGameSettings = personalGameSettings
    }

    setNewPersonalGameSetting(setting,value){
        var settings = this.personalGameSettings

        if( !Object.keys(settings).includes(setting) ||
            (!settings[setting].options.includes(value) && value != 'null'))
        {
            this.sendSettingsValuesError()
            this.sendUpToDatePersonalSettings()
            return
        }
        
        if(setting == 'teamChoices' && this.ready){
            this.sendTeamChangeError()
            this.sendUpToDatePersonalSettings()
            return
        }

        if(value == 'null'){
            settings[setting].chosen = null
        }
        else{
            settings[setting].chosen = value
        }
    }

    leaveGame(){
        this.inGame = 0
    }

    updateInfoOnGameJoin(socket){
        this.inGame = 1
        this.socket = socket
    }

    sendTeamChangeError(){
        const socket = this.socket
        socket.emit('personalGameSettingsError',"can't change teams when ready")
    }

    sendSettingsValuesError(){
        const socket = this.socket
        socket.emit('personalGameSettingsError','nice try')
    }

    sendNoTeamSelectedError(){
        const socket = this.socket
        socket.emit('personalGameSettingsError','no team selected')
    }

    sendUpToDatePersonalSettings(){
        const socket = this.socket
        socket.emit('personalGameSettings',this.personalGameSettings)
    }

    sendGeneralGameSettingsText(text){
        const socket = this.socket
        socket.emit('generalGameSettingsText',text)
    }
}