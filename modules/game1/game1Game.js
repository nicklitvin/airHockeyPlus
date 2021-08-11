'use strict'

import PlayerManager from './game1PlayerManager.js'
import PhysicsManager from './game1Physics.js'
import Ball from './game1Ball.js'
import GoalManager from './game1GoalManager.js'
import { strictEqual } from 'assert'

const MINUTES_TO_SECONDS = 60
const ROUNDING_ERROR = 0.001
const MILISECONDS_TO_SECONDS = 1/1000
const MILLISECONDS_IN_SECOND = 1000
const MAX_COLLISION_REPEATS = 100

export default class Game{
    constructor(users,lobbies,userIds,settings){
        this.users = users
        this.lobbies = lobbies

        this.serverH = 9
        this.serverW = 16
        
        this.players = new PlayerManager()
        this.physics = new PhysicsManager(this.serverW,this.serverH,this.players)

        this.userIds = userIds
        this.contacts = this.makeContacts()
        this.teams = settings.teams

        this.playerRadius = null

        // in seconds
        this.gameTime = 0
        this.gameTimer = settings.time*MINUTES_TO_SECONDS 
        this.countdown = 1
        
        // in miliseconds
        this.lastTime = Date.now()
        this.timeDiff = 0

        this.inGame = 1
        this.ball = null
        this.goals = null
        
        this.scorerListLength = 5
        this.scorerTextDelimeter = '!'

        this.spawnRadius = 4
        this.maxPlayerRadius = 0.6
        this.maxPlayerRadiusDecay = 0.99

        this.gameCountdown = 1
        this.impulseCooldown = 1
        this.refreshRate = 100

        this.timePassed = 0 
        this.collisionProcedureRepeats = 0

        // this.makeTeams(settings)
        this.makePlayerRadius()
        this.addGoals()
        this.addPlayers()
        this.addBall()
        // this.runGame()
    }

    makeTeams(settings){
        for(var team of settings.personalSettings.teamChoices){
            if(team){
                this.teams.push(team)
            }
        }
    }

    // runGame(){
    //     this.updateGameTime()
        
    //     if(this.gameTime >= this.gameTimer){
    //         this.endGameExperiment()
    //         return
    //     }

    //     this.updateGame()
    //     // setTimeout(this.runGame(), MILLISECONDS_IN_SECOND)
    // }

    endGameExperiment(){
        const endInfo = this.makeEndInfo()
        const userIds = [...this.userIds]

        for(var userId of userIds){
            const user = this.users.getInfo(userId)
            const socket = user.socket

            if(socket && user.inGame == 1){
                user.unready()
                socket.emit('endStuff',endInfo)  
            }
            else{
                this.deleteUserExistence(user)
            }
        }
    }

