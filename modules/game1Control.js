import PlayerManager from './game1Player.js'
import Ball from './game1Ball.js'
import PhysicsManager from './game1Physics.js'

class Game{
    constructor(userIds,contacts){
        this.userIds = userIds
        this.contacts = contacts
        this.serverH = 9
        this.serverW = 16
        this.speed = 0.1
        this.impulseMagnitude = .4
        this.impulseRadius = 1.5
        this.spawnRadius = 4
        this.bounceStrength = 0.1
        this.goalHeight = 1.5
        this.goalWidth = 0.2

        this.ball = 0
    }
}

export default class Game1Control{
    constructor(io,users){
        this.users = users,
        this.players = new PlayerManager(this.users,users),
        this.serverH = 9,
        this.serverW = 16,
        this.physics = new PhysicsManager()
        this.games = {}

        io.on('connection', (socket)=>{
            socket.on('game1Move', (userId,move)=>{
                this.movePlayer(userId,move)
            })
            socket.on('game1Impulse', (userId)=>{
                this.impulsePlayer(userId)
            })
        })
    }

    // IMPULSE

    wallBounce(user,lobbyId){
        const impMagn = this.games[lobbyId].impulseMagnitude
        
        //closest to which wall
        const yDist = Math.min(this.serverH-user.y,user.y)
        const xDist = Math.min(this.serverW-user.x,user.x)

        if(yDist < 2){ 
            if(this.serverH-user.y<user.y){
                this.physics.addDy(user,-impMagn)
            }
            else{
                this.physics.addDy(user,impMagn)
            }
        }
        if(xDist < 2){ 
            if(this.serverW-user.x<user.x){
                this.physics.addDx(user,-impMagn)
            }
            else{
                this.physics.addDx(user,impMagn)
            }
        }
    }

    withinImpRange(obj0,obj1,impRadius){
        const dist = ( (obj0.x-obj1.x)**2 + (obj0.y-obj1.y)**2 )**1/2
        if(dist<impRadius){
            return(1)
        }
    }

    giveTargetImpulse(player,target,lobbyId){
        const impMagn = this.games[lobbyId].impulseMagnitude
        const angle = Math.atan(Math.abs(target.y-player.y)/Math.abs(target.x-player.x))
        var dy = 0
        var dx = 0

        //push down
        if(target.y>player.y){
            dy = Math.sin(angle)*impMagn
        }
        //push up
        if(target.y<player.y){
            dy = -Math.sin(angle)*impMagn
        }
        //push right
        if(target.x>player.x){
            dx = Math.cos(angle)*impMagn
        }       
        //push left
        if(target.x<player.x){
            dx = -Math.cos(angle)*impMagn
        }
        this.physics.addDx(target,dx)
        this.physics.addDy(target,dy) 
    }

    pvpImpulseCheck(user,lobbyId,impRadius){
        const targetIds = this.games[lobbyId].userIds

        for(var targetId of targetIds){
            if(targetId == user.userId){
                continue
            }
            const target = this.players.getInfo(targetId)
            if(this.withinImpRange(user,target,impRadius)){
                this.giveTargetImpulse(user,target,lobbyId)
            }
        }
    }

    ballImpulseCheck(user,lobbyId,impRadius){
        const ball = this.games[lobbyId].ball
        if(this.withinImpRange(user,ball,impRadius)){
            this.giveTargetImpulse(user,ball,lobbyId)
        }
    }

    impulsePlayer(userId){
        const user = this.players.getInfo(userId)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const impRadius = this.games[lobbyId].impulseRadius

        this.wallBounce(user,lobbyId)
        this.pvpImpulseCheck(user,lobbyId,impRadius)
        this.ballImpulseCheck(user,lobbyId,impRadius)
    }

    // PLAYER MOVEMENT
    
    movePlayer(userId,move){
        const userInfo = this.players.getInfo(userId)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const speed = this.games[lobbyId].speed
        const moveInfo = this.players.processMove(move,speed)

        this.resolveMove(userInfo,moveInfo)
        this.collisionControl(lobbyId)
    }

    resolveMove(obj,move){
        this.physics.moveLeft(obj,move['left'])
        this.physics.moveRight(obj,move['right'])
        this.physics.moveUp(obj,move['up'])
        this.physics.moveDown(obj,move['down'])
    }

    // COLLISION CHECK

