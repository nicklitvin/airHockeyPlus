'use strict'
export default class RoomControl{
    constructor(io,gameControl,lobbies,users,socks,gameLib){
        this.gameControl = gameControl
        this.lobbies = lobbies
        this.users = users
        this.socks = socks
        this.gameLib = gameLib
        this.timerChoices = ['1min','3min','5min']
        this.teamChoices = ['orange','blue']

        io.on('connection', (socket)=>{
            socket.on('joinGame', (userId,lobbyId,gameId)=>{
                this.joinGame(socket,userId,lobbyId,gameId)
            })
            socket.on('disconnect', () => {
                this.disconnect(socket)
            })
            socket.on('readyChange', ()=>{
                this.readyChange(socket)
            })
            socket.on('gameChange', (game)=>{
                this.gameChange(socket,game)
            })
            socket.on('newChat', (chat)=>{
                this.newChat(socket,chat)
            })
            socket.on('nameUpdate', (userName) =>{
                this.updateName(socket,userName)
            })
            socket.on('joinLobby', (lobbyId,userId) =>{
                this.joinLobby(socket,lobbyId,userId)
            })
            socket.on('createLobby', () => {
                this.createLobby(socket)
            })
            socket.on('joinTeam', (team)=>{
                this.joinTeam(socket,team)
            })
            socket.on('changeGameTimer', (gameTimer)=>{
                this.changeGameTime(socket,gameTimer)
            })
            socket.on('returnFromGame', (userId)=>{
                this.returnFromGame(userId)
            })
        })
    }

    // UPDATE STATUS

    changeGameTime(socket,gameTimer){
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        const lobby = this.lobbies.getInfo(user.lobbyId)
        
        if(lobby.owner != userId){
            return
        }
        
        lobby.gameTimer = gameTimer
        this.sendGameTimeChange(lobby)
    }

