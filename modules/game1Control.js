'user strict'

import PlayerManager from './game1Player.js'

class Game{
    constructor(userIds,contacts){
        this.userIds = userIds,
        this.contacts = contacts,
        this.serverH = 9,
        this.serverW = 16,
        this.speed = 0.1,
        this.impulseMagnitude = 1,
        this.impulseRadius = 2,
        this.spawnRadius = 4,
        this.bounceStrength = 0.1
    }
}

export default class Game1Control{
    constructor(io,users){
        this.users = users,
        this.players = new PlayerManager(this.users,users),
        this.games = {}

        io.on('connection', (socket)=>{
            socket.on('game1Move', (userId,move)=>{
                this.movePlayer(userId,move)
            })
            socket.on('game1Impulse', (userId)=>{
                this.impulsePlayer(userId)
            })
        })
    }

    playerContact(lobbyId,player,target){
        const strength = this.games[lobbyId].bounceStrength
        const angle = Math.atan(Math.abs(player.y-target.y)/Math.abs(player.x-target.x))
        const dx = Math.cos(angle)*strength
        const dy = Math.sin(angle)*strength

        // push down
        if (player.y<target.y){
            this.players.bounce(player.userId,'vertical',-dy)
            this.players.bounce(target.userId,'vertical',dy)
        }
        // push up
        if (player.y>target.y){
            this.players.bounce(player.userId,'vertical',dy)
            this.players.bounce(target.userId,'vertical',-dy)
        }
        // push right
        if (player.x<target.x){
            this.players.bounce(player.userId,'horizontal',-dx)
            this.players.bounce(target.userId,'horizontal',dx)
        }
        // push left
        if (player.x>target.x){
            this.players.bounce(player.userId,'horizontal',dx)
            this.players.bounce(target.userId,'horizontal',-dx)
        }                
    }

    bounceControl(userIds){
        for(var userId of userIds){
            const lobbyId = this.users.getLobbyId(userId)
            const serverH = this.games[lobbyId].serverH
            const serverW = this.games[lobbyId].serverW
            this.players.resolveBounce(userId,serverH,serverW)
        }

        for(var lobbyId of Object.keys(this.games)){
            const contacts = this.games[lobbyId].contacts
            if(!contacts){
                continue
            }
            for(var contact of contacts){
                this.checkCollision(contact[0],contact[1],lobbyId)
            }
        }
    }

    wallBounce(userId,lobbyId){
        const loc = this.players.getCoordinates(userId)
        const impMagn = this.games[lobbyId].impulseMagnitude
        const serverH = this.games[lobbyId].serverH
        const serverW = this.games[lobbyId].serverW
        
        //closest to which wall
        const yDist = Math.min(serverH-loc.y,loc.y)
        const xDist = Math.min(serverW-loc.x,loc.x)

        if(yDist < 2){ 
            if(serverH-loc.y<loc.y){
                this.players.bounce(userId,'vertical',-impMagn)
                // console.log('bounceUp')
            }
            else{
                this.players.bounce(userId,'vertical',impMagn)
                // console.log('bounceDown')
            }
        }
        if(xDist < 2){ 
            if(serverW-loc.x<loc.x){
                this.players.bounce(userId,'horizontal',-impMagn)
                // console.log('bounceLeft')
            }
            else{
                this.players.bounce(userId,'horizontal',impMagn)
                // console.log('bounceRight')
            }
        }
    }

    giveImpulse(lobbyId,target,player){
        const impMagn = this.games[lobbyId].impulseMagnitude
        const angle = Math.atan(Math.abs(target.y-player.y)/Math.abs(target.x-player.x))
        let dy
        let dx

        //push down
        if(target.y>player.y){
            dy = Math.sin(angle)*impMagn
        }
        //push up
        if(target.y<player.y){
            dy = -Math.sin(angle)*impMagn
        }
        //push right
        if(target.x>player.x){
            dx = Math.cos(angle)*impMagn
        }       
        //push left
        if(target.x<player.x){
            dx = -Math.cos(angle)*impMagn
        }

        this.players.bounce(target.userId,'horizontal',dx)
        this.players.bounce(target.userId,'vertical',dy)
    }

