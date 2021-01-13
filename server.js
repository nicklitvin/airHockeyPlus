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

//SOCKET.ON
io.on('connection', function(socket){
    socket.on('disconnect', () => {
        var userId = socks.deleteSock(socket.id)
        if (userId){
            var lobbyId = users.deleteUser(userId)
            lobbies.leaveLobby(userId,lobbyId)
        }
    })

    socket.on('createLobby', () => {
        var lobbyId = lobbies.newLobby()
        socks.toLobby(socket,lobbyId)
    })

    socket.on('joinLobby', (lobbyId) =>{
        var userId = users.newUser(socket,lobbyId)
        socks.newSock(socket.id,userId)
        lobbies.joinLobby(userId,lobbyId)
    })
})
