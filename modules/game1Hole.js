'use strict'

class Ball{
    constructor(lobbyId,x,y){
        this.lobbyId = lobbyId,
        this.x = x,
        this.y = y,
        this.dx = 0,
        this.dy = 0,
        this.radius = .25
    }
}

export default class BallManager{
    constructor(){
        this.balls = {}
    }

    newBall(lobbyId,x,y){
        this.balls[lobbyId] = new Ball(lobbyId,x,y)
    }

    getInfo(lobbyId){
        const ball = this.balls[lobbyId]
        return({'x':ball.x,'y':ball.y,'radius':ball.radius})
    }

    resolveFriction(lobbyId){
        const ball = this.balls[lobbyId]
        if(Math.abs(ball.dx) < 0.01){
            ball.dx = 0
        }
        if(ball.dx){
            ball.dx /= 1.1
        }
        if(Math.abs(ball.dy) < 0.01){
            ball.dy = 0
        }
        if(ball.dy){
            ball.dy /= 1.1
        }
    }

    resolveBounce(lobbyId,serverH,serverW){
        const ball = this.balls[lobbyId]
        if(ball.dx>0){
            this.move(ball,ball.dx,{'right':true},serverW,serverH)
        }
        if(ball.dx<0){
            this.move(ball,-ball.dx,{'left':true},serverW,serverH)
        }
        if(ball.dy>0){
            this.move(ball,ball.dy,{'down':true},serverW,serverH)
        }
        if(ball.dy<0){
            this.move(ball,-ball.dy,{'up':true},serverW,serverH)
        }
        this.resolveFriction(lobbyId)
    }

    bounce(lobbyId,way,magnitude){
        if(way == 'horizontal'){
            this.balls[lobbyId].dx += magnitude
        }
        if(way == 'vertical'){
            this.balls[lobbyId].dy += magnitude
        }
    }

    move(ball,speed,move,serverW,serverH){
        const radius = ball.radius
        if(move['up']){
            if(ball.y-radius-speed < 0){
                ball.y = radius
                ball.dy *= -1
            }
            else{
                ball.y -= speed
            }
        }
        if(move['down']){
            if(ball.y+radius+speed > serverH){
                ball.y = serverH - radius
                ball.dy *= -1
            }
            else{
                ball.y += speed
            }
        }
        if(move['left']){
            if(ball.x-radius-speed < 0){
                ball.x = radius
                ball.dx *= -1
            }
            else{
                ball.x -= speed
            }
        }
        if(move['right']){
            if(ball.x+radius+speed > serverW){
                ball.x = serverW - radius
                ball.dx *= -1
            }
            else{
                ball.x += speed
            }
        }
    }
}