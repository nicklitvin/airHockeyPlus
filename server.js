'use strict'
// Dependencies
import express from 'express'
import { createServer } from "http"
import { Server } from "socket.io"
import MainControl from './modules/mainControl.js'

var app = express()
var server = createServer(app)
const io = new Server(server)
const PORT = 5000

const refreshRate = 100
const control = new MainControl(io,refreshRate)

// Static folder is accessible to client
app.use('/', express.static('static'))

// Listen to requests
server.listen(PORT)
 
// runGame
setInterval(()=>{
    control.runGame1()
},1000/refreshRate)

// runGameTest
// control.runGame1Test()

//runRoomTest
// control.runRoomTest()
