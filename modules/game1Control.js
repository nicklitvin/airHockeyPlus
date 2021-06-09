'use strict'
import PlayerManager from './game1Player.js'
import Ball from './game1Ball.js'
import PhysicsManager from './game1Physics.js'
import Goals from './game1Goal.js'

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
        this.physics = new PhysicsManager(this.serverW,this.serverH)
        this.games = {}

        this.gameCountdown = 1
        this.impulseCooldown = 1

        // units per second
        this.ballSpeedLimit = 20 //0.3
        this.playerMoveSpeed = 20 // 0.1
        this.playerBounceSpeedLimit = 25 //0.2

        this.impulseMagnitude = 20 //.4
        this.impulseRadius = 1.5
        this.bounceStrength = 10 //0.1

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
            count++){
            
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

    // COLLISION CHECK

    collidePlayers(p1,p2){
        const strength = this.bounceStrength
        
        //1st quadrant angle
        const angle = Math.abs(Math.atan((p1.y-p2.y)/(p1.x-p2.x)))
        const dx = Math.cos(angle)*strength
        const dy = Math.sin(angle)*strength

        p1.dy += Math.sign(p1.y-p2.y)*dy
        p2.dy -= Math.sign(p1.y-p2.y)*dy

        p1.dx += Math.sign(p1.x-p2.x)*dx
        p2.dx -= Math.sign(p1.x-p2.x)*dx
    }

    isCollision(obj0,obj1){
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
            if(this.isCollision(p1,p2)){
                this.collidePlayers(p1,p2)
            }
        }
    }

    //only in corner
    doesBallImpulse(ball){
        const topTouch = (ball.y - ball.radius < ROUNDING_ERROR)
        const botTouch = (ball.y + ball.radius > this.serverH - ROUNDING_ERROR)
        const leftTouch = (ball.x - ball.radius < ROUNDING_ERROR)
        const rightTouch = (ball.x + ball.radius > this.serverW - ROUNDING_ERROR)

        if( (topTouch || botTouch) && (leftTouch || rightTouch) ){
            return(1)
        }
    }

    ballCollisionCheck(lobby){
        const ball = lobby.ball
        for(var userId of lobby.userIds){
            const player = this.players.getInfo(userId)
            if(this.isCollision(player,ball)){

                if(this.doesBallImpulse(ball)){
                    this.giveTargetBounce(ball,player,
                        this.bounceStrength)
                }
                else{
                    this.giveTargetBounce(player,ball,
                        this.bounceStrength)
                }
                const goal = lobby.goals.getGoals()[player.team]
                goal.lastBallToucher = player.userId
            }
        }
    }

    collisionControl(lobby){
        this.pvpCollisionCheck(lobby)
        this.ballCollisionCheck(lobby)
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

        if( (ball.x==ball.radius) && (ball.y > goals['orange'].y) &&
                 (ball.y < goals['orange'].y+goals['orange'].height)){
            this.countGoal(lobby,'blue')
        }
        if( (ball.x==this.serverW-ball.radius) && (ball.y>goals['blue'].y) && 
                (ball.y<goals['blue'].y+goals['blue'].height)){
            this.countGoal(lobby,'orange')
        }
    }

    resetBallPosition(lobby){
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
        this.resetBallPosition(lobby)
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

    // PLAYER MOVE CONTROL

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

    deleteMoveContradictions(player){
        if(player.moveU && player.moveD){
            player.moveU = 0
            player.moveD = 0
        }
        if(player.moveL && player.moveR){
            player.moveL = 0
            player.moveR = 0
        }
    }

    setMoveSpeed(player){
        player.playerSpeed = this.playerMoveSpeed
        if( (player.moveU || player.moveD) && (player.moveL || player.moveR) ){
            player.playerSpeed *= Math.sqrt(2)/2
        }
    }

    makeTotalMove(player){
        const playerSpeed = player.playerSpeed

        if(player.moveU){
            player.yMove -= playerSpeed
        }
        else if(player.moveD){
            player.yMove += playerSpeed
        }
        if(player.moveL){
            player.xMove -= playerSpeed
        }
        else if(player.moveR){
            player.xMove += playerSpeed
        }

        player.xMove += player.dx
        player.yMove += player.dy

        if(Math.abs(player.xMove) < 0.1){
            player.xMove = 0
        }
        if(Math.abs(player.yMove) < 0.1){
            player.yMove = 0
        }
    }

    processPlayerMove(player){
        this.deleteMoveContradictions(player)
        this.setMoveSpeed(player)
        this.makeTotalMove(player)
    }

    isPlayerBounceTooFast(player){
        return((player.dx**2+player.dy**2)**(1/2) > this.playerBounceSpeedLimit)
    }

    limitPlayerBounceSpeed(player){
        const angle = Math.atan(player.dy/player.dx)
        player.dx = Math.sign(player.dx || 1)*Math.cos(angle)*this.playerBounceSpeedLimit 
        player.dy = Math.sign(player.dx || 1)*Math.sin(angle)*this.playerBounceSpeedLimit
    }

    resetPlayerMoveCommands(player){
        player.moveL = 0
        player.moveR = 0
        player.moveU = 0
        player.moveD = 0
    }

    // movePlayers(lobby){
    //     for(var playerId of lobby.userIds){
    //         const player = this.players.getInfo(playerId)
    //         if(this.isPlayerBounceTooFast(player)){
    //             this.limitPlayerBounceSpeed(player)
    //         }
    //         this.processPlayerMove(player)
    //         this.physics.moveObject(player)
    //         this.resetPlayerMoveCommands(player)
    //     }
    // }

    // CONTROL IMPULSE



    isBallTooFast(ball){
        return((ball.dx**2+ball.dy**2)**1/2 > this.ballSpeedLimit)
    }

    limitBallSpeed(ball){
        const angle = Math.tan(ball.dy/ball.dx)
        ball.dx = Math.cos(angle)*this.ballSpeedLimit
        ball.dy = Math.sin(angle)*this.ballSpeedLimit
    }

    moveBall(lobby){
        const ball = lobby.ball
        if(this.isBallTooFast(ball)){
            this.limitBallSpeed(ball)
        }
        else{
            ball.xMove = ball.dx
            ball.yMove = ball.dy
        }
        this.physics.moveObject(ball)
        this.isGoal(lobby)
    }

    // updateGame(lobby){
    //     this.impulseControl(lobby)
    //     this.collisionControl(lobby)
    //     this.movePlayers(lobby)
    //     this.moveBall(lobby)
    // }

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
        const len = userIds.length
        var contacts = []
        if(len==1){
            return
        }
        for(var i=0; i<len-1; i++){
            for(var p = i+1; p<len; p++){
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
        if(lobby.teams.length != 2){
            console.log('goalErr')    
            return
        }
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
        const playerRadius = this.playerRadiusA*this.playerRadiusB**userIds.length

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

    // NEW COLLISION TECH

    updateGame(lobby){
        this.impulseControl(lobby)
        this.limitAllSpeeds(lobby)
        this.calculateXyMoves(lobby)
        this.collisionProcedure(lobby,0)
        this.resetAllMoves(lobby)
        this.applyFriction(lobby)
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
        this.wallImpulseCheck(player)
        this.pvpImpulseCheck(player,lobby)
        this.ballImpulseCheck(player,lobby)
    }

    wallImpulseCheck(player){
        const impulseMagnitude = this.impulseMagnitude

        //closest to which wall
        const yDist = Math.min(this.serverH-player.y,player.y)
        const xDist = Math.min(this.serverW-player.x,player.x)

        if(Math.abs(yDist-player.radius) < ROUNDING_ERROR){
            player.dy += Math.sign(this.serverH-2*player.y)*impulseMagnitude 
        }
        if(Math.abs(xDist-player.radius) < ROUNDING_ERROR){
            player.dx += Math.sign(this.serverW-2*player.x)*impulseMagnitude 
        }
    }

    pvpImpulseCheck(player,lobby){
        const targetIds = lobby.userIds

        for(var targetId of targetIds){
            if(targetId == player.userId){
                continue
            }
            const target = this.players.getInfo(targetId)
            if(this.physics.isWithinImpulseRange(player,target)){
                this.giveTargetBounce(player,target)
            }
        }
    }

    giveTargetBounce(giver,target,ballImpulseMagnitude=0){
        const impulseMagnitude = (ballImpulseMagnitude || this.impulseMagnitude)
    
        //1st quadrant angle
        const angle = Math.abs(Math.atan((target.y-giver.y)/(target.x-giver.x)))
        
        target.dy += Math.sign(target.y-giver.y)*Math.sin(angle)*impulseMagnitude
        target.dx += Math.sign(target.x-giver.x)*Math.cos(angle)*impulseMagnitude
    }

    ballImpulseCheck(player,lobby){
        const ball = lobby.ball

        if(this.physics.isWithinImpulseRange(player,ball)){
            this.giveTargetBounce(player,ball)
        }
    }

    // SPEED LIMIT

    limitAllSpeeds(lobby){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)

            if(this.isPlayerBounceTooFast(player)){
                this.limitPlayerBounceSpeed(player)
            }
        }
    }

    applyFriction(lobby){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            this.physics.resolveFriction(player)
        }
    }

    calculateXyMoves(lobby){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            this.deleteMoveContradictions(player)
            this.setMoveSpeed(player)
            this.makeTotalMove(player)
        }
    }

    resetAllMoves(lobby){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            this.resetPlayerMoveCommands(player)
            this.resetPlayerMoves(player)
        }
    }

    resetPlayerMoves(player){
        player.xMove = 0
        player.yMove = 0
    }

    areArraysSame(obj0,obj1){
        if(obj0.length != obj1.length){
            return(0)
        }

        for(var count in obj0){
            if(obj0[count] != obj1[count]){
                return(0)
            }
        }
        return(1)
    }

    movePlayers(lobby,time){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            this.physics.moveObject(player,time)
        }
    }


    changeTrajectory(p1,p2){
        const normalVector = this.physics.calculateNormalVector(p1,p2)

        // reverse normal for p1
        if(p1.x + 2*normalVector.x == p2.x && p1.y + 2*normalVector.y == p2.y){
            this.physics.applyNormalVector(p1,p2,normalVector)
        }
        //reverse normal for p2
        else{
            this.physics.applyNormalVector(p2,p1,normalVector)
        }
        
        this.testLimitPlayerSpeeds(p1,p2)
        this.resetPlayerMoves(p1)
        this.resetPlayerMoves(p2)
        this.makeTotalMove(p1)
        this.makeTotalMove(p2)   
    }

    // TEST

    moveTestPlayers(time,p1,p2){
        p1.x += p1.xMove*time
        p1.y += p1.yMove*time
        p2.x += p2.xMove*time
        p2.y += p2.yMove*time
    }

    wallBounceTrajectoryChange(p1){
        if( Math.abs(p1.x + p1.radius - this.serverW) < ROUNDING_ERROR ||
            Math.abs(p1.x - p1.radius) < ROUNDING_ERROR)
        {
            p1.dx *= -1
        }
        
        if( Math.abs(p1.y + p1.radius - this.serverH) < ROUNDING_ERROR ||
            Math.abs(p1.y - p1.radius) < ROUNDING_ERROR)
        {
            p1.dy *= -1
        }
        this.testLimitPlayerSpeeds(p1)
        this.resetPlayerMoves(p1)
        this.makeTotalMove(p1)
    }

    testfindNextCollision(p1,p2,previousCollision){
        const playerCollision = this.physics.getNextPlayerCollision(p1,p2,previousCollision)
        const wallCollision = this.physics.getNextWallCollision(p1,p2,previousCollision)
        // console.log(playerCollision,wallCollision)
        if(!playerCollision && !wallCollision){
            return(0)
        }
        if(!playerCollision && wallCollision || wallCollision[0] < playerCollision[0]){
            return(wallCollision)
        }
        else{
            return(playerCollision)
        }
    }

    wallCollisionProcedure(p1,p2,timePassed,nextCollision){
        const time = nextCollision[0]
        const player = nextCollision[1]

        this.moveTestPlayers(time,p1,p2) // move all 
        this.wallBounceTrajectoryChange(player)
        timePassed += time
        this.testCollisionProcedure(p1,p2,timePassed,nextCollision)
    }

    playerCollisionProcedure(p1,p2,timePassed,nextCollision){
        const time = nextCollision[0]

        this.moveTestPlayers(time,p1,p2) // move all 
        this.changeTrajectory(p1,p2)
        timePassed += time
        
        this.testCollisionProcedure(p1,p2,timePassed,nextCollision)
    }

    // collision = [time,player,collisionTarget,collisionType]
    testCollisionProcedure(p1,p2,timePassed=0,previousCollision=[]){
        const nextCollision = this.testfindNextCollision(p1,p2,previousCollision)
        const time = nextCollision[0]
        const remainingTime = 1/this.refreshRate - timePassed
        // console.log(p1.xMove,p1.yMove,p2.xMove,p2.yMove)
        // console.log(nextCollision)

        if(!nextCollision || time > remainingTime){
            console.log('exitLoop')
            this.moveTestPlayers(remainingTime,p1,p2)
        }

        else if (nextCollision[3] == 'wall'){
            console.log('wall')
            this.wallCollisionProcedure(p1,p2,timePassed,nextCollision)
        }
        else if(nextCollision[3] == 'player'){
            console.log('player')
            this.playerCollisionProcedure(p1,p2,timePassed,nextCollision)
        }
    }
    
    makeObjects(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 0.51
        p1.y = 4
        p1.xMove = 200
        p1.dx = 200

        this.players.addPlayer('p2',0,0,0.5)
        const p2 = this.players.getInfo('p2')
        p2.x = 15.5
        p2.y = 8.5
        p2.xMove = 200
        p2.dx = 200
        p2.yMove = 1000
        p2.dy = 1000
    }

    testLimitPlayerSpeeds(p1,p2){
        if(p1 && this.isPlayerBounceTooFast(p1)){
            this.limitPlayerBounceSpeed(p1)
        }
        if(p2 && this.isPlayerBounceTooFast(p2)){
            this.limitPlayerBounceSpeed(p2)
        }
    }

    runTest(){
        this.makeObjects()

        const p1 = this.players.getInfo('p1')
        const p2 = this.players.getInfo('p2')


        // console.log(this.physics.getNextPlayerCollision(p1,p2,[]))
        // console.log(this.physics.getNextWallCollision(p1,p2,[0.12,p1,'left']))
        // console.log(this.physics.getNextWallCollision(p1,p2,[0.0050000000000000044,p1,'left','wall']))
        console.log(p1.xMove,p1.yMove,p2.xMove,p2.yMove)
        this.testCollisionProcedure(p1,p2)
        console.log(p1.xMove,p1.yMove,p2.xMove,p2.yMove)
    }
}


