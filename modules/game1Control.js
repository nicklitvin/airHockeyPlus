'use strict'
import PlayerManager from './game1Player.js'
import Ball from './game1Ball.js'
import PhysicsManager from './game1Physics.js'
import Goals from './game1Goal.js'

class Game{
    constructor(userIds,contacts,teams,lobbyId){
        this.lobbyId = lobbyId
        this.userIds = userIds
        this.contacts = contacts
        this.serverH = 9
        this.serverW = 16
        this.speed = 0.1
        this.impulseMagnitude = .4
        this.impulseRadius = 1.5
        this.spawnRadius = 4
        this.bounceStrength = 0.1
        this.goalHeight = 1.5
        this.goalWidth = 0.2
        this.inGame = 1

        this.ball = 0
        this.goals = 0
        this.teams = teams
    }
}

export default class Game1Control{
    constructor(io,users,lobbies){
        this.users = users
        this.lobbies = lobbies
        this.players = new PlayerManager(this.users,users)
        this.physics = new PhysicsManager()
        this.serverH = 9
        this.serverW = 16
        this.games = {}

        io.on('connection', (socket)=>{
            socket.on('game1Move', (userId,move)=>{
                this.movePlayer(userId,move)
            })
            socket.on('game1Impulse', (userId)=>{
                this.impulsePlayer(userId)
            })
            socket.on('endGame', (userId)=>{
                this.endGame(userId)
            })
        })
    }

    // ENDSCREEN

    makeWinnerTeamText(lobby){
        var text = ''
        const goals = lobby.goals.getGoals()
        const orangeGoals = goals['orange'].goalsScored
        const blueGoals = goals['blue'].goalsScored

        if(blueGoals > orangeGoals){
            text = 'blue team has won (' + blueGoals + '-' + orangeGoals +')'
        }
        else if(orangeGoals > blueGoals){
            text = 'orange team has won (' + orangeGoals + '-' + blueGoals +')'
        }
        else{
            text = 'both teams tied (' + orangeGoals + '-' + blueGoals +')'
        }

        return(text)
    }

    makeEndInfo(lobby){
        const info = {}
        info['summary'] = this.makeWinnerTeamText(lobby)
        return(info)
    }

    endGame(userId){
        const lobbyId = this.users.getInfo(userId).lobbyId
        const gameLobby = this.games[lobbyId]
        const roomLobby = this.lobbies.getInfo(lobbyId)        
        gameLobby.inGame = 0
        roomLobby.inGame = 0
        
        const endInfo = this.makeEndInfo(gameLobby)
        for(var userId of gameLobby.userIds){
            const socket = this.users.getInfo(userId).socket
            socket.emit('gameEnd',endInfo)  
        }
    }

    // IMPULSE

    wallBounce(user,lobby){
        const impMagn = lobby.impulseMagnitude
        
        //closest to which wall
        const yDist = Math.min(this.serverH-user.y,user.y)
        const xDist = Math.min(this.serverW-user.x,user.x)

        if(yDist < 2){ 
            if(this.serverH-user.y<user.y){
                this.physics.addDy(user,-impMagn)
            }
            else{
                this.physics.addDy(user,impMagn)
            }
        }
        if(xDist < 2){ 
            if(this.serverW-user.x<user.x){
                this.physics.addDx(user,-impMagn)
            }
            else{
                this.physics.addDx(user,impMagn)
            }
        }
    }

    withinImpRange(obj0,obj1,impRadius){
        const dist = ( (obj0.x-obj1.x)**2 + (obj0.y-obj1.y)**2 )**1/2
        if(dist<impRadius){
            return(1)
        }
    }

    giveTargetImpulse(player,target,lobby){
        const impMagn = lobby.impulseMagnitude
        const angle = Math.atan(Math.abs(target.y-player.y)/Math.abs(target.x-player.x))
        var dy = 0
        var dx = 0

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
        this.physics.addDx(target,dx)
        this.physics.addDy(target,dy) 
    }

    pvpImpulseCheck(user,lobby,impRadius){
        const targetIds = lobby.userIds

        for(var targetId of targetIds){
            if(targetId == user.userId){
                continue
            }
            const target = this.players.getInfo(targetId)
            if(this.withinImpRange(user,target,impRadius)){
                this.giveTargetImpulse(user,target,lobby)
            }
        }
    }

