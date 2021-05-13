'use strict'
import cookie from '/modules/cookies.js'
const socket = io();
const userId = cookie.get('userId')

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

socket.on('redirect', (extra)=>{
    redirect(extra)
})