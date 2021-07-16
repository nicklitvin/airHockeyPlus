'use strict'
import Player from './game1Player.js'

export default class PlayerManager{
    constructor(){
        this.players = {}
    }

    getAllInfo(){
        return(this.players)
    }

    addPlayer(userId,team,userName,radius){
        this.players[userId] = new Player(userId,team,userName,radius)
    }

    deletePlayer(playerId){
        delete this.players[playerId]
    }

    getInfo(playerId){
        return(this.players[playerId])
    }
}