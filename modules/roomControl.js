
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
        })
    }

    //TEMPORARY
    endGame(socket){
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getLobbyId(userId)
        const userIds = this.lobbies.getUserIds(lobbyId)
        for(var userId1 of userIds){
            const socket1 = this.users.getSocket(userId1)
            this.users.readyChange(userId1)
            this.socks.toLobby(socket1,lobbyId)
        }
        this.lobbies.endGame(lobbyId)
    }   

    joinGame(socket,userId,lobbyId){
        if(this.lobbies.lobbyExist(lobbyId) && this.lobbies.getUserIds(lobbyId).includes(userId)){
            this.users.joinGame(userId)
            this.socks.newSock(socket.id,userId)
            this.users.updateSock(userId,socket)
            // this.gameControl.setupGame(socket,lobbyId)
            return
        }
        this.socks.errorPage(socket)
    }

    updateGame(lobbyId,game){
        const userIds = this.lobbies.getUserIds(lobbyId)
        for(var userId of userIds){
            const socket = this.users.getSocket(userId)
            this.socks.gameUpdate(socket,game)
        }
    }

    gameChange(socket,game){
        if(this.gameLib.getNames().includes(game)){
            const userId = this.socks.getUserId(socket.id)
            const lobbyId = this.users.getLobbyId(userId)
            
            this.unreadyUsers(lobbyId)
            this.lobbies.changeGame(lobbyId,game)
            this.updateGame(lobbyId,game)
        }
        else{
            // console.log('gameChangeError')
        }
    }

    unreadyUsers(lobbyId){
        const userIds = this.lobbies.getUserIds(lobbyId)
        for(var userId of userIds){
            this.users.unready(userId)
        }
        this.updatePlayerList(lobbyId)
    }

    startGame(lobbyId){
        const userIds = this.lobbies.getUserIds(lobbyId)
        const game = this.lobbies.getGame(lobbyId)

        if(game){
            this.lobbies.goingInGame(lobbyId)
            this.gameControl.newGame(lobbyId,userIds)
            for(var userId of userIds){
                const socket = this.users.getSocket(userId)
                this.users.joinGame(userId)
                this.socks.sendCookie(socket,userId)
                this.socks.toGame(socket,game,lobbyId)
            }
        }
    }

    weReady(lobbyId){
        const userIds = this.lobbies.getUserIds(lobbyId)
        //check if everyone ready
        for(var userId of userIds){
            if(!this.users.isReady(userId)){
                return
            }
        }
        this.startGame(lobbyId) 
    }

    readyChange(socket){
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getLobbyId(userId)
        //can't ready if no game selected
        if(!this.lobbies.getGame(lobbyId)){
            return
        } 
        var readyUp = this.users.readyChange(userId)
        this.updatePlayerList(lobbyId)
        if(readyUp){
            this.weReady(lobbyId)
        }
    }

    newChat(socket,chat){
        if(chat.length == 0 || chat.length >500){
            this.socks.chatError(socket)
        }
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getLobbyId(userId)
        const userIds = this.lobbies.getUserIds(lobbyId)
        chat = this.users.getName(userId) +': ' + chat
        for(var userId1 of userIds){
            const socket1 = this.users.getSocket(userId1)
            this.socks.newChat(socket1,chat)
        }
    }

    updateName(socket,userName){
        if(userName.length==0 || userName.length>12){
            this.socks.nameError(socket)
            return
        }
        const userId = this.socks.getUserId(socket.id)
        const lobbyId = this.users.getLobbyId(userId)
        const userIds = this.lobbies.getUserIds(lobbyId)
        const nameChange = this.users.changeName(userIds,userId,userName)
        if(nameChange){
            this.socks.nameUpdate(socket,userName)
            this.updatePlayerList(lobbyId)
        }
        else{
            this.socks.nameTaken(socket)
        }
    }

    ownerView(socket,lobbyId){
        const lobbyGame = this.lobbies.getGame(lobbyId)
        const allGames = this.gameLib.getNames()
        this.socks.newOwner(socket,allGames,lobbyGame)
    }

    makeLobbyText(lobbyId){
        var text = 'players: <br>'  
        const lobbyOwner = this.lobbies.getOwner(lobbyId)
        const userIds = this.lobbies.getUserIds(lobbyId)
        for(var userId of userIds){
            var mark = '(X)'
            if(this.users.isReady(userId)){
                mark = '(✓)' //checkmark
            }
            if(userId == lobbyOwner){
                text += this.users.getName(userId) + mark + ' [party leader] <br>'
            }
            else{
                text += this.users.getName(userId) + mark + ' <br>'
            }
        }
        return(text)
    }

    updatePlayerList(lobbyId){
        const text = this.makeLobbyText(lobbyId)
        const userIds = this.lobbies.getUserIds(lobbyId)
        for(var userId of userIds){
            const socket = this.users.getSocket(userId)
            this.socks.playerUpdate(socket,text)
        }
    }

    returningUser(socket,lobbyId,userId){
        if(this.lobbies.getOwner(lobbyId) == userId){
            this.ownerView(socket,lobbyId)
        }
        this.users.updateSock(userId,socket)

        const user = this.users.getUser(userId)
        const game = this.lobbies.getGame(lobbyId)
        
        this.socks.joinLobby(user,game)
        this.users.notInGame(userId)
        this.socks.deleteCookie(socket)
        this.updatePlayerList(lobbyId)
    }

    isNewOwner(socket,lobbyId){
        if(this.lobbies.getUserIds(lobbyId).length == 1){
            this.lobbies.newOwner(lobbyId)
            this.ownerView(socket,lobbyId)
        }
    }

    addUser(socket,lobbyId){
        const userIds = this.lobbies.getUserIds(lobbyId)
        const user = this.users.newUser(socket,lobbyId,userIds)
        const game = this.lobbies.getGame(lobbyId)

        this.socks.deleteCookie(socket)
        this.socks.joinLobby(user,game)
        this.lobbies.joinLobby(user.userId,lobbyId)
        this.isNewOwner(user.socket,lobbyId)
        this.updatePlayerList(lobbyId)
    }

    canJoin(socket,lobbyId){
        const exist = this.lobbies.lobbyExist(lobbyId)
        if(!exist || this.lobbies.gameBegun(lobbyId)){
            this.socks.errorPage(socket)
            return
        }
        return(1)
    }

    joinLobby(socket,lobbyId,userId){
        if(this.canJoin(socket,lobbyId)){
            //returning user
            if(userId && this.lobbies.getUserIds(lobbyId).includes(userId)){
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
            const lobbyId = this.users.getLobbyId(userId)
            this.socks.deleteSock(socket.id)
            //if ingame
            if(this.users.isInGame(userId)){
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
        if(!deleted && !this.lobbies.getOwner(lobbyId)){
            const newOwner = this.lobbies.newOwner(lobbyId)
            const socket = this.users.getSocket(newOwner)
            this.ownerView(socket,lobbyId)
        }
        //update playerList
        if(!deleted){
            this.updatePlayerList(lobbyId)
        }
    }
}
