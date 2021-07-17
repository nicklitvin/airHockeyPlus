'use strict'
import cookie from '/modules/cookies.js'

const socket = io()
const userId = cookie.get('userId')
const countdownSize = 1/16
const impulseTimerSize = 1/3
let endInfo

function showReturn(){
    const returnBut = document.getElementById('lobbyReturnBut')
    returnBut.style.display = 'block'

    const stopBut = document.getElementById('endGameBut')
    stopBut.style.display = 'none'
}

function goToLobby(){
    socket.emit('returnFromGame',userId)
}
window.goToLobby = goToLobby

function displaySummary(){
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

function displayScorers(){
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')
    const fontSize = canvas.height / 24
    ctx.textAlign = 'center'
    ctx.font = fontSize + 'px comic sans ms'

    var height = 3*canvas.height/5
    const info = endInfo['scorers']
    var line = ''

    for(var i=0; i<info.length; i++){
        if(info[i] == '/'){
            ctx.fillStyle = info[i+1]
            i += 1
        }
        else if(info[i] == '!'){
            ctx.fillText(line,canvas.width/2,height)
            height += canvas.height / 18
            line = ''
        }
        else{
            line += info[i]
        }
    }
}

function displayEndText(){
    displaySummary()
    displayScorers()
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
    for(var player of playerInfo){
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

        if(player.userId == userId){
            drawImpulseTimer(player,impulseTimer,ctx)
        }
    }
}

function drawImpulseTimer(player,impulseColor,ctx){
    ctx.beginPath()
    ctx.arc(
        player.x*canvas.width,
        player.y*canvas.height,
        player.radiusY*impulseTimerSize*canvas.height,
        0,
        2 * Math.PI
    )
    ctx.fillStyle = impulseColor
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

    drawPlayers(gameInfo['players'],gameInfo['impulseColor'],ctx)
    drawBall(gameInfo['ball'],ctx)
    drawGoals(gameInfo['goal'],ctx)
    drawCountdown(gameInfo['countdown'],ctx)
    drawTimeLeft(gameInfo['timeLeft'],ctx)
}

// MOVE PLAYER

var impulse = 0
var move = {
    action: false,
    left: false,
    right: false,
    up: false,
    down: false
}

function newMove(key){
    if(key == 'w' || key == 'W'){
        move['up'] = true
        move['action'] = true
    }
    if(key == 'a' || key == 'A'){
        move['left'] = true
        move['action'] = true
    }
    if(key == 's' || key == 'S'){
        move['down'] = true
        move['action'] = true
    }
    if(key == 'd' || key == 'D'){
        move['right'] = true
        move['action'] = true
    }    
}

function noMove(key){
    if(key == 'w' || key == 'W'){
        move['up'] = false
    }
    if(key == 'a' || key == 'A'){
        move['left'] = false
    }
    if(key == 's' || key == 'S'){
        move['down'] = false
    }
    if(key == 'd' || key == 'D'){
        move['right'] = false
    }    
    for(var a of Object.keys(move)){
        if(a!='action' && move[a]==true){
            return
        }
    }
    move['action'] = false
}

function resetMove(){
    for(var direct of Object.keys(move)){
        move[direct] = false
    }
    move['action'] = 0
}

//SOCKET.ON

socket.on('redirect', (extra)=>{
    redirect(extra)
})

socket.on('game1Update', (gameInfo)=>{
    if(endInfo){
        return
    }

    drawGame(gameInfo)
    if(gameInfo.countdown){
        return
    }

    if(!document.hasFocus()){
        resetMove()
    }
    if(move['action']){
        socket.emit('game1Move',userId,move)
    }
    if(impulse){
        socket.emit('game1Impulse',userId)
    }
})

socket.on('endStuff', (info)=>{
    endInfo = info
    displayEndText()
    showReturn()
})

socket.on('stopGamePower', ()=>{
    const button = document.getElementById('endGameBut')
    button.style.display = 'block'
})

// EVENTS

window.addEventListener('resize', resizeCanvas)

window.addEventListener('keydown', (event)=>{
    if(['w','W','a','A','s','S','d','D'].includes(event.key)){
        // console.log('pressed',event.key)
        newMove(event.key)
    }
    if(event.code == 'Space'){
        impulse = 1
    }
})
window.addEventListener('keyup', (event)=>{
    if(['w','W','a','A','s','S','d','D'].includes(event.key)){
        // console.log('let go of',event.key)
        noMove(event.key)
    }
    if(event.code == 'Space'){
        impulse = 0
    }
})

window.addEventListener('click', ()=>{
    resetMove()
})

window.oncontextmenu = ()=> {
    resetMove()
}

document.onvisibilitychange = ()=> {
    resetMove()
}

