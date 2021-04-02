class User{
    constructor(userId,socket,lobbyId,name){
        this.userId = userId
        this.socket = socket
        this.lobbyId = lobbyId
        this.name = name
        this.ready = 0
        this.inGame = 0
        this.team = 0
    }
}

export default class UserManager{
    constructor (){
        this.users = {},
        this.idLength = 10
    }

    getInfo(userId){
        return(this.users[userId])
    }

    readyChange(userId){
        if(this.users[userId].ready){
            this.users[userId].ready = 0
            return
        }
        this.users[userId].ready = 1
        return(1)
    }

    getUserIds(){
        return(Object.keys(this.users))
    }

    changeName(userIds,userId,userName){
        var names = this.getNames(userIds)
        if(!names.includes(userName)){
            this.users[userId].name = userName
            return(1)
        }
    }
    
    getNames(userIds){
        var names = []
        for(var userId of userIds){
            names.push(this.users[userId].name)
        }
        return(names)
    }

    makeName(userIds){
        var names = this.getNames(userIds)
        while(true){
            var name = 'player' + Math.floor(Math.random()*999)
            if(!names.includes(name)){
                return(name)
            }
        }
    }

    makeId(){
        const hex = 'ghijklmnopqrstuvxyz'
        var userId = ''
        while (true){
            for (var a=0; a<this.idLength; a++){
                userId += hex[Math.floor(Math.random()*16)]
            }
            if (!Object.keys(this.users).includes(userId)){
                return(userId)
            }
        }
    }

    newUser(socket,lobbyId,userIds){
        const userId = this.makeId()
        const name = this.makeName(userIds)
        this.users[userId] = new User(userId,socket,lobbyId,name)
        // console.log('newUser',this.users[userId])
        return(this.users[userId])
    }

    deleteUser(userId){
        delete this.users[userId]
        // console.log('deleteUser',this.users)
    }
}