    ballImpulseCheck(user,lobby,impRadius){
        const ball = lobby.ball
        if(this.withinImpRange(user,ball,impRadius)){
            this.giveTargetImpulse(user,ball,lobby)
        }
    }

    impulsePlayer(userId){
        const user = this.players.getInfo(userId)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const lobby = this.games[lobbyId]
        const impRadius = lobby.impulseRadius

        this.wallBounce(user,lobby)
        this.pvpImpulseCheck(user,lobby,impRadius)
        this.ballImpulseCheck(user,lobby,impRadius)
    }

    // PLAYER MOVEMENT
    
    movePlayer(userId,move){
        const userInfo = this.players.getInfo(userId)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const lobby = this.games[lobbyId]
        const moveInfo = this.players.processMove(move,lobby.speed)

        this.resolveMove(userInfo,moveInfo)
        this.collisionControl(lobby)
    }

    resolveMove(obj,move){
        this.physics.moveLeft(obj,move['left'])
        this.physics.moveRight(obj,move['right'])
        this.physics.moveUp(obj,move['up'])
        this.physics.moveDown(obj,move['down'])
    }

    // COLLISION CHECK

    pvpCollision(p1,p2,lobby){
        const strength = lobby.bounceStrength
        const angle = Math.atan(Math.abs(p1.y-p2.y)/Math.abs(p1.x-p2.x))
        const dx = Math.cos(angle)*strength
        const dy = Math.sin(angle)*strength

        // push down
        if (p1.y<p2.y){
            this.physics.addDy(p1,-dy)
            this.physics.addDy(p2,dy)
        }
        // push up
        else if (p1.y>p2.y){
            this.physics.addDy(p1,dy)
            this.physics.addDy(p2,-dy)
        }
        // push right
        if (p1.x<p2.x){
            this.physics.addDx(p1,-dx)
            this.physics.addDx(p2,dx)
        }
        // push left
        else if (p1.x>p2.x){
            this.physics.addDx(p1,dx)
            this.physics.addDx(p2,-dx)
        }             
    }

    checkCollision(obj0,obj1){
        const dist = ( (obj0.x-obj1.x)**2 + (obj0.y-obj1.y)**2 )**(1/2)
        if(dist < obj0.radius+obj1.radius){
            return(1)
        }        
    }

    pvpCollisionCheck(lobby){
        if(!lobby.contacts){
            return  
        }
        for(var contact of lobby.contacts){
            const p1 = this.players.getInfo(contact[0])
            const p2 = this.players.getInfo(contact[1])
            if(this.checkCollision(p1,p2)){
                this.pvpCollision(p1,p2,lobby)
            }
        }
    }

    ballCollision(player,ball,lobby){
        const strength = lobby.bounceStrength
        const angle = Math.atan(Math.abs(player.y-ball.y)/Math.abs(player.x-ball.x))
        const dx = Math.cos(angle)*strength
        const dy = Math.sin(angle)*strength

        // push down
        if (player.y<ball.y){
            this.physics.addDy(ball,dy)
        }
        // push up
        else if (player.y>ball.y){
            this.physics.addDy(ball,-dy)
        }
        // push right
        if (player.x<ball.x){
            this.physics.addDx(ball,dx)
        }
        // push left
        else if (player.x>ball.x){
            this.physics.addDx(ball,-dx)
        }

        const goal = lobby.goals.getGoals()[player.team]
        goal.lastBallToucher = player.userId
    }  

    ballCollisionCheck(lobby){
        const ball = lobby.ball
        for(var userId of lobby.userIds){
            const player = this.players.getInfo(userId)
            if(this.checkCollision(player,ball)){
                this.ballCollision(player,ball,lobby)
            }
        }
    }

    collisionControl(lobby){
        this.pvpCollisionCheck(lobby)
        this.ballCollisionCheck(lobby)
    }

    // BOUNCE CONTROL

    bouncePlayers(lobby){
        for(var userId of lobby.userIds){
            const userInfo = this.players.getInfo(userId)
            this.physics.resolveBounce(userInfo)
        }
    }

    countGoal(lobby,scoringTeam){
        const goal = lobby.goals.getGoals()[scoringTeam]
        goal.goalsScored += 1
        const scorer = this.players.getInfo(goal.lastBallToucher)
        if(scorer){
            scorer.goals += 1
        }
        this.resetPositions(lobby)
    }

