'use strict'

// Dependencies
import express from 'express'
import { createServer } from "http"
import path from 'path'
import { Server } from "socket.io"
import lobby from './modules/lobby.js'
import users from './modules/users.js'

var app = express()
var server = createServer(app)
var io = new Server(server)
const __dirname = path.resolve()

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
        users.leaveLobby(socket)
    })
    socket.on('createLobby', () => {
        lobby.createLobby(socket)
    })
    socket.on('joinLobby', (lobbyId) =>{
        users.joinLobby(socket,lobbyId)
    })
})
