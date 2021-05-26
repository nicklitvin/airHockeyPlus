'use strict'
import PlayerManager from './game1Player.js'
import Ball from './game1Ball.js'
import PhysicsManager from './game1Physics.js'
import Goals from './game1Goal.js'

class Game{
    constructor(userIds,contacts,teams,lobbyId,countdown,playerRadius,gameTimer = 0){
        this.lobbyId = lobbyId
        this.userIds = userIds
        this.contacts = contacts
        this.serverH = 9
        this.serverW = 16
        this.playerRadius = playerRadius
        this.speed = 0.1
        this.impulseMagnitude = .4
        this.impulseRadius = 1.5
        this.spawnRadius = 4
        this.bounceStrength = 0.1
        this.goalHeight = 3
        this.goalWidth = 0.2
        this.speedLimit = 0.3
        this.inGame = 1

        this.countdown = countdown
        this.gameTime = 0
        this.gameTimer = gameTimer
        this.impulseCooldown = 1
        this.lastTime = Date.now()

        this.ball = 0
        this.goals = 0
        this.teams = teams

        this.playersToDelete = []
    }
}

export default class Game1Control{
    constructor(io,users,lobbies,refreshRate){
        this.users = users
        this.lobbies = lobbies
        this.players = new PlayerManager(this.users,users)
        this.physics = new PhysicsManager()
        this.serverH = 9
        this.serverW = 16
        this.countdown = 1
        this.playerImpulseTimerSize = 0.4
        this.scorerTextDelimeter = '!'
        this.refreshRate = refreshRate
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

    makeScorerText(lobby){
        var scorers = {}
        var topScores = []
        var text = ['/','black','top scorers:','!']
        for(var userId of lobby.userIds){
            const user = this.players.getInfo(userId)
            if(user.goals){
                topScores.push(user.goals)
                scorers[userId] = [user.goals,user.team]
            }
        }
        topScores.sort((a,b) => b - a)

        for(var count = 0; count < 5; count++){
            var score = topScores[count]
            if(!score){
                break
            }
            for(var userId of Object.keys(scorers)){
                var scorer = scorers[userId]
                if(scorer[0] == score){
                    text.push('/', scorer[1], userId, ': ', scorer[0], '!')
                    delete scorers[userId]
                }
            }
        }
        if(topScores.length == 0){
            text.push('/','black','absolutely nobody', '!')
        }
        else if(topScores.length > 6){
            text.push('/', 'black', '...', '!')
        }

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

    // IMPULSE

    wallBounce(player,lobby){
        const impMagn = lobby.impulseMagnitude
        //closest to which wall
        const yDist = Math.min(this.serverH-player.y,player.y)
        const xDist = Math.min(this.serverW-player.x,player.x)

        if(Math.abs(yDist-player.radius) < 0.001){ 
            if(this.serverH-player.y<player.y){
                this.physics.addDy(player,-impMagn)
            }
            else{
                this.physics.addDy(player,impMagn)
            }
        }
        if(Math.abs(xDist-player.radius) < 0.001){ 
            if(this.serverW-player.x<player.x){
                this.physics.addDx(player,-impMagn)
            }
            else{
                this.physics.addDx(player,impMagn)
            }
        }
    }

    withinImpRange(obj0,obj1,impRadius){
        const dist = ( (obj0.x-obj1.x)**2 + (obj0.y-obj1.y)**2 )**1/2
        if(dist<impRadius){
            return(1)
        }
    }

    giveTargetImpulse(giver,target,lobby, ballImpulseMagn=0){
        const impMagn = (ballImpulseMagn || lobby.impulseMagnitude)
        const angle = Math.atan(Math.abs(target.y-giver.y)/Math.abs(target.x-giver.x))
        var dy = 0
        var dx = 0

        //push down
        if(target.y>giver.y){
            dy = Math.sin(angle)*impMagn
        }
        //push up
        else if(target.y<giver.y){
            dy = -Math.sin(angle)*impMagn
        }
        //push right
        if(target.x>giver.x){
            dx = Math.cos(angle)*impMagn
        }       
        //push left
        else if(target.x<giver.x){
            dx = -Math.cos(angle)*impMagn
        }
        this.physics.addDx(target,dx)
        this.physics.addDy(target,dy)
    }

    pvpImpulseCheck(player,lobby,impRadius){
        const targetIds = lobby.userIds

        for(var targetId of targetIds){
            if(targetId == player.userId){
                continue
            }
            const target = this.players.getInfo(targetId)
            if(this.withinImpRange(player,target,impRadius)){
                this.giveTargetImpulse(player,target,lobby)
            }
        }
    }

    ballImpulseCheck(player,lobby,impRadius){
        const ball = lobby.ball
        if(this.withinImpRange(player,ball,impRadius)){
            this.giveTargetImpulse(player,ball,lobby)
        }
    }

    impulsePlayer(userId){
        const player = this.players.getInfo(userId)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const lobby = this.games[lobbyId]
        const impRadius = lobby.impulseRadius
        
        if(lobby.countdown || player.impulseTimer){
            return
        }
        player.impulseTimer = lobby.impulseCooldown

        this.wallBounce(player,lobby)
        this.pvpImpulseCheck(player,lobby,impRadius)
        this.ballImpulseCheck(player,lobby,impRadius)
    }

    // PLAYER MOVEMENT
    
    movePlayer(userId,move){
        const userInfo = this.players.getInfo(userId)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const lobby = this.games[lobbyId]
        if(lobby.countdown){
            return
        }

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

    //only when cornered
    doesBallImpulse(ball){
        const topTouch = (ball.y - ball.radius == 0)
        const botTouch = (ball.y + ball.radius == this.serverH)
        const leftTouch = (ball.x - ball.radius == 0)
        const rightTouch = (ball.x + ball.radius == this.serverW)

        if( (topTouch || botTouch) && (leftTouch || rightTouch) ){
            return(1)
        }
    }

    ballCollisionCheck(lobby){
        const ball = lobby.ball
        for(var userId of lobby.userIds){
            const player = this.players.getInfo(userId)
            if(this.checkCollision(player,ball)){

                if(this.doesBallImpulse(ball)){
                    this.giveTargetImpulse(ball,player,lobby,
                        lobby.bounceStrength)
                }
                else{
                    this.giveTargetImpulse(player,ball,lobby,
                        lobby.bounceStrength)
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
        lobby.countdown = this.countdown

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

    resetBallPosition(lobby){
        lobby.ball.x = this.serverW/2
        lobby.ball.y = this.serverH/2
        lobby.ball.dx = 0
        lobby.ball.dy = 0
    }
    
    resetPositions(lobby){
        const memberCounts = this.countTeamMembers(lobby)

        this.addOrangePlayers(lobby,memberCounts['orange'],1)
        this.addBluePlayers(lobby,memberCounts['blue'],1)
        this.resetBallPosition(lobby)
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
            'impulseTimer': 0
        })
    }

    sendGame(lobby,allInfo){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            const socket = user.socket
            allInfo['impulseTimer'] = this.players.getInfo(userId).impulseTimer

            socket.emit('game1Update',allInfo)
        }
    }

    impulseTimerControl(lobby){
        for(var userId of lobby.userIds){
            const user = this.players.getInfo(userId)
            if(!user.impulseTimer){
                continue
            }
            user.impulseTimer -= 1/this.refreshRate
            if(user.impulseTimer < 0){
                user.impulseTimer = 0
            }
        }
    }

    updateTimer(lobby){
        const now = Date.now()
        const diff = now - lobby.lastTime
        lobby.countdown -= diff/1000
        lobby.lastTime = Date.now()
        if(lobby.countdown < 0){
            lobby.countdown = 0
        }
    }

    reduceSpeed(obj,magn){
        const angle = Math.tan(obj.dy/obj.dx)
        obj.dx = Math.cos(angle)*magn
        obj.dy = Math.sin(angle)*magn
    }

    speedControl(lobby){
        for(var playerId of lobby.userIds){
            const player = this.players.getInfo(playerId)
            const speed = (player.dx**2 + player.dy**2)**1/2
            if(speed > this.speedLimit){
                this.reduceSpeed(player,magn)
            }
        }
        const ball = lobby.ball
        const speed = (ball.dx**2 + ball.dy**2)**1/2
        if(speed > this.speedLimit){
            this.reduceSpeed(player)
        }
    }

    updateGame(lobby){
        const now = Date.now()
        const diff = now - lobby.lastTime
        lobby.gameTime += diff/1000
        lobby.lastTime = Date.now()

        if(lobby.gameTime >= lobby.gameTimer){
            this.endGame(lobby.userIds[0])
            return
        }
        this.speedControl(lobby)
        this.bounceControl(lobby)
        this.collisionControl(lobby)
        this.impulseTimerControl(lobby)
    }

    runGame1(){
        for(var lobbyId of Object.keys(this.games)){
            const lobby = this.games[lobbyId]
            if(!lobby.inGame){
                continue
            }
            if(lobby.countdown > 0){
                this.updateTimer(lobby)
            }
            else{
                this.updateGame(lobby)
            }
            const allInfo = this.getAllInfo(lobby)
            this.sendGame(lobby,allInfo)
        }
    }

    // SETUP GAME

    makePosition(spawnRadius,angle){
        return{
            'x': Math.cos(angle)*spawnRadius+this.serverW/2,
            'y': Math.sin(angle)*spawnRadius+this.serverH/2
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

    addOrangePlayers(lobby,count,reset=0){
        const angleInt = Math.PI/(count+1)
        const spawnRadius = lobby.spawnRadius
        var angle = Math.PI/2 + angleInt

        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            if(user.team == 'orange'){
                const position = this.makePosition(spawnRadius,angle)
                if(reset){
                    const player = this.players.getInfo(userId)
                    player.impulseTimer = 0
                    player.x = position.x 
                    player.y = position.y
                    player.dx = 0
                    player.dy = 0
                }
                else{
                    this.players.addPlayer(
                        userId,position.x,position.y,this.serverH,this.serverW,
                        user.team, user.userName, lobby.playerRadius
                    )
                }
                angle += angleInt
            }
        }
    }

    addBluePlayers(lobby,count,reset=0){
        const angleInt = Math.PI/(count+1)
        const spawnRadius = lobby.spawnRadius
        var angle = -Math.PI/2 + angleInt

        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            if(user.team == 'blue'){
                const position = this.makePosition(spawnRadius,angle)
                if(reset){
                    const player = this.players.getInfo(userId)
                    player.impulseTimer = 0
                    player.x = position.x 
                    player.y = position.y
                    player.dx = 0
                    player.dy = 0
                }
                else{
                    this.players.addPlayer(
                        userId,position.x,position.y,this.serverH,this.serverW,
                        user.team, user.userName, lobby.playerRadius
                    )
                }
                angle += angleInt
            }
        }
    }

    addPlayers(lobby){
        const teamMemberCounts = this.countTeamMembers(lobby)
        this.addOrangePlayers(lobby,teamMemberCounts['orange'])
        this.addBluePlayers(lobby,teamMemberCounts['blue'])
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
        const gameTimer = Number(roomLobby.gameTimer[0])*60
        const contacts = this.makeContacts(userIds)
        const playerRadius = 0.6*.95**userIds.length

        this.games[lobbyId] = new Game(
            userIds,
            contacts,
            teams,
            lobbyId,
            this.countdown,
            playerRadius,
            gameTimer
        )
            
        const gameLobby = this.games[lobbyId]
        
        this.addGoals(gameLobby)
        this.addPlayers(gameLobby)
        this.addBall(gameLobby)
    }
}

