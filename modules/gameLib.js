'use strict'
export default class gameLibrary{
    constructor(){
        this.games = {
            game1: {
                title: 'game1',
                description: 'description1'
            },
            game2: {
                title: 'game2',
                description: 'description2'
            }
        }
    }

    getNames(){
        return(Object.keys(this.games))
    }
}