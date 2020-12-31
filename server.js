'use strict'

// Dependencies
import express from 'express'
import { createServer } from "http"
import path from 'path'
import { Server } from "socket.io"
import db from 'mariadb'

var app = express()
var server = createServer(app)
var io = new Server(server)
const mariadb = db
const __dirname = path.resolve()

// Static folder is accessible to client
app.use('/',express.static(path.join(__dirname, 'static')))

// send index.html to user
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'static', 'index.html'))
})

// Listen to requests
server.listen(5000, function() {})

// database pool for easy connection
const pool = mariadb.createPool({
     host: 'localhost', 
     user:'root', 
     password: 'password',
     database: 'gamedb',
     connectionLimit: 5
})

// FUNCTIONS

async function newUser(socket){
    var conn = await pool.getConnection()
    var command = 'insert into users values (\''+ socket.id + '\',\'null\',\'null\',\'null\')'
    conn.query(command)
    if(conn){conn.end()}
    console.log('newUser')
}

// SOCKET.ON

io.on('connection', function(socket){
    newUser(socket)
})