    sendGameTimeChange(lobby){
        const timer = lobby.gameTimer
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            if(user.inGame){
                continue
            }
            const socket = user.socket
            this.socks.timerUpdate(socket,timer)
        }
    }

    joinTeam(socket,team){
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        const lobby = this.lobbies.getInfo(user.lobbyId)

        if(!lobby.teams.includes(team)){
            return
        }
        //cant change color if ready
        if(user.ready){
            this.socks.forceColor(user)
            return
        }
        //change to team
        if(user.team != team){
            user.team = team
        }
        this.updatePlayerList(lobby)
    }

    updateUserGameInfo(userId,lobby,socket){
        const user = this.users.getInfo(userId)
        user.socket = socket
        user.inGame = 1
        this.socks.newSock(socket.id,userId)

        if(lobby.owner == userId){
            user.socket.emit('stopGamePower')
        }
    }

    joinGame(socket,userId,lobbyId,gameId){
        if(!this.lobbies.doesLobbyExist(lobbyId)){
            this.socks.errorPage(socket)
            return
        }

        const lobby = this.lobbies.getInfo(lobbyId)
        if(!lobby.inGame){
            this.socks.toLobby(socket,lobby,socket)
            return
        }

        if(lobby.userIds.includes(userId)){
            if(lobby.game == 'game' + gameId){
                this.updateUserGameInfo(userId,lobby,socket)
            }
            // wrong game but correct room
            else{
                this.socks.toGame(socket,lobby)
            }
        }
        else{
            this.socks.errorPage(socket)
        }
    }

    startGame(lobby){
        if(lobby.game){
            lobby.inGame = 1
            this.gameControl.newGame(lobby)

            for(var userId of lobby.userIds){
                const user = this.users.getInfo(userId)
                const socket = user.socket
                this.socks.sendCookie(socket,userId)
                this.socks.toGame(socket,lobby)
            }
        }
    }

    // continue func check here
    sendGameChange(lobby){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            if(user.inGame){
                continue
            }
            const socket = user.socket
            this.socks.gameUpdate(socket,lobby.game)
        }
    }

    gameChange(socket,game){
        if(this.gameLib.getNames().includes(game)){
            const userId = this.socks.getUserId(socket.id)
            if(!userId){
                return
            }
            const lobbyId = this.users.getInfo(userId).lobbyId
            if(!lobbyId){
                return
            }
            const lobby = this.lobbies.getInfo(lobbyId)
            if(lobby.owner != userId){
                return
            }
            
            this.unreadyUsers(lobby)
            lobby.game = game
            this.sendGameChange(lobby)
        }
    }

    unreadyUsers(lobby){
        for(var userId of lobby.userIds){
            this.users.getInfo(userId).ready = 0
        }
        this.updatePlayerList(lobby)
    }

    allReadyCheck(lobby){
        for(var userId of lobby.userIds){
            if(!this.users.getInfo(userId).ready){
                return
            }
        }
        this.startGame(lobby) 
    }

    readyChange(socket){
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const lobby = this.lobbies.getInfo(lobbyId)
        const user = this.users.getInfo(userId)

        if(!lobby.game){
            console.log('noGame')
        }
        else if(!user.team){
            this.socks.noTeamSelected(user.socket)
        }
        else if(user.ready){
            user.ready = 0
        }
        else{
            user.ready = 1
        }
        
        this.updatePlayerList(lobby)
        if(user.ready){
            this.allReadyCheck(lobby)
        }
    }

    updatePlayerList(lobby){
        const text = this.makeLobbyText(lobby)
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            if(user.inGame){
                continue
            }
            const socket = user.socket
            this.socks.playerUpdate(socket,text)
        }
    }

    makeLobbyText(lobby){
        var text = ['players: <br>','black']
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)

            var lineText = `${user.userName}`
            if(user.ready){
                lineText += ' (✓)'
            }
            else{
                lineText += ' (X)'
            }
            if(lobby.owner == userId){
                lineText += ' [party leader]'
            }
            if(user.inGame){
                lineText += '[not returned]'
            }
            lineText += '<br>'
            text.push(lineText)

            if(user.team){
                text.push(user.team)
            }
            else{
                text.push('black')
            }
        }
        return(text)
    }
    
    updateName(socket,userName){
        if(userName.length==0 || userName.length>12){
            this.socks.nameError(socket)
            return
        }
        for(var a in userName){
            var code = userName.charCodeAt(a)
            if((code < 48) || (code < 65 && code > 57) || (code > 122)){
                this.socks.nameError(socket)
                return
            }
        }
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const lobby = this.lobbies.getInfo(lobbyId)
        const nameChanged = this.users.changeName(lobby.userIds,userId,userName)

        if(nameChanged){
            this.socks.nameUpdate(socket,userName)
            this.updatePlayerList(lobby)
        }
        else{
            this.socks.nameTaken(socket)
        }
    }

    newChat(socket,chat){
        if(chat.length == 0 || chat.length >500){
            this.socks.chatError(socket)
        }
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        const userIds = this.lobbies.getInfo(user.lobbyId).userIds

        chat = user.userName +': ' + chat
        for(var userId1 of userIds){
            const user1 = this.users.getInfo(userId1)
            if(user1.inGame){
                continue
            }
            const socket1 = user1.socket
            this.socks.newChat(socket1,chat)
        }
    }

    // JOIN/LEAVE

    returnFromGame(userId){
        const user = this.users.getInfo(userId)
        if(!this.lobbies.doesLobbyExist(user.lobbyId)){
            this.socks.errorPage(user.socket)
        }
        const lobby = this.lobbies.getInfo(user.lobbyId)
        if(!lobby.userIds.includes(userId)){
            this.socks.errorPage(user.socket)
        }
        lobby.awaitingUsers.push(userId)
        this.socks.toLobby(user.socket,lobby)
    }

    giveOwnerView(lobby){
        const allGames = this.gameLib.getNames()
        const socket = this.users.getInfo(lobby.owner).socket
        this.socks.newOwner(
            socket,
            allGames,
            lobby.game,
            lobby.gameTimer,
            this.timerChoices
        )
    }

    returningUser(socket,lobby,userId){
        const user = this.users.getInfo(userId)
        user.inGame = 0
        user.socket = socket

        var awaitingUsers = lobby.awaitingUsers
        for(var a in awaitingUsers){
            if(awaitingUsers[a] == userId){
                awaitingUsers.splice(a,1)
            }
        }

        if(lobby.owner == userId){
            this.giveOwnerView(lobby)
        }

        this.socks.joinLobby(user,lobby)
        this.socks.deleteCookie(socket)
        this.updatePlayerList(lobby)
    }

    addUser(socket,lobby){
        const user = this.users.newUser(socket,lobby)

        this.socks.deleteCookie(user.socket)
        this.socks.joinLobby(user,lobby)
        lobby.userIds.push(user.userId)

        if(!lobby.owner){
            lobby.owner = user.userId
            this.giveOwnerView(lobby)
        }

        this.updatePlayerList(lobby)
    }

    isLobbyOpen(lobbyId){
        const exist = this.lobbies.doesLobbyExist(lobbyId)
        if(exist){
            if(!this.lobbies.getInfo(lobbyId).inGame){
                return(1)
            }
        }
    }

    allReturnedCheck(lobby){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            if(user.inGame){
                return
            }
        }
        this.gameControl.deleteGame(lobby)
    }

    joinLobby(socket,lobbyId,userId){
        if(this.isLobbyOpen(lobbyId)){
            const lobby = this.lobbies.getInfo(lobbyId)
            
            //returning user
            if(userId && lobby.userIds.includes(userId)){
                this.returningUser(socket,lobby,userId)
                this.allReturnedCheck(lobby)
            }
            //new user
            else{
                this.addUser(socket,lobby)
            }
        }
        else{
            this.socks.errorPage(socket)
        }
    }

    createLobby(socket=0){
        const lobby = this.lobbies.newLobby()
        lobby.gameTimer = this.timerChoices[0]
        lobby.game = this.gameLib.getNames()[0]
        lobby.teams = this.teamChoices

        if(socket){
            this.socks.toLobby(socket,lobby)
        }
    }

    disconnect(socket){
        const userId = this.socks.getUserId(socket.id)
        if(userId){
            const user = this.users.getInfo(userId)
            const lobby = this.lobbies.getInfo(user.lobbyId)
            this.socks.deleteSock(socket.id)

            // disconnecting while gaming
            if(lobby.inGame && user.inGame){
                user.inGame = 0
                this.isAllDisconnected(lobby)
            }
            // disconnecting while no gaming
            else if(!lobby.inGame && !lobby.awaitingUsers.includes(userId)){
                this.deleteRoomUser(user,lobby)
            }
        }
    }

    isAllDisconnected(lobby){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            if(user.inGame){
                return
            }
        }
        this.deleteGameRoom(lobby)
    }

    deleteGameRoom(lobby){
        for(var userId of lobby.userIds){
            const user = this.users.getInfo(userId)
            this.users.deleteUser(user)
        }
        this.lobbies.deleteLobby(lobby)
        this.gameControl.deleteGame(lobby)
    }

    deleteRoomUser(user,lobby){
        for(var a in lobby.userIds){
            if(lobby.userIds[a] == user.userId){
                lobby.userIds.splice(a,1)
            }
        }
        if(lobby.userIds.length == 0){
            this.lobbies.deleteLobby(lobby)
            return
        }
        if(lobby.owner == user.userId){
            lobby.owner = lobby.userIds[0]
            this.giveOwnerView(lobby)
        }

        this.users.deleteUser(user)
        this.updatePlayerList(lobby)
        this.allReadyCheck(lobby)
    }
}
