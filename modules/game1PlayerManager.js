'use strict'
import Player from './game1Player.js'

export default class PlayerManager{
    constructor(){
        this.players = {}
    }

    getAllInfo(){
        return(this.players)
    }

    addPlayer(userId,team,userName,playerRadius){
        this.players[userId] = new Player(userId,team,userName,playerRadius)
    }

    deletePlayer(playerId){
        delete this.players[playerId]
    }

    getInfo(playerId){
        return(this.players[playerId])
    }
}