    impulseCheck(userId,lobbyId){
        const playerLoc = this.players.getCoordinates(userId)
        const playerInfo = this.getPlayerInfo(lobbyId)
        const impulseRadius = this.games[lobbyId].impulseRadius

        for(var userId1 of Object.keys(playerInfo)){
            if(userId1 == userId){
                continue
            }
            const target = playerInfo[userId1]
            const dist = ( (playerLoc.x-target.x)**2 + (playerLoc.y-target.y)**2 )**1/2
            if(dist < impulseRadius){
                this.giveImpulse(lobbyId,target,playerLoc)
            }
        }
    }

    impulsePlayer(userId){
        const lobbyId = this.users.getLobbyId(userId)

        this.wallBounce(userId,lobbyId)
        this.impulseCheck(userId,lobbyId)
    }

    movePlayer(userId,move){
        const lobbyId = this.users.getLobbyId(userId)
        const speed = this.games[lobbyId].speed
        const serverH = this.games[lobbyId].serverH
        const serverW = this.games[lobbyId].serverW
        this.players.processMove(userId,speed,move,serverW,serverH)

        const contacts = this.userContacts(userId,lobbyId)
        for(var targetId of contacts){
            this.checkCollision(userId,targetId,lobbyId)
        }
    }

    userContacts(userId,lobbyId){
        var userIds = this.games[lobbyId].userIds.slice()
        var index = userIds.indexOf(userId)
        userIds.splice(index,1)
        return(userIds) 
    }

    checkCollision(userId,targetId,lobbyId){
        const player = this.players.getInfo(userId)
        const target = this.players.getInfo(targetId)
        const dist = ( (player.x-target.x)**2 + (player.y-target.y)**2 )**(1/2)
        if(dist < target.radius+player.radius){
            this.playerContact(lobbyId,player,target)
        }        
    }

    sendGame(userIds,playerInfo){
        for(var userId of userIds){
            const socket = this.users.getSocket(userId)
            socket.emit('gameUpdate',playerInfo)
        }
    }

    runGame1(){
        for(var lobbyId of Object.keys(this.games)){
            const playerInfo = this.getPlayerInfo(lobbyId)
            const userIds = this.games[lobbyId].userIds
            this.sendGame(userIds,playerInfo)
            this.bounceControl(userIds)
        }
    }

    getPlayerInfo(lobbyId){
        const userIds = this.games[lobbyId].userIds
        const playerInfo = {}
        for(var userId of userIds){
            playerInfo[userId] = this.players.getInfo(userId)
        }
        return(playerInfo)
    }

    addPlayers(lobbyId,userIds){
        const angleInt = 2*Math.PI/Object.keys(userIds).length
        const spawnRadius = this.games[lobbyId].spawnRadius
        const serverW = this.games[lobbyId].serverW
        const serverH = this.games[lobbyId].serverH
        var angle = 0
        
        for(var userId of userIds){
            var x = Math.cos(angle)*spawnRadius+serverW/2
            var y = Math.sin(angle)*spawnRadius+serverH/2
            this.players.addPlayer(userId,x,y)
            angle += angleInt
        }
    }

    TESTaddPlayers(userIds){
        const angleInt = 2*Math.PI/Object.keys(userIds).length
        const spawnRadius = 4
        const serverW = 16
        const serverH = 9
        var angle = 0
        
        for(var _ of userIds){
            var x = Math.cos(angle)*spawnRadius+serverW/2
            var y = Math.sin(angle)*spawnRadius+serverH/2
            // console.log(angle,x,y)
            angle += angleInt
        }
    }

    makeContacts(userIds){
        const len = userIds.length
        var contacts = []
        if(len==1){
            return
        }
        for(var i=0; i<len-1; i++){
            for(var p = i+1;p<len;p++){
                var contact = [userIds[i],userIds[p]]
                contacts.push(contact)
            }
        }
        return(contacts)
    }

    newGame(lobbyId,userIds){
        const contacts = this.makeContacts(userIds)
        this.games[lobbyId] = new Game(userIds,contacts)
        this.addPlayers(lobbyId,userIds)
    }
}

