'use strict'

import PlayerManager from './game1PlayerManager.js'
import PhysicsManager from './game1Physics.js'
import Ball from './game1Ball.js'
import Goals from './game1Goal.js'

const MINUTES_TO_SECONDS = 60
const ROUNDING_ERROR = 0.001
const MILISECONDS_TO_SECONDS = 1/1000

export default class Game{
    constructor(lobby,users){
        this.serverH = 9
        this.serverW = 16
        
        this.users = users
        this.players = new PlayerManager()
        this.physics = new PhysicsManager(this.serverW,this.serverH,this.players)

        this.userIds = lobby.userIds
        this.contacts = this.makeContacts()
        this.teams = lobby.teams
        this.lobbyId = lobby.lobbyId

        this.playerRadius = 0

        // in seconds
        this.gameTime = 0
        this.gameTimer = Number(lobby.gameTimer[0])*
            MINUTES_TO_SECONDS //[0] is X from "Xmin"
        this.countdown = 0
        
        // in miliseconds
        this.lastTime = Date.now()
        this.timeDiff = 0

        this.inGame = 1
        this.ball = null
        this.goals = null
        
        this.scorerListLength = 5
        this.scorerTextDelimeter = '!'

        // this.goalHeight = 3
        // this.goalWidth = 0.2
        
        this.spawnRadius = 4
        this.maxPlayerRadius = 0.6
        this.maxPlayerRadiusDecay = 0.99

        this.gameCountdown = 1
        this.impulseCooldown = 1
        this.refreshRate = 100
    }

    getObjectById(objectId){
        let object
        if(objectId == 'ball'){
            object = this.ball
        }
        else{
            object = this.players.getInfo(objectId)
        }
        return(object)
    }

    //TEXT

    makeEndInfo(){
        const info = {}
        info['summary'] = this.makeWinnerTeamText()
        info['scorers'] = this.makeScorerText()
        return(info)
    }

