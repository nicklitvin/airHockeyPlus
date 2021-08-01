'use strict'

export default class Lobby{
    constructor(lobbyId){
        this.lobbyId = lobbyId
        this.userIds = []
        this.owner = 0
        this.game = 0  //change to gameName
        this.inGame = 0
        this.gameTimer = 0
        this.teams = []
        this.awaitingUsers = []
    }

    setNewGame(gameInfo){
        this.teams = gameInfo.teamChoices
        this.gameTimer = gameInfo.defaultGameTime
        this.game = gameInfo.title
    }
    
    removeAwaitingUser(userId){
        var awaitingUsers = this.awaitingUsers
        for(var a in awaitingUsers){
            if(awaitingUsers[a] == userId){
                awaitingUsers.splice(a,1)
            }
        }
    }

    addNewUser(userId){
        this.userIds.push(userId)
        
        if(!this.owner){
            this.makeNewOwner(userId)
        }
    }

    deleteUser(userId){
        for(var a in this.userIds){
            if(this.userIds[a] == userId){
                this.userIds.splice(a,1)
            }
        }
        if(this.owner == userId){
            this.owner = ''   
        }
    }

    makeNewOwner(userId=0){
        if(userId){
            this.owner = userId
        }
        else{
            this.owner = this.userIds[0]
        }
    }

    endGame(){
        this.inGame = 0
    }
}