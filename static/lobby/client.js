'use strict'
var socket = io();

function joinLobby(){
    var url = window.location.href
    var id = url.substring(url.lastIndexOf('a=')+2)
    socket.emit('joinLobby',id)
}
joinLobby()
