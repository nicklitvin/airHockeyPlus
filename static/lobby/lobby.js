'use strict'
import cookie from '/modules/cookies.js'
const socket = io()

//TEMPORARY
joinLobby()
gameChange()
teamChange()
// readyChange()

function joinLobby(){
    const lobbyId = window.location.href.split('a=')[1]
    const userId = cookie.get('userId')
    socket.emit('joinLobby',lobbyId,userId)
}
// joinLobby()

function chooseName(){
    socket.emit('nameUpdate',userNameInput.value)
    nameError.style.display = 'none'
}
window.chooseName = chooseName

function readyChange(){
    teamSelectError.innerHTML = ''
    socket.emit('readyChange')
}
window.readyChange = readyChange

function teamChange(){
    teamSelectError.innerHTML = ''
    socket.emit('joinTeam','orange')
    // socket.emit('joinTeam',teamSelect.value)
    teamOptionBlank.style.display = 'none'
}
window.teamChange = teamChange

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
        gameName.value = currGame
    }
    gameInfoSelect.style.display = 'block'
}

function gameChange(){
    gameNameBlank.style.display = 'none'
    socket.emit('gameChange','game1')
    // socket.emit('gameChange',gameName.value)
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

function newTeamChoices(choices){
    deleteTeamChoices()
    addTeamChoices(choices)
}

function deleteTeamChoices(){
    //delete by queryselectorall by class
}

function addTeamChoices(choices){
    for(var choice of choices){
        var teamOption = document.createElement('option')
        teamOption.innerHTML = choice
        teamOption.value = choice
        teamOption.style.display = 'block'
        teamSelect.appendChild(teamOption)
    }
}

function deletePlayerList(){
    const playerList = document.getElementById('playerListDiv').querySelectorAll('.playerListClass')
    for(var id of playerList){
        id.remove()
    }
}

function makePlayerList(txt){
    deletePlayerList()

    for(var i=0; i<txt.length-1; i++){
        var line = document.createElement('p')
        line.innerHTML = txt[i] 
        line.style.color = txt[i+1]
        line.classList.add('playerListClass')
        playerListDiv.appendChild(line)
        i += 1
    }
}

window.addEventListener('keypress', (a)=>{
    if(document.activeElement.id == 'myMsgInput' && myMsgInput.value && a.key == 'Enter'){
        socket.emit('newChat',myMsgInput.value)
        myMsgInput.value = ''
        chatError.style.display ='none'
    }
})

// SOCKET.ON

socket.on('forceColor', (txt)=>{
    teamSelectError.innerHTML = txt
})

socket.on('noTeamSelected', (txt)=>{
    teamSelectError.innerHTML = txt
})

socket.on('teamOptions', (choices)=>{
    newTeamChoices(choices)
})

socket.on('deleteCookie', ()=>{
    cookie.set('userId','')
})

socket.on('newOwner', (games,game)=>{
    uOwner(games,game)
})

socket.on('playerUpdate', (txt)=>{
    makePlayerList(txt)
})

socket.on('nameUpdate', (userName) =>{
    nameTitle.innerHTML = 'and you are ' + userName
    userNameInput.value = ''
})

socket.on('lobbyUpdate', (lobbyId) => {
    lobbyTitle.innerHTML = 'lobby ' + lobbyId
})

socket.on('newCookie', (userId) =>{
    cookie.set('userId',userId)
})

socket.on('redirect', (url)=>{
    redirect(url)
})

socket.on('gameUpdate', (game)=>{
    updateGame(game)
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
