'use strict'
import cookie from '/modules/cookies.js'
const socket = io()

function joinLobby(){
    const lobbyId = window.location.href.split('a=')[1]
    socket.emit('joinLobby',lobbyId)
}
joinLobby()

function chooseName(){
    socket.emit('nameUpdate',userNameInput.value)
    nameError.style.display = 'none'
}
window.chooseName = chooseName

function readyChange(){
    socket.emit('readyChange')
}
window.readyChange = readyChange

function newChat(msg){
    var atBot = 0
	if (chatLog.scrollHeight - chatLog.scrollTop - chatLogContainer.clientHeight < 25){
		atBot = 1
    }
    var newChat = document.createElement('p')
    newChat.innerHTML = msg
    chatLog.appendChild(newChat)
	if (atBot == 1){
		chatLog.scrollTop = chatLog.scrollHeight - chatLogContainer.clientHeight
	}
}

function uOwner(games,currGame){
    for(var game of games){
        var gameOption = document.createElement('option')
        gameOption.innerHTML = game
        gameOption.value = game
        gameInfoP.style.display = 'none'
        gameName.appendChild(gameOption)
    }
    if(currGame){
        gameNameBlank.style.display = 'none'
        gameName.value = game
    }
    gameInfoSelect.style.display = 'block'
}

function gameChange(){
    gameNameBlank.style.display = 'none'
    socket.emit('gameChange',gameName.value)
}
window.gameChange = gameChange

function updateGame(game){
    if(game){
        readyButton.style.display = 'block'
        gameInfoP.innerHTML = 'selected game: ' + game
    }
}

function redirect(extra){
    window.location.href = window.location.href.split('lobby/')[0] + extra
}

window.addEventListener('keypress', (a)=>{
    if(document.activeElement.id == 'myMsgInput' && myMsgInput.value && a.key == 'Enter'){
        socket.emit('newChat',myMsgInput.value)
        myMsgInput.value = ''
        chatError.style.display ='none'
    }
})

// SOCKET.ON

socket.on('newOwner', (games,game)=>{
    uOwner(games,game)
})

socket.on('playerUpdate', (text)=>{
    playerListDiv.innerHTML = text
})

socket.on('nameUpdate', (userName) =>{
    nameTitle.innerHTML = 'and you are ' + userName
    userNameInput.value = ''
})

socket.on('lobbyUpdate', (lobbyId) => {
    lobbyTitle.innerHTML = 'lobby ' + lobbyId
})

socket.on('newCookie', (userId) =>{
    const url = window.location.href
    const lobbyId = url.substring(url.lastIndexOf('a=')+2)
    cookie.set('userId',userId,lobbyId)
})

socket.on('redirect', (url)=>{
    redirect(url)
})

socket.on('gameUpdate', (game)=>{
    updateGame(game)
})

socket.on('lobbyError', (a)=>{
    const url = window.location.href.split('/?')[0]
    window.location.href = url + a
})

socket.on('nameError', (err) =>{
    nameError.innerHTML = err
    nameError.style.display = 'block'
})

socket.on('newChat', (msg)=>{
    newChat(msg)
})

socket.on('chatError', (err)=>{
    document.getElementById('chatError').innerHTML = err
    chatError.style.display ='block'
})
