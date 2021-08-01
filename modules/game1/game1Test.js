'use strict'
import Game1Manager from "./game1GameManager.js"
import Game from './game1Game.js'
import Vector from "../vector.js"
import { strictEqual } from "assert"

const move = {
    'up': false,
    'down': false,
    'left': false,
    'right': false
}

export default class Game1Testing extends Game1Manager{
    constructor(io,users,lobbies,refreshRate){
        super(io,users,lobbies,refreshRate)
    }

    runTests(){
        // this.testRadiusMaking()
        // this.testPlayerSpawn()
        // this.testBallSpawn()
        // this.testSendingInfo()
        // this.testScorerTextMaking()

        // this.testPlayerPushesBallHorizontally()
        // this.testPlayerPushesBallVerticallyOnTheRightSide()
        // this.testPlayerOnTopWallPushesPlayerRightOnUpperSide()
        // this.testPlayerPushesToBug()
        // this.testPlayerPushesPlayerIntoWallBug()
        this.testPlayerScoresGoal()
    }

    // ESSENTIALS

    makeNewGame(){
        const lobby = {
            userIds: [],
            teams: ['orange','blue'],
            gameTimer: '1min',
            lobbyId: 'test'
        }
        const game = new Game(lobby,this.users)
        game.addGoals()
        return(game)
    }

    addUserAndPlayerToGame(game,team){
        const user = game.users.newUser(0,game)
        user.team = team
        game.userIds.push(user.userId)
        const player = this.addPlayerToGame(game,user.userId,team,0.5)
        return(player)
    }

    addPlayerToGame(game,userId,team,radius){
        game.players.addPlayer(userId,team,0,radius)
        if(!game.userIds.includes(userId)){
            game.userIds.push(userId)
        }
        return(game.players.getInfo(userId))
    }

    addBallToGame(game){
        game.addBall()
        return(game.ball)
    }

    logAllBallInfo(game){
        const ballIds = game.getAllBallIds()

        for(var ballId of ballIds){
            const ball = game.getObjectById(ballId)
            ball.logInfo()
        }
    }

    runTestGame(game,cycles,moveCommands){
        game.contacts = game.makeContacts()

        const p1 = game.players.getInfo(game.userIds[0])

        for(var count = 0; count < cycles; count++){
            p1.commands.recordMoveCommands(moveCommands)

            console.log('cycle %i before)',count)
            this.logAllBallInfo(game)

            game.updateGame()
            
            console.log('cycle %i after)',count)
            this.logAllBallInfo(game)
        }
    }

    // NOT INGAME

    testRadiusMaking(){
        const teamLength = 10
        console.log('makingPlayerRadius for %i players',teamLength)

        const game = this.makeNewGame()

        for(var count = 0; count < teamLength; count++){
            this.addUserAndPlayerToGame(game,'orange')
        }

        game.makePlayerRadius()
        console.log('radius', game.playerRadius)
        delete this.games[game.lobbyId]
    }

    testPlayerSpawn(){
        console.log('spawningPlayerTest')

        const game = this.makeNewGame()

        const p1 = this.addUserAndPlayerToGame(game,'orange')
        game.setPlayerSpawnPositions()

        // console.log('p1 startPosition', p1.startPosition, 'p1 actual position', p1.position)
        p1.setPosition(9,4)
        // console.log('p1 startPosition', p1.startPosition, 'p1 actual position', p1.position)
        game.resetBallPositions()
        // console.log('p1 startPosition', p1.startPosition, 'p1 actual position', p1.position)
        strictEqual(p1.startPosition.x, p1.position.x)
        delete this.games[game.lobbyId]
    }

    testBallSpawn(){
        const game = this.makeNewGame()
        this.addBallToGame(game)

        game.ball.setPosition(9,4)
        game.resetBallPositions()
        strictEqual(game.ball.startPosition.x, game.ball.position.x)
        delete this.games[game.lobbyId]
    }

    testSendingInfo(){
        console.log('makingGoalInfo')
        const game = this.makeNewGame()
        
        game.addBall()
        const ballInfo = game.ball.getSendingInfo()
        // console.log('ballInfo', ballInfo)
        
        const goalInfo = game.goals.getGoalSendingInfo()
        // console.log('goalInfo',goalInfo)

        const player = this.addUserAndPlayerToGame(game,'orange')
        const playerInfo = player.getSendingInfo()
        // console.log('playerInfo',playerInfo)

        console.log(game.getAllInfo())
    }

    testScorerTextMaking(){
        console.log('makingScorerText')
        const game = this.makeNewGame()
        
        game.goals.getGoals().orange.goalsScored = 4
        game.goals.getGoals().blue.goalsScored = 4

        game.makeWinnerTeamText()
    }