    makeWinnerTeamText(){
        var text = ''
        const goals = this.goals.getGoals()
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

    getScorersOrdered(){
        var scorers = []
        for(var userId of this.userIds){
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

    makeScorerText(){
        const scorers = this.getScorersOrdered()
        const text = this.getScorerText(scorers)
        return(text)
    }

    // SETUP GAME

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

    makePlayerRadius(){
        const teamCounts = this.countTeamMembers()
        const biggestTeamCount = Math.max(...Object.values(teamCounts))
        const angleInterval = Math.PI/(biggestTeamCount+1)
        var radius = this.maxPlayerRadius*this.maxPlayerRadiusDecay**this.userIds.length

        while(1){
            const p1 = this.makePosition(0)
            const p2 = this.makePosition(angleInterval)
            const distance = this.physics.getDistanceBetweenTwoPoints(p1,p2)
            if( distance > 4*radius + ROUNDING_ERROR){
                break
            }
            radius *= 0.95
        }
        this.playerRadius = radius
    }

    countTeamMembers(){
        var memberCounts = {'orange':0 , 'blue':0}
        for(var userId of this.userIds){
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

    makePosition(angle){
        return{
            'x': Math.cos(angle) * this.spawnRadius + this.serverW/2,
            'y': Math.sin(angle) * this.spawnRadius + this.serverH/2
        }
    }

    addBall(){
        const x = this.serverW/2
        const y = this.serverH/2
        this.ball = new Ball(x,y)
    }

    addPlayers(){
        for(var userId of this.userIds){
            const user = this.users.getInfo(userId)
            this.players.addPlayer(
                userId,
                user.team,
                user.userName,
                this.playerRadius
            )
        }
        this.addPlayerPositions(0)
    }

    addPlayerPositions(reset=0){
        const angleInfo = this.getTeamAngleInfo()

        for(var playerId of this.userIds){
            const player = this.players.getInfo(playerId)
            this.setPlayerPosition(player,angleInfo)

            if(reset){
                player.resetPlayerMoveCommands()
                player.resetPlayerMotion()
            }
        }
    }

    getTeamAngleInfo(){
        const teamCounts = this.countTeamMembers()
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

    addGoals(){
        this.goals = new Goals()
        const goals = this.goals

        goals.addGoal('left', this.teams[0]) //orange
        goals.addGoal('right', this.teams[1]) //blue
    }

    updateGameTime(){
        const now = Date.now()
        const timeDiff = now - this.lastTime

        this.timeDiff = timeDiff
        this.countdown -= timeDiff * MILISECONDS_TO_SECONDS
        this.gameTime += timeDiff * MILISECONDS_TO_SECONDS
        this.lastTime = Date.now()

        if(this.countdown < 0){
            this.countdown = 0
        }
    }

    endGame(){
        this.inGame = 0
    }

    getAllInfo(){
        const playerInfo = this.getAllPlayerInfo()
        const ballInfo = this.getBallInfo()
        const goalInfo = this.getGoalInfo()

        const timer = Math.ceil(this.countdown)
        const timeLeft = Math.ceil(this.gameTimer - this.gameTime)

        return({
            'players':playerInfo,
            'ball':ballInfo,
            'goal':goalInfo,
            'countdown': timer,
            'timeLeft': timeLeft,
            'impulseColor': ''
        })
    }

    getAllPlayerInfo(){
        const playerInfo = {}
        for(var playerId of this.userIds){
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

    getBallInfo(){
        const ball = this.ball
        return({
            'x': ball.x/this.serverW,
            'y': ball.y/this.serverH,
            'radiusY': ball.radius/this.serverH
        })
    }

    getGoalInfo(){
        const allGoalInfo = this.goals.getGoals()
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
    
    sendGame(allInfo){
        for(var userId of this.userIds){
            const user = this.users.getInfo(userId)
            const socket = user.socket
            allInfo['impulseColor'] = this.getImpulseColor(user)

            socket.emit('game1Update',allInfo)
        }
    }

    getImpulseColor(user){
        const player = this.players.getInfo(user.userId)
        if(player.impulseCooldown){
            return('red')
        }
        return('green')
    }

    recordPlayerImpulse(userId){
        const player = this.players.getInfo(userId)

        if(this.countdown || player.impulseCooldown){
            return
        }
        player.activateImpulse(this.impulseCooldown)
    }

    recordPlayerMove(userId,move){
        const player = this.players.getInfo(userId)
        player.recordPlayerMove(move)
    }

    // UPDATE GAME

    updateGame(){
        this.impulseControl()
        this.limitObjectSpeeds()
        this.calculateXyMoves()
        this.collisionProcedure()
        this.resetAllMoves()   
        this.applyFriction()
    }

    impulseControl(){
        const timeDiff = this.timeDiff * MILISECONDS_TO_SECONDS

        for(var playerId of this.userIds){
            const player = this.players.getInfo(playerId)

            if(player.newImpulse){
                this.impulsePlayer(player)
                player.deactivateImpulse()
            }

            player.decreaseImpulseCooldown(timeDiff)
        }
    }

    impulsePlayer(player){
        this.physics.impulseOffWall(player)
        this.giveBallsBounceFromImpulse(player)
    }

    giveBallsBounceFromImpulse(player){
        const ballIds = this.getAllBallIds()

        for(var targetId of ballIds){
            if(targetId == player.userId){
                continue
            }
            const target = this.getObjectById(targetId)

            if(this.physics.isWithinImpulseRange(player,target)){
                this.physics.giveTargetBounce(player,target)
            }
        }
    }

    limitObjectSpeeds(){
        const ballIds = this.getAllBallIds()
        
        for(var ballId of ballIds){
            const ball = this.getObjectById(ballId)
            if(ball.isBounceTooFast()){
                ball.limitBounceSpeed()
            }
        }
    }

    calculateXyMoves(){
        for(var playerId of this.userIds){
            const player = this.players.getInfo(playerId)
            player.deleteMoveContradictions()
            player.setMoveSpeed()
            player.makeXyMove()
        }

        const ball = this.ball
        if(ball){
            ball.makeXyMove()
        }
    }

    resetAllMoves(){
        for(var playerId of this.userIds){
            const player = this.players.getInfo(playerId)
            player.resetPlayerMoveCommands()
            player.resetXyMoves()
        }
        const ball = this.ball
        if(ball){
            ball.resetXyMoves()
        }
    }

    applyFriction(){
        const ballIds = this.getAllBallIds()
        
        for(var ballId of ballIds){
            const ball = this.getObjectById(ballId)
            ball.resolveFriction()
        }
    }

    isGoal(){
        const ball = this.ball
        const goals = this.goals.getGoals()

        // ball hits wall between top and bottom edge of goal
        if( (ball.x == ball.radius) &&
            (ball.y > goals['orange'].y) &&
            (ball.y < goals['orange'].y + goals['orange'].height) )
        {
            this.countGoal('blue')
        }
        if( (ball.x == this.serverW-ball.radius) &&
            (ball.y > goals['blue'].y) && 
            (ball.y < goals['blue'].y+goals['blue'].height) )
        {
            this.countGoal('orange')
        }
    }

    countGoal(scoringTeam){
        const goal = this.goals.getGoals()[scoringTeam]
        goal.goalsScored += 1
        this.countdown = this.gameCountdown

        const scorer = this.players.getInfo(goal.lastBallToucher)
        if(scorer){
            scorer.goals += 1
        }
        this.resetPositions()
    }

    resetPositions(){
        const reset = 1
        this.addPlayerPositions(reset)
        this.ball.resetPositionAndMotion()
    }

    // COLLISION PROCEDURE

    collisionProcedure(timePassed=0){
        const nextCollision = this.getNextCollision()
        const remainingTime = 1/this.refreshRate - timePassed
        this.isOverlap()
        this.isBounceReasonable()

        if(!nextCollision || nextCollision.time > remainingTime){
            // console.log('noCollision')
            this.moveGameObjects(remainingTime)
            return
        }

        if (nextCollision.type == 'wall'){
            // console.log('wallCollision')
            this.wallCollisionProcedure(timePassed,nextCollision)
        }
        else if(nextCollision.type == 'player'){
            // console.log('playerCollision')
            this.objectCollisionProcedure(timePassed,nextCollision)
        }
    }

    getNextCollision(){
        const playerCollision = this.getNext2ObjectCollision()
        const wallCollision = this.getGameNextWallCollision()

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

    getNext2ObjectCollision(){
        const contacts = this.contacts
        var nextCollision = null

        for(var count = 0; count < contacts.length; count++){
            const contact = contacts[count]
            const p1 = this.getObjectById(contact[0])
            const p2 = this.getObjectById(contact[1])
            const time = this.physics.getObjectCollisionTime(p1,p2)

            if(time >= 0 && (!nextCollision || time < nextCollision.time) ){
                nextCollision = {
                    'time': time,
                    'p1': p1,
                    'p2': p2,
                    'type': 'player'
                }
            }
        }
        return(nextCollision)
    }

    getGameNextWallCollision(){
        var ballIds = this.getAllBallIds()
        var nextCollision = null

        for(var objectId of ballIds){
            const object = this.getObjectById(objectId)
            const time = this.getPlayerNextWallCollisionTime(object)

            if(time >= 0 && (!nextCollision || time < nextCollision.time) ){
                nextCollision = {
                    'time': time,
                    'p1': object,
                    'type': 'wall'
                } 
            }
        }
        return(nextCollision)
    }

    getPlayerNextWallCollisionTime(p1){
        const upTime = this.physics.whenIsWallCollisionUp(p1)
        const downTime = this.physics.whenIsWallCollisionDown(p1)
        const leftTime = this.physics.whenIsWallCollisionLeft(p1)
        const rightTime = this.physics.whenIsWallCollisionRight(p1)
        
        var legitTimes = []
        for(var time of [upTime,downTime,leftTime,rightTime]){
            time = this.physics.roundSmallNegativeToZero(time)
            if(time >= 0){
                legitTimes.push(time)
            }
        }

        return(Math.min(...legitTimes))
    }

    moveGameObjects(time){
        const ballIds = this.getAllBallIds()
        
        for(var ballId of ballIds){
            const ball = this.getObjectById(ballId)
            ball.move(time)
            this.isGoal()
        }
    }

    wallCollisionProcedure(timePassed,nextCollision){
        const time = nextCollision.time
        const object = nextCollision.p1

        this.moveGameObjects(time)
        object.changeTrajectoryFromWallCollision()
        object.resetXyMoves()
        object.makeXyMove()

        timePassed += time
        this.collisionProcedure(timePassed) 
    }

    objectCollisionProcedure(timePassed,nextCollision){
        const time = nextCollision.time
        const p1 = nextCollision.p1
        const p2 = nextCollision.p2

        if(!p2.userId && this.goals){
            const goal = this.goals.getGoals()[p1.team]
            goal.lastBallToucher = p1.userId
        }

        this.moveGameObjects(time)
        this.physics.changeObjectCollisionTrajectory(p1,p2)
        p1.resetXyMoves()
        p2.resetXyMoves()
        p1.makeXyMove()
        p2.makeXyMove()

        timePassed += time
        this.collisionProcedure(timePassed)
    }

    isOverlap(){
        for(var contact of this.contacts){
            const p1 = this.getObjectById(contact[0])
            const p2 = this.getObjectById(contact[1])
            const distance = this.physics.getDistanceBetweenTwoPoints(p1,p2)

            if(distance < p1.radius + p2.radius - ROUNDING_ERROR){
                p1.dx = 100 //TEMPORARY FIX
                p2.dx = -100
                strictEqual(0,1)
            }
        }   
    }

    isBounceReasonable(){
        var objectIds = this.getAllBallIds()
        
        for(var objectId of objectIds){
            const object = this.getObjectById(objectId)
            const bounceMagnitude = object.getBounceMagnitude()

            if(bounceMagnitude > 500){
                console.log(object,this.ball)
                strictEqual(0,1)
            }
        }
    }
}