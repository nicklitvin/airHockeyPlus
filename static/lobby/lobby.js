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
    personalGameSettingsError.innerHTML = ''
    socket.emit('readyChange')
}
window.changeReady = changeReady

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

function redirect(extra){
    window.location.href = window.location.href.split('lobby/')[0] + extra
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

function deletePlayerList(){
    const playerList = document.getElementById('playerListDiv').querySelectorAll('.playerListClass')
    for(var id of playerList){
        id.remove()
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

socket.on('deleteCookie', ()=>{
    cookie.set('userId','')
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

// SETTINGS SELECTION

socket.on('personalGameSettings', (settings)=>{
    personalGameSettings.innerHTML = ''
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
    personalGameSettingsError.innerHTML = null
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
    selector.value = setting.chosen
    return(selector)
}

socket.on('personalGameSettingsError', (txt)=>{
    personalGameSettingsError.innerHTML = txt
})


