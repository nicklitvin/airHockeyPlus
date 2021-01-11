'use strict'
// import cookie from "/modules/cookies.js"
var socket = io();

function createLobby(){
    socket.emit('createLobby')
}

socket.on('redirect', (a)=>{
    window.location.href += a
})
