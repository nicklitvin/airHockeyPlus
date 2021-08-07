'use strict'

export default class GameLibrary{
    constructor(){
        this.defaultGameName = 'game1',

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
                    gameChoices: {
                        title: 'choose game: ',
                        options: null,
                        chosen: null,
                        chosenText: 'game chosen: '
                    },
                    timeChoices:{
                        title: 'choose game time: ',
                        options: ['1min','3min','5min'],
                        chosen: null,
                        chosenText: 'game time: '
                    }
                }
            }
        }
        this.updateGamesWithAllNames()
        this.makeChosenToBeFirstOption()
    }

    makeChosenToBeFirstOption(){
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

    updateGamesWithAllNames(){
        const gameNames = this.getNames()
        for(var game of gameNames){
            this.games[game].gameSettings.gameChoices.options = gameNames
        }            
    }

    getGamePersonalSettings(gameName){
        return(this.makeCopy(this.games[gameName].personalSettings))
    }

    getGameGeneralSettings(gameName){
        return(this.makeCopy(this.games[gameName].gameSettings))
    }

    makeCopy(dict){
        var copy = {} 
        for(var key of Object.keys(dict)){
            copy[key] = {...dict[key]}
        }
        return(copy)
    }

    getDefaultGameName(){
        return(this.defaultGameName)
    }

    getNames(){
        return(Object.keys(this.games))
    }
}