'use strict'

export default class GameLibrary{
    constructor(){
        this.defaultGameName = 'game1',

        this.games = {
            game1: {
                title: 'game1',
                description: 'description1',
                timeChoices: ['1min','3min','5min'],
                defaultGameTime: '1min',
                teamChoices: ['orange','blue']
            }
        }
    }

    getGameInfo(gameName){
        return(this.games[gameName])
    }

    getDefaultGameName(){
        return(this.defaultGameName)
    }

    getNames(){
        return(Object.keys(this.games))
    }
}