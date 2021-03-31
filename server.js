// Dependencies
import express from 'express'
import { createServer } from "http"
import path from 'path'
import { Server } from "socket.io"
import MainControl from './modules/mainControl.js'

var app = express()
var server = createServer(app)
const io = new Server(server)
const __dirname = path.resolve()
const control = new MainControl(io)

// Static folder is accessible to client
app.use('/',express.static(path.join(__dirname, 'static')))

// send index.html to user
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'static', 'index.html'))
})

// Listen to requests
server.listen(5000, function() {})

//runGame
setInterval(() => {
    control.runGame1()
}, 1000/90)
