'use strict'

// Dependencies
import express from 'express'
import { createServer } from "http"
import path from 'path'
import { Server } from "socket.io"
import RoomControl from './modules/roomControl.js'

var app = express()
var server = createServer(app)
const io = new Server(server)
const __dirname = path.resolve()
const room = new RoomControl()

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
        room.disconnect(socket)
    })

    socket.on('readyChange', ()=>{
        room.readyChange(socket)
    })
    
    socket.on('gameChange', (game)=>{
        room.gameChange(socket,game)
    })
    
    socket.on('newChat', (chat)=>{
        room.newChat(socket,chat)
    })

    socket.on('nameUpdate', (userName) =>{
        room.updateName(socket,userName)
    })

    socket.on('joinLobby', (lobbyId) =>{
        room.joinLobby(socket,lobbyId)
    })
    
    socket.on('createLobby', () => {
        room.createLobby(socket)
    })
})
