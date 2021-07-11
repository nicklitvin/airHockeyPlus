'use strict'

import Ball from './game1Ball.js'

const MINUTES_TO_SECONDS = 60

export default class Game{
    constructor(lobby){
        this.userIds = lobby.userIds
        this.contacts = this.makeContacts()
        this.teams = lobby.teams
        this.lobbyId = lobby.lobbyId

        this.playerRadius = 0
        this.playersToDelete = []

        // in seconds
        this.gameTime = 0
        this.gameTimer = Number(lobby.gameTimer[0])*
            MINUTES_TO_SECONDS //[0] is X from "Xmin"
        this.countdown = 0
        
        // in miliseconds
        this.lastTime = Date.now()
        this.timeDiff = 0

        this.inGame = 1
        this.ball = 0
        this.goals = 0

        this.serverH = 9
        this.serverW = 16
    }

    makeContacts(){
        const count = this.userIds.length
        var contacts = []
        for(var i=0; i<count; i++){
            var ballContact = [this.userIds[i],'ball']
            contacts.push(ballContact)

            for(var p = i+1; p<count; p++){
                var contact = [this.userIds[i],this.userIds[p]]
                contacts.push(contact)
            }
        }
        return(contacts)
    }

    getAllBallIds(){
        var objects = this.userIds.slice()
        if(this.ball){
            objects.push('ball')
        }
        return(objects)
    }

    addBall(){
        const x = this.serverW/2
        const y = this.serverH/2
        this.ball = new Ball(x,y)
    }
}