    pvpCollision(p1,p2,lobbyId){
        const strength = this.games[lobbyId].bounceStrength
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

    pvpCollisionCheck(lobbyId){
        if(!this.games[lobbyId].contacts){
            return  
        }
        for(var contact of this.games[lobbyId].contacts){
            const p1 = this.players.getInfo(contact[0])
            const p2 = this.players.getInfo(contact[1])
            if(this.checkCollision(p1,p2)){
                this.pvpCollision(p1,p2,lobbyId)
            }
        }
    }

    ballCollision(player,ball,lobbyId){
        const strength = this.games[lobbyId].bounceStrength
        const angle = Math.atan(Math.abs(player.y-ball.y)/Math.abs(player.x-ball.x))
        const dx = Math.cos(angle)*strength
        const dy = Math.sin(angle)*strength

        // push down
        if (player.y<ball.y){
            this.physics.addDy(ball,dy)
        }
        // push up
        else if (player.y>ball.y){
            this.physics.addDy(ball,-dy)
        }
        // push right
        if (player.x<ball.x){
            this.physics.addDx(ball,dx)
        }
        // push left
        else if (player.x>ball.x){
            this.physics.addDx(ball,-dx)
        }
    }  

    ballCollisionCheck(lobbyId){
        const ball = this.games[lobbyId].ball
        for(var userId of this.games[lobbyId].userIds){
            const player = this.players.getInfo(userId)
            if(this.checkCollision(player,ball)){
                this.ballCollision(player,ball,lobbyId)
            }
        }
    }

    collisionControl(lobbyId){
        this.pvpCollisionCheck(lobbyId)
        this.ballCollisionCheck(lobbyId)
    }

    // BOUNCE CONTROL

    bouncePlayers(lobbyId){
        for (var userId of this.games[lobbyId].userIds){
            const userInfo = this.players.getInfo(userId)
            this.physics.resolveBounce(userInfo)
        }
    }

    isGoal(lobbyId,ball){
        const lowEnd = this.serverH/2+this.games[lobbyId].goalHeight/2
        const highEnd = this.serverH/2-this.games[lobbyId].goalHeight/2
        if( (ball.x==ball.radius) && (ball.y > highEnd) && (ball.y < lowEnd)){
            console.log('goalLeft')
        }
        if( (ball.x==this.serverW-ball.radius)&&(ball.y>highEnd)&&(ball.y<lowEnd)){
            console.log('goalRight')
        }
    }

    bounceBall(lobbyId){
        const ball = this.games[lobbyId].ball
        this.physics.resolveBounce(ball)
        this.isGoal(lobbyId,ball)
    }

    bounceControl(lobbyId){
        this.bouncePlayers(lobbyId)
        this.bounceBall(lobbyId)
    }

    // RUN AND SEND GAME

    getGoalInfo(lobbyId){
        var goalInfo = {}
        const height = this.games[lobbyId].goalHeight
        const width = this.games[lobbyId].goalWidth
        const goalX = this.serverW-width
        const highEnd = this.serverH/2-height/2

        goalInfo[0] = {'x':0,'y':highEnd,'width':width,'height':height, 'color':'orange'}
        goalInfo[1] = {'x':goalX,'y':highEnd,'width':width,'height':height, 'color':'blue'}
        return(goalInfo)
    }

    getAllPlayerInfo(lobbyId){
        const userIds = this.games[lobbyId].userIds
        const playerInfo = {}
        for(var userId of userIds){
            playerInfo[userId] = this.players.getInfo(userId)
        }
        return(playerInfo)
    }

    getBallInfo(lobbyId){
        return(this.games[lobbyId].ball)
    }

    getAllInfo(lobbyId){
        const playerInfo = this.getAllPlayerInfo(lobbyId)
        const ballInfo = this.getBallInfo(lobbyId)
        const goalInfo = this.getGoalInfo(lobbyId)
        return({'players':playerInfo,'ball':ballInfo,'goal':goalInfo})
    }

    sendGame(lobbyId,allInfo){
        for(var userId of this.games[lobbyId].userIds){
            const socket = this.users.getInfo(userId).socket
            socket.emit('gameUpdate',allInfo)
        }
    }

    runGame1(){
        for(var lobbyId of Object.keys(this.games)){
            this.bounceControl(lobbyId)
            this.collisionControl(lobbyId)

            const allInfo = this.getAllInfo(lobbyId)
            this.sendGame(lobbyId,allInfo)
        }
    }

    // SETUP GAME

    addPlayers(lobbyId,userIds){
        const angleInt = 2*Math.PI/Object.keys(userIds).length
        const spawnRadius = this.games[lobbyId].spawnRadius
        var angle = 0
        
        for(var userId of userIds){
            const x = Math.cos(angle)*spawnRadius+this.serverW/2
            const y = Math.sin(angle)*spawnRadius+this.serverH/2
            const team = this.users.getInfo(userId).team
            this.players.addPlayer(userId,x,y,this.serverH,this.serverW,team)
            angle += angleInt
        }
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

    addBall(lobbyId){
        const x = this.serverW/2
        const y = this.serverH/2
        this.games[lobbyId].ball = new Ball(x,y,this.serverH,this.serverW)
    }

    newGame(lobbyId,userIds){
        const contacts = this.makeContacts(userIds)
        this.games[lobbyId] = new Game(userIds,contacts)
        this.addPlayers(lobbyId,userIds)
        this.addBall(lobbyId)
    }
}

