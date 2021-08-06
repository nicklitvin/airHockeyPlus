'use strict'

import Player from './game1Player.js'

export default class PlayerManager{
    constructor(){
        this.players = {}
    }

    getAllInfo(){
        return(this.players)
    }

    addPlayer(userId,settings,userName,radius){
        this.players[userId] = new Player(userId,settings,userName,radius)
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

    getScorersOrdered(){
        var scorers = []
        for(var playerId of Object.keys(this.players) ){
            const player = this.getInfo(playerId)
            if(player.goals){
                scorers.push(player)
            }
        }
        scorers.sort( (a,b) => b.goals - a.goals)
        return(scorers)
    }
}