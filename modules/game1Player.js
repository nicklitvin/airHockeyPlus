'use strict'

class Player{
    constructor(userId,userName,x,y){
        this.userId = userId,
        this.userName = userName,
        this.x = x,
        this.y = y,
        this.dx = 0,
        this.dy = 0,
        this.radius = .5,
        this.impulse = 1
    }
}

export default class PlayerManager{
    constructor(users){
        this.users = users
        this.players = {}
    }

    resolveFriction(userId){
        var player = this.players[userId]
        if(Math.abs(player.dx) < 0.01){
            player.dx = 0
        }
        if(player.dx){
            player.dx /= 1.1
        }
        if(Math.abs(player.dy) < 0.01){
            player.dy = 0
        }
        if(player.dy){
            player.dy /= 1.1
        }
    }

    resolveBounce(userId,serverH,serverW){
        const player = this.players[userId]
        if(player.dx>0){
            this.move(userId,player.dx,{'right':true},serverW,serverH)
        }
        if(player.dx<0){
            this.move(userId,-player.dx,{'left':true},serverW,serverH)
        }
        if(player.dy>0){
            this.move(userId,player.dy,{'down':true},serverW,serverH)
        }
        if(player.dy<0){
            this.move(userId,-player.dy,{'up':true},serverW,serverH)
        }
        this.resolveFriction(userId)
    }

    bounce(userId,way,magnitude){
        if(way == 'horizontal'){
            this.players[userId].dx += magnitude
        }
        if(way == 'vertical'){
            this.players[userId].dy += magnitude
        }
    }

    getCoordinates(userId){
        return({'x':this.players[userId].x,'y':this.players[userId].y})
    }

    processMove(userId,speed,move,serverW,serverH){
        if(move['up'] && move['down']){
            move['up'] = false
            move['down'] = false
        }
        if(move['left'] && move['right']){
            move['left'] = false
            move['right'] = false
        }
        //diagonal move
        if( (move['up'] || move['down']) && (move['left']||move['right']) ){
            speed *= Math.sqrt(2)/2
        }
        this.move(userId,speed,move,serverW,serverH)
    }

    move(userId,speed,move,serverW,serverH){
        const player = this.players[userId]
        const radius = player.radius

        if(move['up']){
            if(player.y-radius-speed < 0){
                player.y = radius
                player.dy *= -1
            }
            else{
                player.y -= speed
            }
        }
        if(move['down']){
            if(player.y+radius+speed > serverH){
                player.y = serverH - radius
                player.dy *= -1
            }
            else{
                player.y += speed
            }
        }
        if(move['left']){
            if(player.x-radius-speed < 0){
                player.x = radius
                player.dx *= -1
            }
            else{
                player.x -= speed
            }
        }
        if(move['right']){
            if(player.x+radius+speed > serverW){
                player.x = serverW - radius
                player.dx *= -1
            }
            else{
                player.x += speed
            }
        }
    }

    addPlayer(userId,x,y){
        const userName = this.users.getName(userId)
        this.players[userId] = new Player(userId,userName,x,y)
    }

    getInfo(userId){
        return(this.players[userId])
    }
}
