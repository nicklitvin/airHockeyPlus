'use strict'
import Game from './game.js'
import Vector from "../vector.js"
import GameLibrary from '../gameLibrary.js'
import UserManager from '../userManager.js'
import { strictEqual } from "assert"

const ROUNDING_ERROR = 0.001
const keyboardMove = {
    'up': false,
    'down': false,
    'left': false,
    'right': false
}
const mouseMove = new Vector(0,0)

export default class Game1Test{
    constructor(){
        this.users = new UserManager()
        this.gameLibrary = new GameLibrary()

        this.game = null
        this.playerMoves = {}
    }

    runTests(){
        // this.playerPushesBallRight()
        this.playerPushesBallInfiniteCycle()
    }

    makeNewGame(){
        const settings = this.gameLibrary.getImportantSettings()
        this.game = new Game(0,0,[],settings)
    }

    deleteGame(){
        this.game = null
    }

    makePlayer(userId,radius){
        const settings = this.makePlayerSettings()

        this.game.userIds.push(userId)
        this.game.makeContacts()
        this.game.players.addPlayer(userId,settings,0,radius)
    }

    makePlayerSettings(){
        var settings = this.gameLibrary.getGamePersonalSettings()
        settings.teamChoices.chosen = 'orange'
        return(settings)
    }

    makePositions(){
        const p1 = this.game.players.getInfo('p1')
        p1.position = new Vector(5,6)
    }

    applyPlayerMoves(){
        for(var playerId of Object.keys(this.game.players.players)){
            const player = this.game.players.getInfo(playerId)

            if(player.commands.mouseControl && this.playerMoves[playerId]){
                player.commands.recordMouseCommands(this.playerMoves[playerId])
            }
            else if(player.commands.keyboardControl && this.playerMoves[playerId]){
                player.commands.recordMoveCommands(this.playerMoves[playerId])
            }
        }
    }

    runGame(times){
        for(var count = 0; count < times; count++){
            this.applyPlayerMoves()
            this.game.updateGame()
            this.logInfo(count)
        }
    }

    logInfo(count){
        console.log('cycle: %i',count)
        for(var playerId of Object.keys(this.game.players.players)){
            const player = this.game.players.getInfo(playerId)
            player.logInfo()
        }
        this.game.ball.logInfo()
    }

    // TESTS

    playerPushesBallRight(){
        this.makeNewGame()
        this.makePlayer('p1',0.5)
        const p1 = this.game.players.getInfo('p1')
        p1.setPosition(4,4)
        
        var move = {...keyboardMove}
        move.right = true
        this.playerMoves.p1 = move

        this.game.ball.setPosition(4.8,4)

        const cycles = 5
        this.runGame(cycles)
        this.deleteGame()
    }

    playerPushesBallInfiniteCycle(){
        this.makeNewGame()
        this.makePlayer('p1',0.594)
        const p1 = this.game.players.getInfo('p1')
        p1.setPosition(14.602453396848654,1.1494839303127462)
        p1.addBounce(new Vector(-15.954729412985307,12.984986868019375))
        
        var move = {...keyboardMove}
        move.up = true
        this.playerMoves.p1 = move

        const ball = this.game.ball
        ball.setPosition(14.218279002871459,0.3491949163399015)
        ball.addBounce(new Vector(-19.478764454899473,2.4046725817826795))

        const cycles = 5
        this.runGame(cycles)
        this.deleteGame()
    }
}

/*
Player {
  position: Vector { x: 15.097057657883752, y: 1.1736742635568134 },
  bounce: Vector { x: -798.6374517671048, y: 29.00274347616613 },
  motion: Vector { x: -798.6374517671048, y: 14.002743476166131 },
  startPosition: Vector { x: 12, y: 4.5 },
  radius: 0.594,
  mass: 1,
  serverW: 16,
  serverH: 9,
  objectBounceSpeedLimit: 100,
  frictionConst: 0.85,
  userId: 'tvtuvngiim',
  userName: 'player981',
  team: 'blue',
  goals: 0,
  newImpulse: 0,
  impulseCooldown: 0,
  maxSpeed: 15,
  commands: MoveCommands {
    serverW: 16,
    serverH: 9,
    maxSpeed: 15,
    position: Vector { x: 15.097057657883752, y: 1.1736742635568134 },
    keyboardControl: true,
    right: false,
    left: false,
    up: true,
    down: false,
    mouseControl: false,
    mouse: Vector { x: 13.097222222222221, y: 4.236111111111111 },
    moveVector: Vector { x: 0, y: -15 }
  }
} Ball {
  position: Vector { x: 14.792988377196375, y: 0.3863510309882196 },
  bounce: Vector { x: -73.60441065814541, y: -160.24320451017758 },
  motion: Vector { x: -73.60441065814541, y: -160.24320451017758 },
  startPosition: Vector { x: 8, y: 4.5 },
  radius: 0.25,
  mass: 0.5,
  serverW: 16,
  serverH: 9,
  objectBounceSpeedLimit: 100,
  frictionConst: 0.85
}

*/