    deleteUserExistence(user){
        const lobby = this.lobbies.getInfo(user.lobbyId)
        lobby.deleteRoomUser()
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

    getAllBallIds(){
        var objects = this.userIds.slice()
        if(this.ball){
            objects.push('ball')
        }
        return(objects)
    }

    //TEXT

    makeEndInfo(){
        const info = {}
        info.summary = this.makeWinnerTeamText()
        info.scorers = this.makeScorerText()
        return(info)
    }

    makeWinnerTeamText(){
        const teamScores = this.goals.getTeamScoresOrdered(this.teams)

        if(teamScores[0].score == teamScores[1].score){
            return(`both teams tied (${teamScores[0].score} - ${teamScores[1].score})`)
        }
        else{
            return(`${teamScores[0].team} team has won (${teamScores[0].score} - ${teamScores[1].score})`)
        }
    }

    getScorerText(scorers){
        var text = ['/','black','top scorers:',this.scorerTextDelimeter]

        for(var count = 0;
            count < Math.min(scorers.length,this.scorerListLength);
            count++)
        {
            const scorer = scorers[count]
            text.push('/', scorer.team, scorer.userName, ': ',
                scorer.goals, this.scorerTextDelimeter)
        }

        if(scorers.length == 0){
            text.push('/','black','absolutely nobody',this.scorerTextDelimeter)
        }
        else if(scorers.length > 6){
            text.push('/', 'black', '...', this.scorerTextDelimeter)
        }
        return(text)
    }

    makeScorerText(){
        const scorers = this.players.getScorersOrdered()
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

    addBall(){
        const x = this.serverW/2
        const y = this.serverH/2
        this.ball = new Ball(x,y)
        this.ball.setStartPosition(x,y)
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
            if(user.personalGameSettings.teamChoices.chosen == 'orange'){
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

    addPlayers(){
        for(var userId of this.userIds){
            const user = this.users.getInfo(userId)
            this.players.addPlayer(
                userId,
                user.personalGameSettings,
                user.userName,
                this.playerRadius,
            )
        }
        this.setPlayerSpawnPositions()
    }

    setPlayerSpawnPositions(){
        const angleInfo = this.getTeamAngleInfo()

        for(var playerId of this.userIds){
            const player = this.players.getInfo(playerId)
            this.setPlayerStartPosition(player,angleInfo)
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

    setPlayerStartPosition(player,angleInfo){
        let position
        if(player.team == 'blue'){
            position = this.makePosition(angleInfo.blueAngle)
            angleInfo.blueAngle += angleInfo.blueAngleInterval
        }
        else if(player.team == 'orange'){
            position = this.makePosition(angleInfo.orangeAngle)
            angleInfo.orangeAngle += angleInfo.orangeAngleInterval
        }

        player.setStartPosition(position.x,position.y)
    }

    addGoals(){
        this.goals = new GoalManager()
        const goals = this.goals

        goals.addGoal('left', 'orange')
        goals.addGoal('right', 'blue')
    }

    // GAME EVENTS

    endGame(){
        this.inGame = 0
    }

    getAllSendingInfo(){
        const playerInfo = this.players.getAllPlayerSendingInfo()
        const ballInfo = this.ball.getSendingInfo()
        const goalInfo = this.goals.getGoalSendingInfo()

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
        player.commands.recordMoveCommands(move)
    }

    recordPlayerMouseMove(userId,mouse){
        const player = this.players.getInfo(userId)
        player.commands.recordMouseCommands(mouse)
    }

    // UPDATE GAME

    updateGameTime(){
        const now = Date.now()
        const timeDiff = now - this.lastTime

        this.timeDiff = timeDiff
        this.countdown -= timeDiff * MILISECONDS_TO_SECONDS

        if(this.countdown < 0){
            this.countdown = 0
            this.gameTime += timeDiff * MILISECONDS_TO_SECONDS
        }

        this.lastTime = Date.now()
    }

    updateGame(){
        this.impulseControl()
        this.limitObjectSpeeds()
        this.calculateBallMotion()
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

    calculateBallMotion(){
        for(var playerId of this.userIds){
            const player = this.players.getInfo(playerId)
            player.makeMotionVector()
        }

        const ball = this.ball
        if(ball){
            ball.makeMotionVector()
        }
    }

    resetAllMoves(){
        for(var playerId of this.userIds){
            const player = this.players.getInfo(playerId)
            player.commands.resetPlayerMoveCommands()
            player.resetMotionAndMove()
        }
        const ball = this.ball
        if(ball){
            ball.resetMotionAndMove()
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
        const goalWithBall = this.goals.isGoal(ball)

        if(goalWithBall){
            this.countGoal(goalWithBall)
        }
    }

    countGoal(goalWithBall){
        var scorerId = null
        if(goalWithBall == 'orange'){
            scorerId = this.goals.getGoals().blue.lastBallToucher
            this.goals.countGoal('blue')
        }
        else if(goalWithBall == 'blue'){
            scorerId = this.goals.getGoals().orange.lastBallToucher
            this.goals.countGoal('orange')
        }
        if(scorerId){
            const scorer = this.players.getInfo(scorerId)
            scorer.addGoalScored()
        }
       
        this.countdown = this.gameCountdown
        this.resetBallPositions()
        this.goals.resetTouchers()
    }

    resetBallPositions(){
        const ballIds = this.getAllBallIds()
        for(var ballId of ballIds){
            const ball = this.getObjectById(ballId)
            ball.spawnAtStartPosition()
        }
        this.players.restartImpulseCooldowns()
    }

    // COLLISION PROCEDURE

    collisionProcedure(){
        const nextCollision = this.getNextCollision()
        const remainingTime = 1/this.refreshRate - this.timePassed
        
        this.isOverlap()
        this.isBounceReasonable()

        if(!nextCollision || nextCollision.time > remainingTime){
            // console.log('noCollision')
            this.moveGameObjects(remainingTime)
            this.timePassed = 0
            this.collisionProcedureRepeats = 0
            return
        }
        this.collisionProcedureRepeats += 1
        this.timePassed += nextCollision.time
        
        if(this.collisionProcedureRepeats > MAX_COLLISION_REPEATS){
            console.log('collisionRepeatProblem',nextCollision)
            nextCollision.p1.spawnAtStartPosition()
            this.stopEverything()
        }

        if (nextCollision.type == 'wall'){
            // console.log('wallCollision')
            this.wallCollisionProcedure(nextCollision)
        }
        else if(nextCollision.type == 'player'){
            // console.log('playerCollision')
            this.objectCollisionProcedure(nextCollision)
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

    wallCollisionProcedure(nextCollision){
        const time = nextCollision.time
        const object = nextCollision.p1

        this.moveGameObjects(time)
        object.changeTrajectoryFromWallCollision()
        object.resetMotionAndMove()
        object.makeMotionVector()
        this.collisionProcedure()
    }

    objectCollisionProcedure(nextCollision){
        const time = nextCollision.time
        const p1 = nextCollision.p1
        const p2 = nextCollision.p2

        if(!p2.userId && this.goals){
            this.goals.newBallToucher(p1)
        }

        this.moveGameObjects(time)
        this.physics.changeObjectCollisionTrajectory(p1,p2)
        p1.resetMotionAndMove()
        p2.resetMotionAndMove()
        p1.makeMotionVector()
        p2.makeMotionVector()
        this.collisionProcedure()
    }

    isOverlap(){
        for(var contact of this.contacts){
            const p1 = this.getObjectById(contact[0])
            const p2 = this.getObjectById(contact[1])
            const distance = this.physics.getDistanceBetweenTwoPoints(p1.position,p2.position)

            if(distance < p1.radius + p2.radius - ROUNDING_ERROR){
                console.log('overlap')
                p1.spawnAtStartPosition()
                p2.spawnAtStartPosition()
                this.stopEverything()
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
                object.spawnAtStartPosition()
                this.stopEverything()
            }
        }
    }

    stopEverything(){
        // strictEqual(0,1)
    }
}