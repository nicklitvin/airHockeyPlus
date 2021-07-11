'use strict'
import PlayerManager from './game1PlayerManager.js'
import Ball from './game1Ball.js'
import Game from './game1Game.js'
import PhysicsManager from './game1Physics.js'
import Goals from './game1Goal.js'
import {strictEqual} from 'assert'

const MILISECONDS_TO_SECONDS = 1/1000
const ROUNDING_ERROR = 0.001

export default class Game1Control{
    constructor(io,users,lobbies,refreshRate){
        this.serverH = 9
        this.serverW = 16

        this.users = users
        this.lobbies = lobbies
        this.players = new PlayerManager(this.users,users)
        this.physics = new PhysicsManager(this.serverW,this.serverH,this.players)
        this.games = {}

        this.gameCountdown = 1
        this.impulseCooldown = 1

        // units per second
        this.goalHeight = 3
        this.goalWidth = 0.2
        
        this.spawnRadius = 4
        this.maxPlayerRadius = 0.6
        this.maxPlayerRadiusDecay = 0.99
        
        this.scorerListLength = 5
        this.scorerTextDelimeter = '!'
        this.refreshRate = refreshRate
        

        io.on('connection', (socket)=>{
            socket.on('game1Move', (userId,move)=>{
                this.recordPlayerMove(userId,move)
            })
            socket.on('game1Impulse', (userId)=>{
                this.recordPlayerImpulse(userId)
            })
            socket.on('endGame', (userId)=>{
                this.endGame(userId)
            })
        })
    }

    // MISC

    logEverything(){
        console.log(
            Object.keys(this.games).length,
            Object.keys(this.players.getAllInfo()).length,
            Object.keys(this.users.getAllInfo()).length,
            '--------------------'
        )
    }

    // ENDSCREEN

    deleteGame(roomLobby){
        const gameLobby = this.games[roomLobby.lobbyId]
        for(var playerId of gameLobby.userIds){
            this.players.deletePlayer(playerId)
        }
        for(var playerId of gameLobby.playersToDelete){
            this.players.deletePlayer(playerId)
        }
        delete this.games[roomLobby.lobbyId]
    }

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

    getScorersOrdered(lobby){
        var scorers = []
        for(var userId of lobby.userIds){
            const player = this.players.getInfo(userId)
            if(player.goals){
                scorers.push(player)
            }
        }
        scorers.sort( (a,b) => b.goals - a.goals)
        return(scorers)
    }

    getScorerText(scorers){
        var text = ['/','black','top scorers:','!']

        for(var count = 0;
            count < Math.min(scorers.length,this.scorerListLength);
            count++)
        {
            const scorer = scorers[count]
            text.push('/', scorer.team, scorer.userName, ': ',
                scorer.goals, '!')
        }

        if(scorers.length == 0){
            text.push('/','black','absolutely nobody', '!')
        }
        else if(scorers.length > 6){
            text.push('/', 'black', '...', '!')
        }
        return(text)
    }

    makeScorerText(lobby){
        const scorers = this.getScorersOrdered(lobby)
        const text = this.getScorerText(scorers)
        return(text)
    }

    makeEndInfo(lobby){
        const info = {}
        info['summary'] = this.makeWinnerTeamText(lobby)
        info['scorers'] = this.makeScorerText(lobby)
        return(info)
    }

    deleteUserExistence(lobby,user,gameLobby){
        var userIds = lobby.userIds
        for(var a in userIds){
            if(userIds[a] == user.userId){
                userIds.splice(a,1)
            }
        }
        gameLobby.playersToDelete.push(user.userId)
        this.users.deleteUser(user)
    }

