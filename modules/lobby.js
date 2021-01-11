'use strict'

import sock from "./sock.js"

var lobbies = {}
const idLength = 1

function makeId(){
    var id = ''
    var hex = '0123456789abcdef'
	while (true){
        for (var a=0; a<idLength; a++){
            id += hex[Math.floor(Math.random()*16)]
        }
		if (!Object.keys(lobbies).includes(id)){
			return (id)
		}
	}
}

export function createLobby(socket){
    const lobbyId = makeId()
    lobbies[lobbyId] = {
        users: []
    }
    // console.log('newLobby',lobbies)
    sock.toLobby(socket,lobbyId)
}

export function removeLobby(lobbyId){
    if(lobbies[lobbyId].users.length == 0){
        delete lobbies[lobbyId]
        // console.log('deleteLobby',lobbies)
    }
}

export function joinLobby(userId,lobbyId){
    lobbies[lobbyId].users.push(userId)
    // console.log('joined',lobbies)
}

export function leaveLobby(userId,lobbyId){
    for(var a in lobbies[lobbyId].users){
        if (lobbies[lobbyId].users[a] == userId){
            lobbies[lobbyId].users.splice(a,1)
            // console.log('leaveLobby',lobbies)
        }
    }
    removeLobby(lobbyId)
}

export default {
    createLobby: createLobby,
    removeLobby: removeLobby,
    joinLobby: joinLobby,
    leaveLobby: leaveLobby
}