    isGoal(lobby){
        const ball = lobby.ball
        const goals = lobby.goals.getGoals()
        if( (ball.x==ball.radius) && (ball.y > goals['orange'].y) &&
                 (ball.y < goals['orange'].y+goals['orange'].height)){
            this.countGoal(lobby,'blue')
        }
        if( (ball.x==this.serverW-ball.radius) && (ball.y>goals['blue'].y) && 
                (ball.y<goals['blue'].y+goals['blue'].height)){
            this.countGoal(lobby,'orange')
        }
    }

    bounceBall(lobby){
        this.physics.resolveBounce(lobby.ball)
        this.isGoal(lobby)
    }

    bounceControl(lobby){
        this.bouncePlayers(lobby)
        this.bounceBall(lobby)
    }

    // GAME EVENTS
    
    resetPositions(lobby){
        var angle = 0
        const angleInt = 2*Math.PI/Object.keys(lobby.userIds).length
        const spawnRadius = lobby.spawnRadius

        for(var userId of lobby.userIds){
            const position = this.makePosition(spawnRadius,angle)
            const player = this.players.getInfo(userId)

            player.x = position.x 
            player.y = position.y
            player.dx = 0
            player.dy = 0

            angle += angleInt
        }
        lobby.ball.x = this.serverW/2
        lobby.ball.y = this.serverH/2
        lobby.ball.dx = 0
        lobby.ball.dy = 0
    }

    // RUN AND SEND GAME

    getAllPlayerInfo(lobby){
        const playerInfo = {}
        for(var userId of lobby.userIds){
            playerInfo[userId] = this.players.getInfo(userId)
        }
        return(playerInfo)
    }

    getAllInfo(lobby){
        const playerInfo = this.getAllPlayerInfo(lobby)
        const ballInfo = lobby.ball
        const goalInfo = lobby.goals.getGoals()
        return({'players':playerInfo,'ball':ballInfo,'goal':goalInfo})
    }

    sendGame(lobby,allInfo){
        for(var userId of lobby.userIds){
            const socket = this.users.getInfo(userId).socket
            socket.emit('game1Update',allInfo)
        }
    }

    runGame1(){
        for(var lobbyId of Object.keys(this.games)){
            const lobby = this.games[lobbyId]
            if(!lobby.inGame){
                continue
            }

            this.bounceControl(lobby)
            this.collisionControl(lobby)
            
            const allInfo = this.getAllInfo(lobby)
            this.sendGame(lobby,allInfo)
        }
    }

    // SETUP GAME

    makePosition(spawnRadius,angle){
        var position = {}
        position['x'] = Math.cos(angle)*spawnRadius+this.serverW/2
        position['y'] = Math.sin(angle)*spawnRadius+this.serverH/2
        return(position)
    }

    addPlayers(lobby){
        const angleInt = 2*Math.PI/lobby.userIds.length
        const spawnRadius = lobby.spawnRadius
        var angle = 0
        
        for(var userId of lobby.userIds){
            const position = this.makePosition(spawnRadius,angle)
            const user = this.users.getInfo(userId)
            this.players.addPlayer(
                userId,position.x,position.y,this.serverH,this.serverW,
                user.team, user.userName
            )
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

    addBall(lobby){
        const x = this.serverW/2
        const y = this.serverH/2
        lobby.ball = new Ball(x,y,this.serverH,this.serverW)
    }

    addGoals(lobby){
        if(lobby.teams.length != 2){
            console.log('goalErr')    
            return
        }
        lobby.goals = new Goals()

        const topEdge = this.serverH/2-lobby.goalHeight/2
        lobby.goals.addGoal(0, topEdge, lobby.goalWidth,lobby.goalHeight,
            lobby.teams[0],0)
        lobby.goals.addGoal(this.serverW-lobby.goalWidth, topEdge,
            lobby.goalWidth,lobby.goalHeight, lobby.teams[1], lobby.goalWidth)
    }

    newGame(roomLobby){
        const userIds = roomLobby.userIds
        const lobbyId = roomLobby.lobbyId
        const teams = roomLobby.teams
        const contacts = this.makeContacts(userIds)

        this.games[lobbyId] = new Game(userIds,contacts,teams,lobbyId)
        const gameLobby = this.games[lobbyId]

        this.addGoals(gameLobby)
        this.addPlayers(gameLobby)
        this.addBall(gameLobby)
    }
}

