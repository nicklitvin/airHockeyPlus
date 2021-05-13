'use strict'
import cookie from '/modules/cookies.js'

const socket = io()
const userId = cookie.get('userId')
const countdownSize = 1/16
const impulseTimerSize = 1/3
let endInfo

function showReturn(){
    const button = document.getElementById('lobbyReturnBut')
    button.style.display = 'block'
}

function goToLobby(){
    socket.emit('returnFromGame',userId)
}
window.goToLobby = goToLobby

function displayEndText(){
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const fontSize = canvas.height / 12
    // ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.font = fontSize + 'px comic sans ms'
    ctx.fillStyle = 'black'
    ctx.fillText(endInfo['summary'],canvas.width/2,canvas.height/2) 
}

function endGame(){
    socket.emit('endGame',userId)
}
window.endGame = endGame

function joinGame(){
    const gameAndLobby = window.location.href.split('/game')[1]
    const gameId = gameAndLobby.split('/?a')[0]
    const lobbyId = gameAndLobby.split('a=')[1]
    socket.emit('joinGame',userId,lobbyId,gameId)
}
joinGame()

function redirect(extra){
    window.location.href = window.location.href.split('game')[0] + extra
}

function resizeCanvas(){
    var canvas = document.getElementById('canvas')
    var w_adjust = 0
	var h_adjust = 0

    if(window.innerWidth == window.innerHeight*16/9){
        canvas.height = window.innerHeight
        canvas.width = window.innerWidth
    }
    //not enough horizontal stretch
    else if (window.innerWidth < window.innerHeight*16/9){
        canvas.width = window.innerWidth
        canvas.height = window.innerWidth*9/16
        h_adjust = (window.innerHeight - canvas.height)/2
    }   
    //too much horizontal stretch
    else if (window.innerWidth > window.innerHeight*16/9){
        canvas.height = window.innerHeight
        canvas.width = window.innerHeight*16/9
        w_adjust = (window.innerWidth - canvas.width)/2
    }
    canvas.style.top = h_adjust
    canvas.style.bottom = window.innerHeight-h_adjust
    canvas.style.left = w_adjust
    canvas.style.right = window.innerWidth-w_adjust
    canvas.style.position = 'absolute'
    if(endInfo){
        displayEndText()
    }
}
resizeCanvas()

// DRAW GAME

function drawPlayers(playerInfo, impulseTimer,ctx){
    for(var playerId of Object.keys(playerInfo)){
        const player = playerInfo[playerId]
        ctx.beginPath()
        ctx.arc(
            player.x*canvas.width,
            player.y*canvas.height,
            player.radiusY*canvas.height,
            0,
            2 * Math.PI
        )
        ctx.fillStyle = player.team
        ctx.fill()

        if(playerId == userId){
            drawImpulseTimer(player,impulseTimer,ctx)
        }
    }
}

function drawImpulseTimer(player,impulseTimer,ctx){
    ctx.beginPath()
    ctx.arc(
        player.x*canvas.width,
        player.y*canvas.height,
        player.radiusY*impulseTimerSize*canvas.height,
        0,
        2 * Math.PI
    )
    if(impulseTimer){
        ctx.fillStyle = 'red'
    }
    else{
        ctx.fillStyle = 'green'
    }
    ctx.fill()
}

function drawBall(ball,ctx){
    ctx.beginPath()
    ctx.arc(
        ball.x*canvas.width,
        ball.y*canvas.height,
        ball.radiusY*canvas.height,
        0,
        2 * Math.PI
    )
    ctx.fillStyle = 'black'
    ctx.fill()
}

function drawGoals(goals,ctx){
    for(var id of Object.keys(goals)){
        const x = goals[id].x*canvas.width
        const y = goals[id].y*canvas.height
        const width = goals[id].width*canvas.width
        const height = goals[id].height*canvas.height
        ctx.fillStyle = goals[id].color
        ctx.fillRect(x,y,width,height)
    }
}

function drawCountdown(time,ctx){
    if(!time){
        return
    }

    ctx.font = countdownSize*canvas.height + 'px Comic Sans MS'
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.fillText(
        time,
        canvas.width/2,
        canvas.height/2
    )
}

function drawTimeLeft(time,ctx){
    if(!time){
        return
    }

    ctx.font = countdownSize*canvas.height + 'px Comic Sans MS'
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.fillText(
        time,
        canvas.width/2,
        canvas.height/10
    )
}

function drawGame(gameInfo){
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    drawPlayers(gameInfo['players'],gameInfo['impulseTimer'],ctx)
    drawBall(gameInfo['ball'],ctx)
    drawGoals(gameInfo['goal'],ctx)
    drawCountdown(gameInfo['countdown'],ctx)
    drawTimeLeft(gameInfo['timeLeft'],ctx)
}

// MOVE PLAYER

var impulse = 0
var move = {
    change: 0,
    left: false,
    right: false,
    up: false,
    down: false
}

function newMove(key){
    if(key == 'w'){
        move['up'] = true
        move['change'] = 1
    }
    if(key == 'a'){
        move['left'] = true
        move['change'] = 1
    }
    if(key == 's'){
        move['down'] = true
        move['change'] = 1
    }
    if(key == 'd'){
        move['right'] = true
        move['change'] = 1
    }    
}

function noMove(key){
    if(key == 'w'){
        move['up'] = false
    }
    if(key == 'a'){
        move['left'] = false
    }
    if(key == 's'){
        move['down'] = false
    }
    if(key == 'd'){
        move['right'] = false
    }    
    for(var a of Object.keys(move)){
        if(a!='change' && move[a]==true){
            return
        }
    }
    move['change'] = 0
}

//SOCKET.ON

socket.on('redirect', (extra)=>{
    redirect(extra)
})

socket.on('game1Update', (gameInfo)=>{
    drawGame(gameInfo)
    if(gameInfo.countdown){
        return
    }
    if(move['change']){
        socket.emit('game1Move',userId,move)
    }
    if(impulse){
        socket.emit('game1Impulse',userId)
    }
})

socket.on('gameEnd', (info)=>{
    endInfo = info
    displayEndText()
    showReturn()
})

// EVENTS

window.addEventListener('resize', resizeCanvas)

window.addEventListener('keydown', (event)=>{
    if(['w','a','s','d'].includes(event.key)){
        newMove(event.key)
    }
    if(event.code == 'Space'){
        impulse = 1
    }
})
window.addEventListener('keyup', (event)=>{
    if(['w','a','s','d'].includes(event.key)){
        noMove(event.key)
    }
    if(event.code == 'Space'){
        impulse = 0
    }
})
