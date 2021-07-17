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

    getAllPlayerSendingInfo(){
        const playerInfo = []
        for(var playerId of Object.keys(this.players)){
            const player = this.players[playerId]
            const info = player.getSendingInfo()
            playerInfo.push(info)
        }
        return(playerInfo)
    }

    restartImpulseCooldowns(){
        for(var playerId of Object.keys(this.players)){
            const player = this.players[playerId]
            player.decreaseImpulseCooldown(player.impulseCooldown)
        }
    }
}