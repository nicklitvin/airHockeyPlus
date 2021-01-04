'use strict'
var socket = io();

// FUNCTIONS
function createLobby(){
    socket.emit('createLobby')
}


