'use strict'
import cookie from '/modules/cookies.js'
const socket = io();

function joinLobby(){
    const url = window.location.href
    const lobbyId = url.substring(url.lastIndexOf('a=')+2)
    socket.emit('joinLobby',lobbyId)
}
joinLobby()

function chooseName(){
    const userName = document.getElementById('userNameInput').value
    socket.emit('nameUpdate',userName)
}
window.chooseName = chooseName

socket.on('newCookie', (userId) =>{
    const url = window.location.href
    const lobbyId = url.substring(url.lastIndexOf('a=')+2)
    cookie.set('userId',userId,lobbyId)
})

socket.on('lobbyUpdate', (lobbyId) => {
    const lobbyTitle = document.getElementById('lobbyTitle')
    lobbyTitle.innerHTML = 'lobby ' + lobbyId
})

socket.on('nameUpdate', (userName) =>{
    const nameTitle = document.getElementById('nameTitle')
    nameTitle.innerHTML = 'and you are ' + userName
})

socket.on('nameError', (err) =>{
    const nameError = document.getElementById('nameError')
    nameError.innerHTML = err
})

// socket.on('chatMsg', function(name,msg,colorCode){
// 	// if near bottom of chat, scroll to bot if new message, calculate before adding msg
// 	var atBot = 0
// 	if (chatLog.scrollHeight - chatLog.scrollTop - chatLogContainer.clientHeight < 25){
// 		atBot = 1
// 	}
// 	var chatMsg = document.createElement('p')
// 	chatMsg.innerHTML = name + ': ' + msg
// 	chatMsg.style.color = colorCode
// 	chatMsg.classList.add('chatMsgClass')
// 	chatMsg.id = chatMsgCount
// 	chatLog.appendChild(chatMsg)
// 	chatMsgCount += 1
// 	if (atBot == 1){
// 		chatLog.scrollTop = chatLog.scrollHeight - chatLogContainer.clientHeight
// 	}
// })