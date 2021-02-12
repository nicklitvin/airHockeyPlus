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

socket.on('redirect', (extra)=>{
    redirect(extra)
})