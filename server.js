'use strict'

// Dependencies
import express from 'express'
import { createServer } from "http"
import path from 'path'
import { Server } from "socket.io"
import db from './modules/db.js'

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
        db.removeUser(socket)
    })
    socket.on('createLobby', () => {
        db.newLobby(socket)
    })
})
