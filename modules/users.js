'use strict'

import lobby from "./lobby.js"

var idLength = 10
// userId: {lobbyId,socket}
var users = {}
// socketId: userId
var sockets = {}

function makeId(){
    var id = ''
    var hex = 'ghijklmnopqrstuvxyz'
	while (true){
        for (var a=0; a<idLength; a++){
            id += hex[Math.floor(Math.random()*16)]
        }
		if (!Object.keys(users).includes(id)){
			return (id)
		}
	}
}

export function joinLobby(mySocket,myLobbyId){
    const userId = makeId()
    users[userId] = {
        lobbyId: myLobbyId,
        socket: mySocket
    }
    sockets[mySocket.id] = userId
    // console.log('join',users)
    lobby.joinLobby(userId,myLobbyId)
}

export function leaveLobby(socket){
    if(Object.keys(sockets).includes(socket.id)){
        var userId = sockets[socket.id]
        lobby.leaveLobby(userId,users[userId].lobbyId)
        delete sockets[socket.id]
        delete users[userId]
        // console.log('delete',users)
    }
}

export default{
    joinLobby: joinLobby,
    leaveLobby: leaveLobby
}