// OLD

// export default class Game1Test extends Game{
//     constructor(users,lobbies,userIds,settings){
//         super(users,lobbies,userIds,settings)
//     }

//     runTests(){
//         // this.testRadiusMaking()
//         // this.testPlayerSpawn()
//         // this.testBallSpawn()
//         // this.testSendingInfo()
//         // this.testScorerTextMaking()

//         // this.testPlayerPushesBallHorizontally()
//         // this.testPlayerPushesBallVerticallyOnTheRightSide()
//         // this.testPlayerOnTopWallPushesPlayerRightOnUpperSide()
//         // this.testPlayerCollision2()
//         // this.testPlayerPushesToBug()
//         // this.testPlayerPushesPlayerIntoWallBug()
//         // this.testPlayerScoresGoal()
//         // this.testPlayerMovesWithMouse()
//         this.testPlayerMovesWithMouseCollisionWithBall()
//     }

//     // ESSENTIALS

//     makeNewGame(){
//         const lobby = {
//             userIds: [],
//             teams: ['orange','blue'],
//             gameTimer: '1min',
//             lobbyId: 'test'
//         }
//         const game = new Game(lobby,this.users)
//         game.addGoals()
//         return(game)
//     }

//     addUserAndPlayerToGame(game,team){
//         const user = game.users.newUser(0,game)
//         user.team = team
//         game.userIds.push(user.userId)
//         const player = this.addPlayerToGame(game,user.userId,team,0.5)
//         return(player)
//     }

//     addPlayerToGame(game,userId,team,radius){
//         game.players.addPlayer(userId,team,0,radius)
//         if(!game.userIds.includes(userId)){
//             game.userIds.push(userId)
//         }
//         return(game.players.getInfo(userId))
//     }

//     addBallToGame(game){
//         game.addBall()
//         return(game.ball)
//     }

//     logAllBallInfo(game){
//         const ballIds = game.getAllBallIds()

//         for(var ballId of ballIds){
//             const ball = game.getObjectById(ballId)
//             ball.logInfo()
//         }
//     }

//     runTestGame(game,cycles,moveCommands){
//         game.contacts = game.makeContacts()

//         const p1 = game.players.getInfo(game.userIds[0])

//         for(var count = 0; count < cycles; count++){
//             if(p1.commands.mouseControl){
//                 p1.commands.recordMouseCommands(moveCommands)
//             }
//             else{
//                 p1.commands.recordMoveCommands(moveCommands)
//             }

//             console.log('cycle %i before)',count)
//             this.logAllBallInfo(game)

//             game.updateGame()
            
//             console.log('cycle %i after)',count)
//             this.logAllBallInfo(game)
//         }
//     }

//     // NOT INGAME

//     testRadiusMaking(){
//         const teamLength = 10
//         console.log('makingPlayerRadius for %i players',teamLength)

//         const game = this.makeNewGame()

//         for(var count = 0; count < teamLength; count++){
//             this.addUserAndPlayerToGame(game,'orange')
//         }

//         game.makePlayerRadius()
//         console.log('radius', game.playerRadius)
//         delete this.games[game.lobbyId]
//     }

//     testPlayerSpawn(){
//         console.log('spawningPlayerTest')

//         const game = this.makeNewGame()

//         const p1 = this.addUserAndPlayerToGame(game,'orange')
//         game.setPlayerSpawnPositions()

//         // console.log('p1 startPosition', p1.startPosition, 'p1 actual position', p1.position)
//         p1.setPosition(9,4)
//         // console.log('p1 startPosition', p1.startPosition, 'p1 actual position', p1.position)
//         game.resetBallPositions()
//         // console.log('p1 startPosition', p1.startPosition, 'p1 actual position', p1.position)
//         strictEqual(p1.startPosition.x, p1.position.x)
//         delete this.games[game.lobbyId]
//     }

