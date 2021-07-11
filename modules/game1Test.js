'use strict'
import Game1Control from "./game1Control.js"
import Game from './game1Game.js'
import Ball from './game1Ball.js'

export default class Game1Testing extends Game1Control{
    constructor(io,users,lobbies,refreshRate){
        super(io,users,lobbies,refreshRate)
    }

    runTests(){
        this.testPlayerPushesBallRight()
        // this.testPlayerPushesBallLeft()
        // this.testPlayerPushesBallDownToTheSide()
        // this.testPlayerPushesBallUpToTheSide()
        // this.testPlayerPushesBallDown()
        // this.testPlayerPushesBallDiagonally()
        // this.testPlayerNotDriftingFromWall()
        // this.testPlayerPushesBallIntoCorner()
        // this.testRadiusMaking()
        // this.testPlayerPushesBallUpOnEdge()
        // this.testPlayerPushesBallIntoOnEdge()
        // this.testPlayerPushesBallIntoCorner()
        // this.testPlayerPushesBallIntoRightWall()
        // this.testPlayerImpulsesOffWall()
        // this.testPlayerLimitingSpeed()
    }

    testMakeLobbyWithP1Ball(ball){
        const roomLobby = {
            userIds: ['p1'],
            teams: 0,
            gameTimer: '1min',
            lobbyId: 'test'
        }
        const lobby = new Game(roomLobby)
        lobby.addBall()

        return(lobby)
    }

    testRunGameWithP1Ball(lobby,moveCommand,moveCommand1){
        const p1 = this.players.getInfo('p1')
        const ball = lobby.ball
        const cycles = 6

        for(var count = 0; count < cycles; count++){
            console.log('cycle=%i', count)
            console.log('== before cycle')

            p1[moveCommand] = 1
            p1[moveCommand1] = 1
            
            p1.logInfo()
            ball.logInfo()
            // console.log('distance',this.physics.getDistanceBetweenTwoPoints(p1,ball)-p1.radius-ball.radius)
            this.updateGame(lobby)

            // console.log('== after cycle')
            // this.logPlayer('p1', p1)
            // this.logPlayer('p2', ball)
        }
        this.players.deletePlayer('p1')
    }

    testPlayerPushesBallRight(){
        const lobby = this.testMakeLobbyWithP1Ball()
        
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = this.serverW - 2
        // p1.dx = -12.75
        p1.y = 4.5
        
        const ball = lobby.ball
        ball.x = p1.x + 0.75
        p1.y = 4.5
        ball.dx = 12.75
        
        this.testRunGameWithP1Ball(lobby,'moveR')
    }

    testPlayerPushesBallLeft(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 1.1
        // p1.dx = -12.75
        p1.y = 4

        const ball = new Ball(0.3,4)
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveL')
    }

    testPlayerPushesBallDown(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 4
        p1.dx = 0
        p1.y = 4

        const ball = new Ball(p1.x,p1.y+.8)
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveD')
    }

    testPlayerPushesBallDownToTheSide(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 15.411066224684294
        p1.y = 3.1821407971619977
        p1.dx = -0.38

        const ball = new Ball(15.430037101626137,4.001921320124124)
        ball.dx = 0.32
        ball.dy = 14.98
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveD')
    }

    testPlayerPushesBallUpToTheSide(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 3
        p1.y = 6

        const ball = new Ball(p1.x - .36,p1.y - .66)
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveU')
    }

    testPlayerPushesBallDiagonally(){
        this.players.addPlayer('p1',0,0,0.57)
        const p1 = this.players.getInfo('p1')
        p1.x = 7.725964643494802
        p1.y = 4.60443719555104

        const ball = new Ball(8.428204916256615,4.181047777507303)
        ball.dx = 11.913300583068112
        ball.dy = -8.439290659802205
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveR','moveU')
    }

    testPlayerNotDriftingFromWall(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 5
        p1.y = this.serverH - p1.radius
        p1.newImpulse = 1

        const ball = new Ball(8.428204916256615,4.181047777507303)
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby)
    }

    testPlayerPushesBallIntoCorner(){
        this.players.addPlayer('p1',0,0,0.57)
        const p1 = this.players.getInfo('p1')
        p1.x = 14.7203
        p1.y = 0.57
        p1.dx = -631.177250048974
        p1.dy = -42.820705603356124
        p1.moveR = 1
        p1.moveU = 1

        const ball = new Ball(15.5098, 0.3486)
        ball.dx = -691.5095101315077
        ball.dy = 191.3079142925617
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveR','moveU')
    }

    testPlayerPushesBallUpOnEdge(){
        this.players.addPlayer('p1',0,0,0.594)
        const p1 = this.players.getInfo('p1')
        p1.x = 15.406
        p1.y = 5.224264068711929
        p1.dx = 3.6469744855394026
        
        const ball = new Ball(15.171467395321821,4.413170753025239) 
        ball.dx = -3.646974485539403
        ball.dy = -14.053592686597527
        
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveU')
    }

    testRadiusMaking(){
        const teamLength = 100

        var lobby = {
            lobbyId: 'a',
            userIds: []
        }
        for(var count = 0; count < teamLength; count++){
            const user = this.users.newUser(0,lobby)
            user.team = 'orange'
            lobby.userIds.push(user.userId)
        }
        this.makePlayerRadius(lobby)
        console.log(lobby.playerRadius)
    }

    testPlayerPushesBallIntoOnEdge(){
        this.players.addPlayer('p1',0,0,0.594)
        const p1 = this.players.getInfo('p1')
        p1.x = 15.404110198984208
        p1.y = 5.124116293439814
        
        const ball = new Ball(15.723174151169607,5.9054831691235945) 
        ball.dx = 4.224276642624691
        ball.dy = 13.212765257601191
        
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveR','moveD')
    }

    testPlayerPushesBallIntoCorner(){
        this.players.addPlayer('p1',0,0,0.594)
        const p1 = this.players.getInfo('p1')
        p1.x = 15.180286098347343
        p1.y = 7.957906153748709
        p1.dx = -11.8447
        p1.dy = -23.1158
        
        const ball = new Ball(15.749918798120003,8.75) 
        ball.dx = -12.9866
        ball.dy = 10.3567
        
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby)
    }

    testPlayerPushesBallIntoRightWall(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 15
        p1.y = 5
        
        const ball = new Ball(15.75,5) 
        
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby,'moveR')
    }

    testPlayerImpulsesOffWall(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 15.5
        p1.y = 5
        p1.newImpulse = 1

        const ball = new Ball(2,5) 
        
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby)
    }

    testPlayerLimitingSpeed(){
        this.players.addPlayer('p1',0,0,0.5)
        const p1 = this.players.getInfo('p1')
        p1.x = 15.5
        p1.y = 5
        p1.dx = -10000

        const ball = new Ball(2,5) 
        const lobby = this.testMakeLobbyWithP1Ball(ball)
        this.testRunGameWithP1Ball(lobby)
    }
}