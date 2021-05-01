'use strict'
export default class RoomControl{
    constructor(io,gameControl,lobbies,users,socks,gameLib){
        this.gameControl = gameControl
        this.lobbies = lobbies
        this.users = users
        this.socks = socks
        this.gameLib = gameLib

        io.on('connection', (socket)=>{
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

    joinTeam(socket,team){
        const userId = this.socks.getUserId(socket.id)
        const user = this.users.getInfo(userId)
        const lobby = this.lobbies.getInfo(user.lobbyId)

        if(!lobby.teams.includes(team)){
            return
        }
        //cant change color if ready
        if(user.ready){
            this.socks.forceColor(user.socket,user.team)
            return
        }
        //change to team
        if(user.team != team){
            user.team = team
        }
        this.updatePlayerList(lobby)
    }

    joinGame(socket,userId,lobbyId){
        if(!this.lobbies.doesLobbyExist(lobbyId)){
            return
        }
        const lobby = this.lobbies.getInfo(lobbyId)
        if(!lobby.inGame){
            this.socks.toLobby(socket,lobby)
            return
        }
        if(lobby.userIds.includes(userId)){
            const user = this.users.getInfo(userId)
            user.socket = socket
            this.socks.newSock(socket.id,userId)
            return
        }
        this.socks.errorPage(socket)
    }

    startGame(lobby){
        if(lobby.game){
            lobby.inGame = 1
            this.gameControl.newGame(lobby)

            for(var userId of lobby.userIds){
                const user = this.users.getInfo(userId)
                const socket = user.socket
                user.inGame = 1
                this.socks.sendCookie(socket,userId)
                this.socks.toGame(socket,lobby)
            }
        }
    }

    sendGameChange(lobby){
        for(var userId of lobby.userIds){
            const socket = this.users.getInfo(userId).socket
            this.socks.gameUpdate(socket,lobby.game)
        }
    }

    gameChange(socket,game){
        if(this.gameLib.getNames().includes(game)){
            const userId = this.socks.getUserId(socket.id)
            const lobbyId = this.users.getInfo(userId).lobbyId
            const lobby = this.lobbies.getInfo(lobbyId)
            
            this.unreadyUsers(lobby)
            lobby.game = game
            this.sendGameChange(lobby)
        }
        else{
            // console.log('gameChangeError')
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
            return
        }
        if(!user.team){
            this.socks.noTeamSelected(user.socket)
            return
        }
        if(user.ready){
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
            if(!this.users.getInfo(userId).inGame){
                const socket = this.users.getInfo(userId).socket
                this.socks.playerUpdate(socket,text)
            }
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
            const socket1 = this.users.getInfo(userId1).socket
            this.socks.newChat(socket1,chat)
        }
    }

    // JOIN/LEAVE

    giveOwnerView(lobby){
        const allGames = this.gameLib.getNames()
        const socket = this.users.getInfo(lobby.owner).socket
        this.socks.newOwner(socket,allGames,lobby.game)
    }

    returningUser(socket,lobby,userId){
        if(lobby.owner == userId){
            this.giveOwnerView(lobby)
        }
        const user = this.users.getInfo(userId)

        user.inGame = 0
        user.socket = socket
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
        if(exist || !this.lobbies.getInfo(lobbyId).gameBegun){
            return(1)
        }
    }

    joinLobby(socket,lobbyId,userId){
        if(this.isLobbyOpen(lobbyId)){
            const lobby = this.lobbies.getInfo(lobbyId)
            
            //returning user
            if(userId && lobby.userIds.includes(userId)){
                this.returningUser(socket,lobby,userId)
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
        if(socket){
            this.socks.toLobby(socket,lobby)
        }
    }

    disconnect(socket){
        const userId = this.socks.getUserId(socket.id)
        if(userId){
            const user = this.users.getInfo(userId)
            this.socks.deleteSock(socket.id)

            if(user.inGame){
                // console.log('leaving started game')
            }
            else{
                this.deleteUser(user)
            }
        }
    }

    deleteUser(user){
        const lobby = this.lobbies.getInfo(user.lobbyId)
        
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
    }
}
