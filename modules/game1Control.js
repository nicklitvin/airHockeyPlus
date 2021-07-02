'use strict'
import PlayerManager from './game1Player.js'
import Ball from './game1Ball.js'
import PhysicsManager from './game1Physics.js'
import Goals from './game1Goal.js'
import {strictEqual} from 'assert'

const MILISECONDS_TO_SECONDS = 1/1000
const MINUTES_TO_SECONDS = 60
const ROUNDING_ERROR = 0.001

class Game{
    constructor(userIds,contacts,teams,lobbyId,countdown,playerRadius,
            gameTimer){
        this.lobbyId = lobbyId
        this.userIds = userIds
        this.contacts = contacts
        this.playerRadius = playerRadius
        this.playersToDelete = []

        // in seconds
        this.gameTime = 0
        this.countdown = countdown
        this.gameTimer = gameTimer
        // in miliseconds
        this.lastTime = Date.now()
        this.timeDiff = 0

        this.inGame = 1
        this.ball = 0
        this.goals = 0
        this.teams = teams
    }
}

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
        this.playerRadiusA = 0.6
        this.playerRadiusB = 0.95
        
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
                this.resetPlayerMoveCommands(player)
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
        if(move.left){
            player.moveL = 1
        }
        if(move.right){
            player.moveR = 1
        }
        if(move.up){
            player.moveU = 1
        }
        if(move.down){
            player.moveD = 1
        }
    }

    processPlayerMove(player){
        this.physics.deleteMoveContradictions(player)
        this.physics.setMoveSpeed(player)
        this.physics.makeXyMove(player)
    }

    resetPlayerMoveCommands(player){
        player.moveL = 0
        player.moveR = 0
        player.moveU = 0
        player.moveD = 0
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

    makeContacts(userIds){
        const count = userIds.length
        var contacts = []
        for(var i=0; i<count; i++){
            var ballContact = [userIds[i],'ball']
            contacts.push(ballContact)

            for(var p = i+1; p<count; p++){
                var contact = [userIds[i],userIds[p]]
                contacts.push(contact)
            }
        }
        return(contacts)
    }

    addBall(lobby){
        const x = this.serverW/2
        const y = this.serverH/2
        lobby.ball = new Ball(x,y)
    }

    addPlayers(lobby){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            this.players.addPlayer(userId,user.team,user.userName,
                lobby.playerRadius)
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

    newGame(roomLobby){
        const userIds = roomLobby.userIds
        const lobbyId = roomLobby.lobbyId
        const teams = roomLobby.teams
        const gameTimer = Number(roomLobby.gameTimer[0])*MINUTES_TO_SECONDS
        const contacts = this.makeContacts(userIds)
        const playerRadius = this.playerRadiusA*
            this.playerRadiusB**userIds.length

        this.games[lobbyId] = new Game(
            userIds,
            contacts,
            teams,
            lobbyId,
            this.gameCountdown,
            playerRadius,
            gameTimer
        )
            
        const gameLobby = this.games[lobbyId]
        
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
        player.newImpulse = 1
        player.impulseCooldown = this.impulseCooldown
    }

    impulseControl(lobby){
        const timeDiff = lobby.timeDiff * MILISECONDS_TO_SECONDS

        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)

            if(player.newImpulse){
                this.impulsePlayer(player,lobby)
                player.newImpulse = 0
            }
            
            player.impulseCooldown -= timeDiff
            
            if(player.impulseCooldown < 0){
                player.impulseCooldown = 0
            }
        }
    }

    impulsePlayer(player,lobby){
        this.physics.giveWallImpulse(player)
        this.physics.givePlayersImpulse(player,lobby)
        this.physics.giveBallImpulse(player,lobby)
    }

    // DX/DY LIMIT

    limitObjectSpeeds(lobby){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)

            if(this.physics.isObjectBounceTooFast(player)){
                this.physics.limitObjectBounceSpeed(player)
            }
        }
        const ball = lobby.ball
        if(ball && this.physics.isObjectBounceTooFast(ball)){
            this.physics.limitObjectBounceSpeed(ball)
        }
    }

    applyFriction(lobby){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            this.physics.resolveFriction(player)
        }
        const ball = lobby.ball
        if(ball){
            this.physics.resolveFriction(ball)
        }
    }

    // MOVE

    moveGameObjects(lobby,time){
        const p1 = this.players.getInfo('p1')
        const p2 = this.physics.getObjectById(lobby,'ball')
        // console.log(p1,p2)
        this.movePlayers(lobby,time)
        if(lobby.ball){
            this.moveBall(lobby,time)
        }
    }

    movePlayers(lobby,time){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            this.physics.moveObject(player,time)

            // console.log(playerId,'moving x to',player.x,'and y to', player.y,
            // 'in seconds',time)
        }
    }

    moveBall(lobby,time){
        const ball = lobby.ball
        this.physics.moveObject(ball,time)
        // console.log('ball moving x to',ball.x,'and y to', ball.y,
        // 'in seconds',time)
        if(lobby.goal){
            this.isGoal(lobby)
        }
    }

    // XY MOVE

    calculateXyMoves(lobby){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            this.physics.deleteMoveContradictions(player)
            this.physics.setMoveSpeed(player)
            this.physics.makeXyMove(player)
        }
        const ball = lobby.ball
        if(ball){
            this.physics.makeXyMove(ball)
        }
    }

    resetAllMoves(lobby){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            this.resetPlayerMoveCommands(player)
            this.resetObjectXyMoves(player)
        }
        const ball = lobby.ball
        if(ball){
            this.resetObjectXyMoves(ball)
        }
    }

    resetObjectXyMoves(obj){
        obj.xMove = 0
        obj.yMove = 0
    }

    collisionProcedure(lobby,timePassed=0){
        const nextCollision = this.getNextCollision(lobby)
        const remainingTime = 1/this.refreshRate - timePassed
        this.isOverlap(lobby)

        if(!nextCollision || nextCollision.time > remainingTime){
            // console.log('noCollision')
            this.moveGameObjects(lobby,remainingTime)
            return
        }

        if (nextCollision.type == 'wall'){
            // console.log('wallCollision')
            this.wallCollisionProcedure(lobby,timePassed,nextCollision)
        }
        else if(nextCollision.type == 'player'){
            // console.log('playerCollision')
            this.objectCollisionProcedure(lobby,timePassed,nextCollision)
        }
    }

    getNextCollision(lobby){
        const playerCollision = this.physics.getGameNext2ObjectCollision(lobby)
        const wallCollision = this.physics.getGameNextWallCollision(lobby)

        if(wallCollision &&
            (!playerCollision || wallCollision.time < playerCollision.time) )
        {
            return(wallCollision)
        }

        else if(playerCollision &&
            (!wallCollision || playerCollision.time <= wallCollision.time) )
        {
            return(playerCollision)
        }
    }

    wallCollisionProcedure(lobby,timePassed,nextCollision){
        const time = nextCollision.time
        const object = nextCollision.p1

        this.moveGameObjects(lobby,time)
        this.physics.changeWallCollisionTrajectory(object)
        this.resetObjectXyMoves(object)
        this.physics.makeXyMove(object)

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
        this.resetObjectXyMoves(p1)
        this.resetObjectXyMoves(p2)
        this.physics.makeXyMove(p1)
        this.physics.makeXyMove(p2)

        timePassed += time
        this.collisionProcedure(lobby,timePassed)
    }

    // TESTS

    runTest(){
        this.testPlayerPushesBallRight()
        this.testPlayerPushesBallLeft()
        this.testPlayerPushesBallDownToTheSide()
        this.testPlayerPushesBallUpToTheSide()
        this.testPlayerPushesBallDown()
        this.testPlayerPushesBallDiagonally()
    }

    isOverlap(lobby){
        for(var contact of lobby.contacts){
            const p1 = this.physics.getObjectById(lobby,contact[0])
            const p2 = this.physics.getObjectById(lobby,contact[1])
            const distance = ((p1.x-p2.x)**2 + (p1.y-p2.y)**2)**(1/2)

            if(distance < p1.radius + p2.radius - ROUNDING_ERROR){
                console.log(distance,p1,p2)
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
                console.log(object)
                strictEqual(0,1)
            }
        }
    }

    logPlayer(id, p){
        console.log('%s x=%f y=%f dx=%f dy=%f', id, p.x, p.y, p.dx, p.dy)
    }

    testMakeLobbyWithP1Ball(ball){
        const lobby = {
            userIds: ['p1'],
            contacts: [ ['p1','ball'] ],
            ball: ball
        }
        return(lobby)
    }

    testRunGameWithP1Ball(lobby,moveCommand,moveCommand1){
        const p1 = this.players.getInfo('p1')
        const ball = lobby.ball
        const cycles = 10

        for(var count = 0; count < cycles; count++){
            // console.log('cycle=%i', count)
            this.updateGame(lobby)
            p1[moveCommand] = 1
            p1[moveCommand1] = 1

            // this.isOverlap(lobby)
            this.isBounceReasonable(lobby)
            
            // console.log('== after cycle')
            // this.logPlayer('p1', p1)
            // this.logPlayer('p2', ball)
        }
        this.players.deletePlayer('p1')
    }

    testPlayerPushesBallRight(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 7.450000000000016
        // p1.dx = -12.75
        p1.y = 4.500000000000001 
        p1.moveR = 1

        const ball = new Ball(8.200000000000015,4.5)
        ball.dx = 12.75
        console.log( ((ball.x-p1.x)**2+(ball.y-p1.y)**2)**(1/2))
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveR')
    }

    testPlayerPushesBallLeft(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 1.1
        // p1.dx = -12.75
        p1.y = 4
        p1.moveL = 1

        const ball = new Ball(0.3,4)
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveL')
    }

    testPlayerPushesBallDown(){
        console.log('testPlayerPushesBallDown')
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 4
        p1.dx = 0
        p1.y = 4
        p1.moveD = 1

        const ball = new Ball(p1.x,p1.y+.8)
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveD')
    }

    testPlayerPushesBallDownToTheSide(){
        console.log('testPlayerPushesBallDownToSide')
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 15.411066224684294
        p1.y = 3.1821407971619977
        p1.dx = -0.38
        p1.moveD = 1

        const ball = new Ball(15.430037101626137,4.001921320124124)
        ball.dx = 0.32
        ball.dy = 14.98
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveD')
    }

    testPlayerPushesBallUpToTheSide(){
        console.log('testPlayerPushesBallUpToSide')
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 3
        p1.y = 6
        p1.moveU = 1

        const ball = new Ball(p1.x - .36,p1.y - .66)
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveU')
    }

    testPlayerPushesBallDiagonally(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 13.38426696672149
        p1.y = 2.820446733112996
        // p1.dx = 15
        // p1.dy = 15
        p1.moveL = 1
        p1.moveU = 1

        const ball = new Ball(12.89285420882964,2.164006711952552)
        ball.dx = -9.26
        ball.dy = -11.61
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveL')
    }
}
