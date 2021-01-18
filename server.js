'use strict'

// Dependencies
import express from 'express'
import { createServer } from "http"
import path from 'path'
import { Server } from "socket.io"
import LobbyManager from './modules/lobby.js'
import SockManager from './modules/sock.js'
import UserManager from './modules/users.js'

var app = express()
var server = createServer(app)
const io = new Server(server)
const __dirname = path.resolve()
const lobbies = new LobbyManager()
const users = new UserManager()
const socks = new SockManager()

// Static folder is accessible to client
app.use('/',express.static(path.join(__dirname, 'static')))

// send index.html to user
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'static', 'index.html'))
})

// Listen to requests
server.listen(5000, function() {})

function updateRoom(lobbyId,userIds=0){
    if(!userIds){
        userIds = lobbies.getUserIds(lobbyId)
    }
    var lobbyOwner = lobbies.getOwner(lobbyId)
    var text = 'players: <br>'
    for(var a of userIds){
        if(a == lobbyOwner){
            text += users.getName(a) + ' [party leader] <br>'
        }
        else{
            text += users.getName(a) + ' <br>'
        }
    }
    for(var a of userIds){
        const socket = users.getSocket(a)
        socks.playerUpdate(socket,text)
    }
}

//SOCKET.ON
io.on('connection', function(socket){
    socket.on('disconnect', () => {
        var userId = socks.deleteSock(socket.id)
        if (userId){
            var lobbyId = users.deleteUser(userId)
            //if room not deleted
            if(!lobbies.leaveLobby(userId,lobbyId)){
                if(lobbies.getOwner(lobbyId)==userId){
                    lobbies.newOwner(lobbyId)
                }
                updateRoom(lobbyId)
            }
        }
    })

    socket.on('createLobby', () => {
        var lobbyId = lobbies.newLobby()
        socks.toLobby(socket,lobbyId)
    })

    socket.on('joinLobby', (lobbyId) =>{
        let newOwner
        const userIds = lobbies.getUserIds(lobbyId)
        if(userIds.length == 0){
            newOwner = 1
        }
        const user = users.newUser(socket,lobbyId,userIds)
        socks.newSock(user)
        lobbies.joinLobby(user)
        if(newOwner){
            lobbies.newOwner(lobbyId)
        }
        updateRoom(lobbyId)
    })

    socket.on('nameUpdate', (userName) =>{
        if(userName.length==0 || userName.length>12){
            socks.nameError(socket)
            return
        }
        const userId = socks.getUserId(socket.id)
        const lobbyId = users.getLobbyId(userId)
        const userIds = lobbies.getUserIds(lobbyId)
        const nameChange = users.changeName(userIds,userId,userName)
        if(nameChange){
            socks.nameUpdate(socket,userName)
            updateRoom(lobbyId)
        }
        else{
            socks.nameTaken(socket)
        }
    })

    socket.on('newChat', (chat)=>{
        if(chat.length == 0 || chat.length >500){
            socks.chatError(socket)
        }
        const userId = socks.getUserId(socket.id)
        const lobbyId = users.getLobbyId(userId)
        const userIds = lobbies.getUserIds(lobbyId)
        chat = users.getName(userId) +': ' + chat
        for(var a of userIds){
            const socket = users.getSocket(a)
            socks.newChat(socket,chat)
        }
    })
})
