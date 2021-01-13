'use strict'
var socket = io();

function joinLobby(){
    var url = window.location.href
    var id = url.substring(url.lastIndexOf('a=')+2)
    socket.emit('joinLobby',id)
}
joinLobby()

function chooseName(){
    
}

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