//     testBallSpawn(){
//         const game = this.makeNewGame()
//         this.addBallToGame(game)

//         game.ball.setPosition(9,4)
//         game.resetBallPositions()
//         strictEqual(game.ball.startPosition.x, game.ball.position.x)
//         delete this.games[game.lobbyId]
//     }

//     testSendingInfo(){
//         console.log('makingGoalInfo')
//         const game = this.makeNewGame()
        
//         game.addBall()
//         const ballInfo = game.ball.getSendingInfo()
//         // console.log('ballInfo', ballInfo)
        
//         const goalInfo = game.goals.getGoalSendingInfo()
//         // console.log('goalInfo',goalInfo)

//         const player = this.addUserAndPlayerToGame(game,'orange')
//         const playerInfo = player.getSendingInfo()
//         // console.log('playerInfo',playerInfo)
//         delete this.games[game.lobbyId]
//     }

//     testScorerTextMaking(){
//         console.log('makingScorerText')
//         const game = this.makeNewGame()
        
//         game.goals.getGoals().orange.goalsScored = 4
//         game.goals.getGoals().blue.goalsScored = 4

//         game.makeWinnerTeamText()
//         delete this.games[game.lobbyId]
//     }

//     // INGAME TESTS

//     testPlayerPushesBallHorizontally(){
//         console.log('pushingBallHorizontally')
//         const game = this.makeNewGame()
//         const player = this.addPlayerToGame(game,'p1','orange',0.5)
//         player.setPosition(5,4)

//         const ball = this.addBallToGame(game)
//         ball.setPosition(player.position.x + 0.8, player.position.y)

//         const moveCommands = {...move}
//         moveCommands.right = true
//         const cycles = 5
//         this.runTestGame(game,cycles,moveCommands)

//         if( player.bounce.x > 0 || Math.abs(player.bounce.x) > Math.abs(ball.bounce.x)){
//             strictEqual(0,1)
//         }
//         delete this.games[game.lobbyId]
//     }

//     testPlayerPushesBallVerticallyOnTheRightSide(){
//         console.log('pushingBallUpToTheSide')
//         const game = this.makeNewGame()
//         const player = this.addPlayerToGame(game,'p1','orange',0.5)
//         player.setPosition(5,4)

//         const ball = this.addBallToGame(game)
//         ball.setPosition(player.position.x - 0.2, player.position.y - 0.8)
//         ball.addBounce(new Vector(0,-10))

//         const moveCommands = {...move}
//         moveCommands.up = true
//         const cycles = 5
//         this.runTestGame(game,cycles,moveCommands)

//         if( player.bounce.x < 0 || Math.abs(player.bounce.x) > Math.abs(ball.bounce.x)){
//             strictEqual(0,1)
//         }
//         delete this.games[game.lobbyId]
//     }

//     testPlayerOnTopWallPushesPlayerRightOnUpperSide(){
//         const game = this.makeNewGame()

//         const player1 = this.addUserAndPlayerToGame(game,'orange')
//         player1.setPosition(7.777985898234532,7.672014101765465)
//         player1.radius = 0.5880599999999999

//         const player2 = this.addUserAndPlayerToGame(game,'orange')
//         player2.setPosition(6.863782463805512,8.41194)
//         player2.radius = 0.5880599999999999
//         player2.addBounce( new Vector(-20.774242921223138,-1.9558623483896138) )

//         const ball = this.addBallToGame(game)
//         ball.setPosition(14,6)

//         const moveCommands = {...move}
//         moveCommands.left = true
//         moveCommands.down = true
        
//         const cycles = 5
//         this.runTestGame(game,cycles,moveCommands)

//         delete this.games[game.lobbyId]
//     }

//     testPlayerCollision2(){
//         const game = this.makeNewGame()

//         const player1 = this.addUserAndPlayerToGame(game,'orange')
//         player1.setPosition(7.141589795166639,8.308410204833358)
//         player1.radius = 0.5880599999999999

//         const ball = this.addBallToGame(game)
//         ball.setPosition(14,6)

//         const player2 = this.addUserAndPlayerToGame(game,'orange')
//         player2.setPosition(5.794927669348877,8.311327066402924)
//         player2.radius = 0.5880599999999999
//         player2.addBounce( new Vector(-25.516441230152786,-2.401901568330526) )

