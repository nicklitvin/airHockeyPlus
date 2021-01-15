'use strict'
var socket = io();

function createLobby(){
    socket.emit('createLobby')
}

socket.on('redirect', (a)=>{
    window.location.href += a
})
