'use strict'

// Dependencies
import express from 'express'
import { createServer } from "http"
import path from 'path'
import { Server } from "socket.io"
import lobbyManager from './modules/lobby.js'
import userManager from './modules/users.js'
import sock from './modules/sock.js'

var app = express()
var server = createServer(app)
const io = new Server(server)
const __dirname = path.resolve()
const lobbies = new lobbyManager()
const users = new userManager()

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
        var dic = users.leaveLobby(socket)
        if(dic){
            lobbies.leaveLobby(dic.userId,dic.lobbyId)
        }
    })

    socket.on('createLobby', () => {
        const lobbyId = lobbies.createLobby()
        sock.toLobby(socket,lobbyId)
    })

    socket.on('joinLobby', (lobbyId) =>{
        var dic = users.joinLobby(socket,lobbyId)
        lobbies.joinLobby(dic.userId,dic.lobbyId)
    })
})
