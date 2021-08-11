'use strict'

import Game from "./game1/game1Game.js"

export default class GameLibrary{
    constructor(){
        this.gameSettingsText = null,

        this.gameChoices = {
            title: 'choose game: ',
            options: null,
            chosen: null,
            chosenText: 'game chosen: '
        },

        this.games = {
            game1: {
                title: 'game1',
                description: 'Air hockey with no boundaries and impulse ability',

                personalSettings: {
                    control: {
                        title: 'choose move type: ',
                        options: ['wasd','mouse'],
                        chosen: null
                    },
                    teamChoices: {
                        title: 'choose team: ',
                        options: [null,'orange','blue'],
                        chosen: null
                    }
                },
                gameSettings:{
                    timeChoices:{
                        title: 'choose game time: ',
                        options: ['1min','3min','5min'],
                        chosen: null,
                        chosenText: 'game time: '
                    }
                }
            }
        }
        this.updateGameList()
        this.makeChosenToBeFirstOption()
        this.makeGameSettingText()
    }

    makeChosenToBeFirstOption(){
        this.gameChoices.chosen = Object.keys(this.games)

        for(var gameName of Object.keys(this.games) ){
            const game = this.games[gameName]
            for(var settingName of Object.keys(game.personalSettings)){
                const setting = game.personalSettings[settingName]
                setting.chosen = setting.options[0]
            } 
            for(var settingName of Object.keys(game.gameSettings)){
                const setting = game.gameSettings[settingName]
                setting.chosen = setting.options[0]
            } 
        }
    }

    updateGameList(){
        const gameNames = this.getNames()
        this.gameChoices.options = gameNames
    }

    getGamePersonalSettings(){
        const gameName = this.getChosenGame()
        return(this.makeCopy(this.games[gameName].personalSettings))
    }

    getGameGeneralSettings(){
        var dict = {}
        dict.gameChoices = this.gameChoices

        const gameName = this.getChosenGame()
        const settings = this.makeCopy(this.games[gameName].gameSettings)
        for(var setting of Object.keys(settings)){
            dict[setting] = settings[setting]
        }
        return(dict)
    }

    makeCopy(dict){
        var copy = {} 
        for(var key of Object.keys(dict)){
            copy[key] = {...dict[key]}
        }
        return(copy)
    }

    getNames(){
        return(Object.keys(this.games))
    }

    getChosenGame(){
        return(this.gameChoices.chosen)
    }

    getImportantSettings(){
        return({
            teams: this.getTeamsWithoutNull(), 
            time: this.getGameTime()
        })
    }

    getTeamsWithoutNull(){
        const gameName = this.getChosenGame()
        const teams = this.games[gameName].personalSettings.teamChoices.options
        
        var newTeams = []
        for(var team of teams){
            if(team){
                newTeams.push(team)
            }
        }
        return(newTeams)
    }

    getGameTime(){
        const gameName = this.getChosenGame()
        return(Number(this.games[gameName].gameSettings.timeChoices.chosen[0]))
    }

    makeNewGame(users,lobbies,userIds){
        const game = new Game(users,lobbies,userIds,this.getImportantSettings())
        return(game)
    }

    applyNewSetting(setting,value){
        const gameName = this.getChosenGame()
        const settingInfo = this.games[gameName].gameSettings[setting]

        if(gameName && settingInfo && settingInfo.options.includes(value)){
            settingInfo.chosen = value
        }

        this.makeGameSettingText()
    }

    makeGameSettingText(){
        const gameName = this.getChosenGame()
        const gameSettings = this.games[gameName].gameSettings

        var text = ''
        text += this.gameChoices.chosenText + this.gameChoices.chosen + '<br>'

        for(var settingName of Object.keys(gameSettings)){
            const setting = gameSettings[settingName]
            text += setting.chosenText + setting.chosen + '<br>'
        }
        this.gameSettingsText = text
    }
}