    // INGAME TESTS

    testPlayerPushesBallHorizontally(){
        console.log('pushingBallHorizontally')
        const game = this.makeNewGame()
        const player = this.addPlayerToGame(game,'p1','orange',0.5)
        player.setPosition(5,4)

        const ball = this.addBallToGame(game)
        ball.setPosition(player.position.x + 0.8, player.position.y)

        const moveCommands = {...move}
        moveCommands.right = true
        const cycles = 5
        this.runTestGame(game,cycles,moveCommands)

        if( player.bounce.x > 0 || Math.abs(player.bounce.x) > Math.abs(ball.bounce.x)){
            strictEqual(0,1)
        }
        delete this.games[game.lobbyId]
    }

    testPlayerPushesBallVerticallyOnTheRightSide(){
        console.log('pushingBallUpToTheSide')
        const game = this.makeNewGame()
        const player = this.addPlayerToGame(game,'p1','orange',0.5)
        player.setPosition(5,4)

        const ball = this.addBallToGame(game)
        ball.setPosition(player.position.x - 0.2, player.position.y - 0.8)
        ball.addBounce(new Vector(0,-10))

        const moveCommands = {...move}
        moveCommands.up = true
        const cycles = 5
        this.runTestGame(game,cycles,moveCommands)

        if( player.bounce.x < 0 || Math.abs(player.bounce.x) > Math.abs(ball.bounce.x)){
            strictEqual(0,1)
        }
        delete this.games[game.lobbyId]
    }

    testPlayerOnTopWallPushesPlayerRightOnUpperSide(){
        const game = this.makeNewGame()

        const player1 = this.addUserAndPlayerToGame(game,'orange')
        player1.setPosition(7.777985898234532,7.672014101765465)
        player1.radius = 0.5880599999999999

        const player2 = this.addUserAndPlayerToGame(game,'orange')
        player2.setPosition(6.863782463805512,8.41194)
        player2.radius = 0.5880599999999999
        player2.addBounce( new Vector(-20.774242921223138,-1.9558623483896138) )

        const ball = this.addBallToGame(game)
        ball.setPosition(14,6)

        const moveCommands = {...move}
        moveCommands.left = true
        moveCommands.down = true
        
        const cycles = 5
        this.runTestGame(game,cycles,moveCommands)

        delete this.games[game.lobbyId]
    }

    testPlayerPushesToBug(){
        const game = this.makeNewGame()

        const player1 = this.addUserAndPlayerToGame(game,'orange')
        player1.setPosition(13.945665682182733,8.41194)
        player1.radius = 0.5880599999999999

        const player2 = this.addUserAndPlayerToGame(game,'orange')
        player2.setPosition(12.795260242865712,8.167347319018312)
        player2.radius = 0.5880599999999999
        player2.addBounce( new Vector(-10.233381474556518,-1.7601946066435974) )

        const ball = this.addBallToGame(game)
        ball.setPosition(1,6)

        const moveCommands = {...move}
        moveCommands.left = true
        moveCommands.down = true
        
        const cycles = 5
        this.runTestGame(game,cycles,moveCommands)

        delete this.games[game.lobbyId]
    }

    testPlayerPushesPlayerIntoWallBug(){
        const game = this.makeNewGame()

        const player1 = this.addUserAndPlayerToGame(game,'orange')
        player1.setPosition(1.674954506627116, 8.41194)
        player1.radius = 0.5880599999999999

        const player2 = this.addUserAndPlayerToGame(game,'orange')
        player2.setPosition(0.5880599999999999,7.962586480080775)
        player2.radius = 0.5880599999999999
        player2.addBounce( new Vector(0.24863280630604123,-25.053814003146183) )

        const ball = this.addBallToGame(game)
        ball.setPosition(15,6)

        const moveCommands = {...move}
        moveCommands.left = true
        moveCommands.down = true
        
        const cycles = 5
        this.runTestGame(game,cycles,moveCommands)

        delete this.games[game.lobbyId]
    }

    testPlayerScoresGoal(){
        const game = this.makeNewGame()

        const ball = this.addBallToGame(game)
        ball.setPosition(15.74,8)

        const player1 = this.addUserAndPlayerToGame(game,'orange')
        player1.setPosition(ball.position.x - 0.75,ball.position.y)
        player1.radius = 0.5

        game.addGoals()

        const moveCommands = {...move}
        moveCommands.right = true
        
        const cycles = 5 

        this.runTestGame(game,cycles,moveCommands)
        delete this.games[game.lobbyId]
    }
}