'use strict'
// Dependencies
import express from 'express'
import { createServer } from "http"
import { Server } from "socket.io"
import LobbyManager from './modules/lobbyManager.js'

var app = express()
var server = createServer(app)
const io = new Server(server)
const PORT = 5000

const lobbyManager = new LobbyManager(io)

// Static folder is accessible to client
app.use('/', express.static('static'))

// Listen to requests
server.listen(PORT)

