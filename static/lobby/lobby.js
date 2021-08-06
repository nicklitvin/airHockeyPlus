'use strict'
import cookie from '/modules/cookies.js'
const socket = io()

//TEMPORARY
// joinLobby()
// changeGame()
// changeTeam()
// changeReady()

function joinLobby(){
    const lobbyId = window.location.href.split('a=')[1]
    const userId = cookie.get('userId')
    socket.emit('joinLobby',lobbyId,userId)
}
joinLobby()

function chooseName(){
    socket.emit('nameUpdate',userNameInput.value)
    nameError.style.display = 'none'
}
window.chooseName = chooseName

function changeReady(){
    teamSelectError.innerHTML = ''
    socket.emit('readyChange')
}
window.changeReady = changeReady

function changeTeam(){
    teamSelectError.innerHTML = ''
    // socket.emit('joinTeam','orange')
    socket.emit('joinTeam',teamSelect.value)
    teamOptionBlank.style.display = 'none'
}
window.changeTeam = changeTeam

function changeGame(){
    // gameNameBlank.style.display = 'none'
    // socket.emit('gameChange','game1')
    socket.emit('gameChange',gameName.value)
}
window.changeGame = changeGame

function changeGameTimer(){
    const myTimer = gameTimer.value
    socket.emit('changeGameTimer',myTimer)
}
window.changeGameTimer = changeGameTimer

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

function showGameOptions(games,currGame){
    for(var game of games){
        var gameOption = document.createElement('option')
        gameOption.innerHTML = game
        gameOption.value = game
        gameNameP.style.display = 'none'
        gameName.appendChild(gameOption)
    }
    if(currGame){
        // gameNameBlank.style.display = 'none'
        gameName.value = currGame
    }
}

function showTimerOptions(currTimer,timers){
    for(var timer of timers){
        var timerOption = document.createElement('option')
        timerOption.innerHTML = timer
        timerOption.value = timer
        gameTimerP.style.display = 'none'
        gameTimer.appendChild(timerOption)
    }
    if(currTimer){
        gameTimer.value = currTimer
    }
}

function updateGame(game){
    if(game){
        readyButton.style.display = 'block'
        gameNameP.innerHTML = 'selected game: ' + game
    }
}

function updateTimer(timer){
    if(timer){
        gameTimerP.innerHTML = 'game time: ' + timer 
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

socket.on('forceTeam', (team,txt)=>{
    teamSelect.value = team
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

socket.on('newOwner', (games,game,currTimer,timers)=>{
    showGameOptions(games,game)
    showTimerOptions(currTimer,timers)
    gameSettingsDiv.style.display = 'block'
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

socket.on('gameUpdate', (game)=>{
    updateGame(game)
})

socket.on('timerUpdate', (timer)=>{
    updateTimer(timer)
})

socket.on('newCookie', (userId) =>{
    cookie.set('userId',userId)
})

socket.on('redirect', (url)=>{
    redirect(url)
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

socket.on('oldColor',(team)=>{
    teamOptionBlank.style.display = 'none'
    teamSelect.value = team
})

// SETTINGS SELECTION

socket.on('personalGameSettings', (settings)=>{
    setPersonalGameSettings(settings)
})

function setPersonalGameSettings(settings){
    for(var settingName of Object.keys(settings)){
        const setting = settings[settingName]

        const label = makeSettingLabel(setting,settingName)
        const selector = makeSettingSelector(setting,settingName)
        
        selector.onchange = sendNewPersonalSettings
        
        var blank = document.createElement('br')

        personalGameSettings.appendChild(label)
        personalGameSettings.appendChild(selector)
        personalGameSettings.appendChild(blank)
    }
}

function sendNewPersonalSettings(){
    const selector = document.activeElement
    socket.emit('newPersonalGameSetting',selector.id,selector.value)
}

socket.on('generalGameSettingsOwner', (settings)=>{
    generalGameSettings.innerHTML = ''
    setGeneralGameSettingsOwnerView(settings)
})

function setGeneralGameSettingsOwnerView(settings){
    for(var settingName of Object.keys(settings)){
        const setting = settings[settingName]

        const label = makeSettingLabel(setting,settingName)
        const selector = makeSettingSelector(setting,settingName)

        selector.onchange = sendNewGeneralSettings
        
        var blank = document.createElement('br')

        generalGameSettings.appendChild(label)
        generalGameSettings.appendChild(selector)
        generalGameSettings.appendChild(blank)
    }
}

function sendNewGeneralSettings(){
    const selector = document.activeElement
    socket.emit('newGeneralGameSetting',selector.id,selector.value)
}

socket.on('generalGameSettingsText', (text)=>{
    console.log(text)
    setGeneralGameSettingsText(text)
})

function setGeneralGameSettingsText(text){
    generalGameSettings.innerHTML = text
}

function makeSettingLabel(setting,settingName){
    var label = document.createElement('label')
    label.setAttribute("for",settingName)
    label.innerHTML = setting.title
    return(label)
}

function makeSettingSelector(setting,settingName){
    var selector = document.createElement('select')
    selector.id = settingName

    for(var option of setting.options){
        var choice = document.createElement('option')
        choice.innerHTML = option
        choice.value = option
        selector.appendChild(choice)
    }
    return(selector)
}


