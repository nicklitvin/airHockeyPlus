'use strict'
export default class RoomControl{
    constructor(io,gameControl,lobbies,users,socks,gameLib){
        this.gameControl = gameControl
        this.lobbies = lobbies
        this.users = users
        this.socks = socks
        this.gameLib = gameLib

        io.on('connection', (socket)=>{
            socket.on('endGame', ()=>{
                this.endGame(socket)
            })
            socket.on('joinGame', (userId,lobbyId)=>{
                this.joinGame(socket,userId,lobbyId)
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
        })
    }

    //TEMPORARY
    endGame(socket){
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const lobby = this.lobbies.getInfo(lobbyId)
        
        for(var userId1 of lobby.userIds){
            const socket1 = this.users.getInfo(userId1).socket
            this.users.getInfo(userId1).ready = 0
            this.socks.toLobby(socket1,lobbyId)
        }
        lobby.inGame = 0
    }       

    isTeamReal(lobbyId,team){
        if(this.lobbies.getInfo(lobbyId).teams.includes(team)){
            return(1)
        }
    }

    joinTeam(socket,team){
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        if(!this.isTeamReal(user.lobbyId,team)){
            return
        }
        //cant change color if ready
        if(user.ready){
            this.socks.forceColor(user.socket,user.team)
            return
        }
        if(user.team != team){
            user.team = team
        }
        this.updatePlayerList(user.lobbyId)
    }

    joinGame(socket,userId,lobbyId){
        if(!this.lobbies.lobbyExist(lobbyId)){
            return
        }
        if(this.lobbies.getInfo(lobbyId).userIds.includes(userId)){
            const user = this.users.getInfo(userId)
            user.socket = socket
            this.socks.newSock(socket.id,userId)
            return
        }
        this.socks.errorPage(socket)
    }

    startGame(lobbyId){
        const lobby = this.lobbies.getInfo(lobbyId)

        if(lobby.game){
            this.lobbies.getInfo(lobbyId).inGame = 1
            // this.gameControl.newGame(lobbyId,lobby.userIds,lobby.teams)
            this.gameControl.newGame(lobby)
            for(var userId of lobby.userIds){
                const socket = this.users.getInfo(userId).socket
                this.users.getInfo(userId).inGame = 1
                this.socks.sendCookie(socket,userId)
                this.socks.toGame(socket,lobby.game,lobbyId)
            }
        }
    }

    sendGameChange(lobbyId,game){
        const userIds = this.lobbies.getInfo(lobbyId).userIds
        for(var userId of userIds){
            const socket = this.users.getInfo(userId).socket
            this.socks.gameUpdate(socket,game)
        }
    }

    gameChange(socket,game){
        if(this.gameLib.getNames().includes(game)){
            const userId = this.socks.getUserId(socket.id)
            const lobbyId = this.users.getInfo(userId).lobbyId
            
            this.unreadyUsers(lobbyId)
            this.lobbies.getInfo(lobbyId).game = game
            this.sendGameChange(lobbyId,game)
        }
        else{
            // console.log('gameChangeError')
        }
    }

    unreadyUsers(lobbyId){
        const userIds = this.lobbies.getInfo(lobbyId).userIds
        for(var userId of userIds){
            this.users.getInfo(userId).ready = 0
        }
        this.updatePlayerList(lobbyId)
    }

    allReadyCheck(lobbyId){
        const userIds = this.lobbies.getInfo(lobbyId).userIds
        for(var userId of userIds){
            if(!this.users.getInfo(userId).ready){
                return
            }
        }
        this.startGame(lobbyId) 
    }

    readyChange(socket){
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getInfo(userId).lobbyId
        if(!this.lobbies.getInfo(lobbyId).game){
            return
        }

        const user = this.users.getInfo(userId)
        if(!user.team){
            this.socks.noTeamSelected(user.socket)
            return
        }

        const readyUp = this.users.readyChange(userId)
        this.updatePlayerList(lobbyId)
        if(readyUp){
            this.allReadyCheck(lobbyId)
        }
    }

    updatePlayerList(lobbyId){
        const text = this.makeLobbyText(lobbyId)
        const userIds = this.lobbies.getInfo(lobbyId).userIds
        for(var userId of userIds){
            const socket = this.users.getInfo(userId).socket
            this.socks.playerUpdate(socket,text)
        }
    }

    makeLobbyText(lobbyId){
        var text = ['players: <br>','black']
        const lobby = this.lobbies.getInfo(lobbyId)
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
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getInfo(userId).lobbyId
        const userIds = this.lobbies.getInfo(lobbyId).userIds
        const nameChanged = this.users.changeName(userIds,userId,userName)
        if(nameChanged){
            this.socks.nameUpdate(socket,userName)
            this.updatePlayerList(lobbyId)
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
        chat = user.name +': ' + chat
        for(var userId1 of userIds){
            const socket1 = this.users.getInfo(userId1).socket
            this.socks.newChat(socket1,chat)
        }
    }

    // JOIN/LEAVE

    ownerView(socket,lobbyId){
        const lobbyGame = this.lobbies.getInfo(lobbyId).game
        const allGames = this.gameLib.getNames()
        this.socks.newOwner(socket,allGames,lobbyGame)
    }

    returningUser(socket,lobbyId,userId){
        if(this.lobbies.getInfo(lobbyId).owner == userId){
            this.ownerView(socket,lobbyId)
        }

        const user = this.users.getInfo(userId)
        const lobby = this.lobbies.getInfo(lobbyId)

        user.socket = socket
        this.socks.joinLobby(user,lobby.game,lobby.teams)
        this.socks.deleteCookie(socket)
        this.updatePlayerList(lobbyId)
    }

    isNewOwner(socket,lobbyId){
        const lobby = this.lobbies.getInfo(lobbyId)
        if(lobby.userIds.length == 1){
            this.lobbies.findNewOwner(lobbyId)
            this.ownerView(socket,lobbyId)
        }
    }

    addUser(socket,lobbyId){
        const lobby = this.lobbies.getInfo(lobbyId)
        const user = this.users.newUser(socket,lobbyId,lobby.userIds)

        this.socks.deleteCookie(user.socket)
        this.socks.joinLobby(user,lobby.game,lobby.teams)
        lobby.userIds.push(user.userId)
        this.isNewOwner(user.socket,lobbyId)
        this.updatePlayerList(lobbyId)
    }

    canJoin(socket,lobbyId){
        const exist = this.lobbies.lobbyExist(lobbyId)
        if(!exist || this.lobbies.getInfo(lobbyId).gameBegun){
            this.socks.errorPage(socket)
            return
        }
        return(1)
    }

    joinLobby(socket,lobbyId,userId){
        if(this.canJoin(socket,lobbyId)){
            const lobby = this.lobbies.getInfo(lobbyId)
            //returning user
            if(userId && lobby.userIds.includes(userId)){
                this.returningUser(socket,lobbyId,userId)
            }
            //new user
            else{
                this.addUser(socket,lobbyId)
            }
        }
    }

    createLobby(socket=0){
        const lobbyId = this.lobbies.newLobby()
        if(socket){
            this.socks.toLobby(socket,lobbyId)
        }
    }

    disconnect(socket){
        const userId = this.socks.getUserId(socket.id)
        if(userId){
            const lobbyId = this.users.getInfo(userId).lobbyId
            this.socks.deleteSock(socket.id)
            //if ingame
            if(this.users.getInfo(userId).inGame){
                // console.log('leaving started game')
            }
            //if inlobby
            else{
                this.deleteUser(userId,lobbyId)
            }
        }
    }

    deleteUser(userId,lobbyId){
        const deleted = this.lobbies.leaveLobby(userId,lobbyId)
        this.users.deleteUser(userId)
        //make new owner if owner left
        if(!deleted && !this.lobbies.getInfo(lobbyId).owner){
            const newOwnerId = this.lobbies.findNewOwner(lobbyId)
            const socket = this.users.getInfo(newOwnerId).socket
            this.ownerView(socket,lobbyId)
        }
        //update playerList
        if(!deleted){
            this.updatePlayerList(lobbyId)
        }
    }
}
