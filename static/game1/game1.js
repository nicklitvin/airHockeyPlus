'use strict'
const socket = io();

import cookie from '/modules/cookies.js'

function joinGame(){
    const userId = cookie.get('userId')
    const lobbyId = window.location.href.split('a=')[1]
    socket.emit('joinGame',userId,lobbyId)
}
joinGame()

function toLobby(){
    socket.emit('endGame')
}
window.toLobby = toLobby

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
}
resizeCanvas()

// DRAW GAME

function drawPlayers(playerInfo){
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for(var player of Object.keys(playerInfo)){
        ctx.beginPath()
        ctx.arc(
            playerInfo[player].x/16*canvas.width,
            playerInfo[player].y/9*canvas.height,
            playerInfo[player].radius/9*canvas.height,
            0,
            2 * Math.PI
        )
        ctx.fillStyle = playerInfo[player].team
        ctx.fill()
    }
}

function drawBall(ball){
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    ctx.beginPath()
    ctx.arc(
        ball.x/16*canvas.width,
        ball.y/9*canvas.height,
        ball.radius/9*canvas.height,
        0,
        2 * Math.PI
    )
    ctx.fillStyle = 'black'
    ctx.fill()
}

function drawGoals(goals){
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    for(var id of Object.keys(goals)){
        const x = goals[id].x/16*canvas.width
        const y = goals[id].y/9*canvas.height
        const width = goals[id].width/16*canvas.width
        const height = goals[id].height/9*canvas.height
        ctx.fillStyle = goals[id].color
        ctx.fillRect(x,y,width,height)
    }
}

function drawGame(gameInfo){
    drawPlayers(gameInfo['players'])
    drawBall(gameInfo['ball'])
    drawGoals(gameInfo['goal'])
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
            // console.log(move[a])
            return
        }
    }
    move['change'] = 0
}

//SOCKET.ON

socket.on('redirect', (extra)=>{
    redirect(extra)
})

socket.on('gameUpdate', (gameInfo)=>{
    drawGame(gameInfo)

    const userId = cookie.get('userId')
    if(move['change']){
        socket.emit('game1Move',userId,move)
    }
    if(impulse){
        socket.emit('game1Impulse',userId)
    }
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