    sendEndStuff(lobby,endInfo,gameLobby){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            const socket = user.socket
            if(socket && user.inGame == 1){
                user.ready = 0
                socket.emit('endStuff',endInfo)  
            }
            else{
                this.deleteUserExistence(lobby,user,gameLobby)
            }
        }
    }

    endGame(userId){
        const lobbyId = this.users.getInfo(userId).lobbyId
        const roomLobby = this.lobbies.getInfo(lobbyId)
        if(userId != roomLobby.owner){
            return
        }
        
        const gameLobby = this.games[lobbyId]        
        const endInfo = this.makeEndInfo(gameLobby)

        gameLobby.inGame = 0
        roomLobby.inGame = 0

        this.sendEndStuff(roomLobby,endInfo,gameLobby)
    }

    // GAME EVENTS

    countGoal(lobby,scoringTeam){
        const goal = lobby.goals.getGoals()[scoringTeam]
        goal.goalsScored += 1
        lobby.countdown = this.gameCountdown

        const scorer = this.players.getInfo(goal.lastBallToucher)
        if(scorer){
            scorer.goals += 1
        }
        this.resetPositions(lobby)
    }

    isGoal(lobby){
        const ball = lobby.ball
        const goals = lobby.goals.getGoals()

        // ball hits wall  between top and bot edge of goal
        if( (ball.x==ball.radius) && (ball.y > goals['orange'].y) &&
                 (ball.y < goals['orange'].y+goals['orange'].height)){
            this.countGoal(lobby,'blue')
        }
        if( (ball.x==this.serverW-ball.radius) && (ball.y>goals['blue'].y) && 
                (ball.y<goals['blue'].y+goals['blue'].height)){
            this.countGoal(lobby,'orange')
        }
    }

    resetBallPositionAndMotion(lobby){
        const ball = lobby.ball
        ball.x = this.serverW/2
        ball.y = this.serverH/2
        ball.dx = 0
        ball.dy = 0
        ball.xMove = 0
        ball.yMove = 0
    }
    
    resetPositions(lobby){
        const reset = 1
        this.addPlayerPositions(lobby,reset)
        this.resetBallPositionAndMotion(lobby)
    }

    getTeamAngleInfo(lobby){
        const teamCounts = this.countTeamMembers(lobby)
        const orangeAngleInterval = Math.PI/(teamCounts['orange']+1)
        const blueAngleInterval = Math.PI/(teamCounts['blue']+1)
        
        return({
            'orangeAngleInterval': orangeAngleInterval,
            'orangeAngle': Math.PI/2 + orangeAngleInterval,
            'blueAngleInterval': blueAngleInterval,
            'blueAngle': -Math.PI/2 + blueAngleInterval,
        })
    }

    setPlayerPosition(player,angleInfo){
        let position
        if(player.team == 'blue'){
            position = this.makePosition(angleInfo.blueAngle)
            angleInfo.blueAngle += angleInfo.blueAngleInterval
        }
        else if(player.team == 'orange'){
            position = this.makePosition(angleInfo.orangeAngle)
            angleInfo.orangeAngle += angleInfo.orangeAngleInterval
        }
        player.x = position.x
        player.y = position.y
    }

    resetPlayerMotion(player){
        player.xMove = 0
        player.yMove = 0
        player.dx = 0
        player.dy = 0
        player.impulseCooldown = 0
    }

    addPlayerPositions(lobby,reset=0){
        const angleInfo = this.getTeamAngleInfo(lobby)

        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            this.setPlayerPosition(player,angleInfo)

            if(reset){
                player.resetPlayerMoveCommands()
                // this.resetPlayerMoveCommands(player)
                this.resetPlayerMotion(player)
            }
        }
    }

    // RUN AND SEND GAME

    runGame1(){
        for(var lobbyId of Object.keys(this.games)){
            const lobby = this.games[lobbyId]
            if(!lobby.inGame){
                continue
            }
            this.updateGameTime(lobby)
            if(!lobby.inGame){
                continue
            }
            if(lobby.countdown == 0){
                this.updateGame(lobby)
            }
            const allInfo = this.getAllInfo(lobby)
            this.sendGame(lobby,allInfo)
        }
    }

    updateGame(lobby){
        this.impulseControl(lobby)
        this.limitObjectSpeeds(lobby)
        this.calculateXyMoves(lobby)
        this.collisionProcedure(lobby)
        this.resetAllMoves(lobby)   
        this.applyFriction(lobby)
    }
    
    getAllPlayerInfo(lobby){
        const playerInfo = {}
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)

            playerInfo[playerId] = {
                'x': player.x/this.serverW,
                'y': player.y/this.serverH,
                'radiusY': player.radius/this.serverH,
                'team': player.team
            }
        }
        return(playerInfo)
    }

    getBallInfo(lobby){
        const ball = lobby.ball
        return({
            'x': ball.x/this.serverW,
            'y': ball.y/this.serverH,
            'radiusY': ball.radius/this.serverH
        })
    }

    getGoalInfo(lobby){
        const allGoalInfo = lobby.goals.getGoals()
        var newGoalInfo = {}
        for(var team of Object.keys(allGoalInfo)){
            const goal = allGoalInfo[team]
            newGoalInfo[team] = {
                'x': goal.x/this.serverW,
                'y': goal.y/this.serverH,
                'width': goal.width/this.serverW,
                'height': goal.height/this.serverH,
                'color': goal.color
            }
        }
        return(newGoalInfo)
    }

    getAllInfo(lobby){
        const playerInfo = this.getAllPlayerInfo(lobby)
        const ballInfo = this.getBallInfo(lobby)
        const goalInfo = this.getGoalInfo(lobby)

        const timer = Math.ceil(lobby.countdown)
        const timeLeft = Math.ceil(lobby.gameTimer-lobby.gameTime)

        return({
            'players':playerInfo,
            'ball':ballInfo,
            'goal':goalInfo,
            'countdown': timer,
            'timeLeft': timeLeft,
            'impulseColor': ''
        })
    }

    getImpulseColor(user){
        const player = this.players.getInfo(user.userId)
        if(player.impulseCooldown){
            return('red')
        }
        return('green')
    }

    sendGame(lobby,allInfo){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            const socket = user.socket
            allInfo['impulseColor'] = this.getImpulseColor(user)

            socket.emit('game1Update',allInfo)
        }
    }

    updateGameTime(lobby){
        const now = Date.now()
        const timeDiff = now - lobby.lastTime

        lobby.timeDiff = timeDiff
        lobby.countdown -= timeDiff * MILISECONDS_TO_SECONDS
        lobby.gameTime += timeDiff * MILISECONDS_TO_SECONDS
        lobby.lastTime = Date.now()

        if(lobby.countdown < 0){
            lobby.countdown = 0
        }
        if(lobby.gameTime >= lobby.gameTimer){
            this.endGame(lobby.userIds[0])
            return
        }
    }

    // PLAYER MOVE INPUT

    recordPlayerMove(userId,move){
        const player = this.players.getInfo(userId)
        player.recordPlayerMove(move)
    }

    // SETUP GAME

    makePosition(angle){
        return{
            'x': Math.cos(angle) * this.spawnRadius + this.serverW/2,
            'y': Math.sin(angle) * this.spawnRadius + this.serverH/2
        }
    }

    countTeamMembers(lobby){
        var memberCounts = {'orange':0 , 'blue':0}
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            if(user.team == 'orange'){
                memberCounts['orange'] += 1
            }
            else{
                memberCounts['blue'] += 1
            }
        }
        return(memberCounts)
    }

    addBall(lobby){
        const x = this.serverW/2
        const y = this.serverH/2
        lobby.ball = new Ball(x,y)
    }

    addPlayers(lobby){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            this.players.addPlayer(
                userId,
                user.team,
                user.userName,
                lobby.playerRadius
            )
        }
        this.addPlayerPositions(lobby,0)
    }

    addGoals(lobby){
        lobby.goals = new Goals()

        const topEdge = this.serverH/2-this.goalHeight/2
        lobby.goals.addGoal(0, topEdge, this.goalWidth,this.goalHeight,
            lobby.teams[0])
        lobby.goals.addGoal(this.serverW-this.goalWidth, topEdge,
            this.goalWidth,this.goalHeight, lobby.teams[1])
    }

    makePlayerRadius(lobby){
        const teamCounts = this.countTeamMembers(lobby)
        const biggestTeamCount = Math.max(...Object.values(teamCounts))
        const angleInterval = Math.PI/(biggestTeamCount+1)
        var radius = this.maxPlayerRadius*this.maxPlayerRadiusDecay**lobby.userIds.length

        while(1){
            const p1 = this.makePosition(0)
            const p2 = this.makePosition(angleInterval)
            const distance = this.physics.getDistanceBetweenTwoPoints(p1,p2)
            if( distance > 4*radius + ROUNDING_ERROR){
                break
            }
            radius *= 0.95
        }
        lobby.playerRadius = radius
    }

    newGame(roomLobby){
        const lobbyId = roomLobby.lobbyId 
        this.games[lobbyId] = new Game(roomLobby)

        const gameLobby = this.games[lobbyId]
        gameLobby.gameCountdown = this.gameCountdown
        
        this.makePlayerRadius(gameLobby)
        this.addGoals(gameLobby)
        this.addPlayers(gameLobby)
        this.addBall(gameLobby)
    }

    // IMPULSE

    recordPlayerImpulse(userId){
        const player = this.players.getInfo(userId)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const lobby = this.games[lobbyId]

        if(lobby.countdown || player.impulseCooldown){
            return
        }
        player.activateImpulse(this.impulseCooldown)
    }

    impulseControl(lobby){
        const timeDiff = lobby.timeDiff * MILISECONDS_TO_SECONDS

        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)

            if(player.newImpulse){
                this.impulsePlayer(player,lobby)
                player.deactivateImpulse()
            }

            player.decreaseImpulseCooldown(timeDiff)
        }
    }

    impulsePlayer(player,lobby){
        this.physics.impulseOffWall(player)
        this.physics.giveBallsBounceFromImpulse(player,lobby)
    }

    limitObjectSpeeds(lobby){
        const ballIds = lobby.getAllBallIds()
        
        for(var ballId of ballIds){
            const ball = this.physics.getObjectById(lobby,ballId)
            if(ball.isBounceTooFast()){
                ball.limitBounceSpeed()
            }
        }
    }

    applyFriction(lobby){
        const ballIds = lobby.getAllBallIds()
        
        for(var ballId of ballIds){
            const ball = this.physics.getObjectById(lobby,ballId)
            ball.resolveFriction()
        }
    }

    moveGameObjects(lobby,time){
        const ballIds = lobby.getAllBallIds()
        
        for(var ballId of ballIds){
            const ball = this.physics.getObjectById(lobby,ballId)
            ball.move(time)
        }
    }

    calculateXyMoves(lobby){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            player.deleteMoveContradictions()
            player.setMoveSpeed()
            player.makeXyMove()
        }

        const ball = lobby.ball
        if(ball){
            ball.makeXyMove()
        }
    }

    resetAllMoves(lobby){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            player.resetPlayerMoveCommands()
            player.resetXyMoves()
        }
        const ball = lobby.ball
        if(ball){
            ball.resetXyMoves()
        }
    }

    collisionProcedure(lobby,timePassed=0){
        const nextCollision = this.getNextCollision(lobby)
        const remainingTime = 1/this.refreshRate - timePassed
        this.isOverlap(lobby)
        this.isBounceReasonable(lobby)

        if(!nextCollision || nextCollision.time > remainingTime){
            console.log('noCollision')
            this.moveGameObjects(lobby,remainingTime)
            return
        }

        if (nextCollision.type == 'wall'){
            console.log('wallCollision')
            this.wallCollisionProcedure(lobby,timePassed,nextCollision)
        }
        else if(nextCollision.type == 'player'){
            console.log('playerCollision')
            this.objectCollisionProcedure(lobby,timePassed,nextCollision)
        }
    }

    getNextCollision(lobby){
        const playerCollision = this.physics.getGameNext2ObjectCollision(lobby)
        const wallCollision = this.physics.getGameNextWallCollision(lobby)

        if(wallCollision &&
            (!playerCollision || wallCollision.time <= playerCollision.time) )
        {
            return(wallCollision)
        }

        else if(playerCollision &&
            (!wallCollision || playerCollision.time < wallCollision.time) )
        {
            return(playerCollision)
        }
    }

    wallCollisionProcedure(lobby,timePassed,nextCollision){
        const time = nextCollision.time
        const object = nextCollision.p1

        this.moveGameObjects(lobby,time)
        object.changeTrajectoryFromWallCollision()
        object.resetXyMoves()
        object.makeXyMove()

        timePassed += time
        this.collisionProcedure(lobby,timePassed) 
    }

    objectCollisionProcedure(lobby,timePassed,nextCollision){
        const time = nextCollision.time
        const p1 = nextCollision.p1
        const p2 = nextCollision.p2

        if(!p2.userId && lobby.goals){
            const goal = lobby.goals.getGoals()[p1.team]
            goal.lastBallToucher = p1.userId
        }

        this.moveGameObjects(lobby,time)
        this.physics.changeObjectCollisionTrajectory(p1,p2)
        p1.resetXyMoves()
        p2.resetXyMoves()
        p1.makeXyMove()
        p2.makeXyMove()

        timePassed += time
        this.collisionProcedure(lobby,timePassed)
    }

    isOverlap(lobby){
        for(var contact of lobby.contacts){
            const p1 = this.physics.getObjectById(lobby,contact[0])
            const p2 = this.physics.getObjectById(lobby,contact[1])
            const distance = this.physics.getDistanceBetweenTwoPoints(p1,p2)

            if(distance < p1.radius + p2.radius - ROUNDING_ERROR){
                p1.dx = 100 //TEMPORARY FIX
                p2.dx = -100
                strictEqual(0,1)
            }
        }   
    }

    isBounceReasonable(lobby){
        var objects = lobby.userIds.slice()
        if(lobby.ball){
            objects.push('ball')
        }
        for(var objectId of objects){
            const object = this.physics.getObjectById(lobby,objectId)
            if( Math.abs(object.dx) > 500 || Math.abs(object.dy) > 500){
                console.log(object,lobby.ball)
                strictEqual(0,1)
            }
        }
    }
}