//         const moveCommands = {...move}
//         moveCommands.left = true
//         moveCommands.down = true
        
//         const cycles = 5
//         this.runTestGame(game,cycles,moveCommands)

//         delete this.games[game.lobbyId]
//     }

//     testPlayerPushesToBug(){
//         const game = this.makeNewGame()

//         const player1 = this.addUserAndPlayerToGame(game,'orange')
//         player1.setPosition(13.945665682182733,8.41194)
//         player1.radius = 0.5880599999999999

//         const player2 = this.addUserAndPlayerToGame(game,'orange')
//         player2.setPosition(12.795260242865712,8.167347319018312)
//         player2.radius = 0.5880599999999999
//         player2.addBounce( new Vector(-10.233381474556518,-1.7601946066435974) )

//         const ball = this.addBallToGame(game)
//         ball.setPosition(1,6)

//         const moveCommands = {...move}
//         moveCommands.left = true
//         moveCommands.down = true
        
//         const cycles = 5
//         this.runTestGame(game,cycles,moveCommands)

//         delete this.games[game.lobbyId]
//     }

//     testPlayerPushesPlayerIntoWallBug(){
//         const game = this.makeNewGame()

//         const player1 = this.addUserAndPlayerToGame(game,'orange')
//         player1.setPosition(1.674954506627116, 8.41194)
//         player1.radius = 0.5880599999999999

//         const player2 = this.addUserAndPlayerToGame(game,'orange')
//         player2.setPosition(0.5880599999999999,7.962586480080775)
//         player2.radius = 0.5880599999999999
//         player2.addBounce( new Vector(0.24863280630604123,-25.053814003146183) )

//         const ball = this.addBallToGame(game)
//         ball.setPosition(15,6)

//         const moveCommands = {...move}
//         moveCommands.left = true
//         moveCommands.down = true
        
//         const cycles = 5
//         this.runTestGame(game,cycles,moveCommands)

//         delete this.games[game.lobbyId]
//     }

//     testPlayerScoresGoal(){
//         const game = this.makeNewGame()

//         const ball = this.addBallToGame(game)
//         ball.setPosition(12,8)

//         const player1 = this.addUserAndPlayerToGame(game,'orange')
//         player1.setPosition(ball.position.x - 0.75,ball.position.y)
//         player1.radius = 0.5

//         game.addGoals()

//         const moveCommands = {...move}
//         moveCommands.right = true
        
//         const cycles = 5 

//         this.runTestGame(game,cycles,moveCommands)
//         delete this.games[game.lobbyId]
//     }

//     testPlayerMovesWithMouse(){
//         const game = this.makeNewGame()

//         const ball = this.addBallToGame(game)
//         ball.setPosition(5.74,8)

//         const player1 = this.addUserAndPlayerToGame(game,'orange')
//         player1.setPosition(15.5,9/2)
//         player1.radius = 0.5
//         player1.commands.mouseControl = true

//         game.addGoals()

//         const move = new Vector(1.1,0.5)
        
//         const cycles = 50 

//         this.runTestGame(game,cycles,move)

//         // if( Math.abs(player1.position.x - move.x*16) > ROUNDING_ERROR ||
//         //     Math.abs(player1.position.y - move.y*9) > ROUNDING_ERROR)
//         // {
//         //     strictEqual(0,1)
//         // }
//         delete this.games[game.lobbyId]
//     }

//     testPlayerMovesWithMouseCollisionWithBall(){
//         const game = this.makeNewGame()

//         const player1 = this.addUserAndPlayerToGame(game,'orange')
//         player1.setPosition(1.2388004940100241,0.6746398441292485)
//         player1.addBounce(new Vector(59.31836546913247,790.5404607857434) )
//         player1.radius = 0.594
//         player1.commands.mouseControl = false

//         const ball = this.addBallToGame(game)
//         ball.setPosition(0.566572202663247,1.184978089132494)
//         ball.addBounce(new Vector(-225.62482446460442,168.5342789260859))

//         console.log(game.physics.getDistanceBetweenTwoPoints(player1.position,ball.position))

//         game.addGoals()

//         const mouse = new Vector(5.319444444444445/16,3.6666666666666665/9)
//         const cycles = 5 

//         this.runTestGame(game,cycles,mouse)

//         delete this.games[game.lobbyId]
//     }
// }