import db from 'mariadb'

// database pool for easy connection
const pool = db.createPool({
    host: 'localhost', 
    user:'root', 
    password: 'password',
    database: 'gamedb',
    connectionLimit: 5
})

function makeId(){
    // TODO: check if id exists
    var id = ''
    var hex = '0123456789abcdef'
    for (var a=0; a<8; a++){
        id += hex[Math.floor(Math.random()*16)]
    }
    return(id)
}   

async function select(){
    const conn = await pool.getConnection()
    var command = `select * from users`
    var users = await conn.query(command)
    var command = `select * from lobbies`
    var lobbies = await conn.query(command)
    conn.end()
    console.log('users',users,'lobbies',lobbies)
}

export async function newLobby(socket){
    const conn = await pool.getConnection()
    var lobbyId = makeId(10)
    var command = `insert into lobbies values('${lobbyId}','${socket.id}')`
    await conn.query(command)
    conn.end()

    select()
    newUser(socket,lobbyId)
}

export async function newUser(socket,lobbyId){
    //TODO: Check if lobbyID exists in lobbies before joining and in game
    const conn = await pool.getConnection()
    var command = `insert into users values('${socket.id}','${lobbyId}','null','null')`
    await conn.query(command)
    conn.end()

    select()
}

export async function removeUser(socket){
    //check if socket in lobby
    const conn = await pool.getConnection()
    var command = `select lobbyId from users where socketId = '${socket.id}'`
    var lobbyId = (await conn.query(command))
    if(lobbyId[0]){
        lobbyId = lobbyId[0]["lobbyId"]
        //removeLobby if lone socket in lobby
        var command = `select count(socketId) from users where lobbyId = '${lobbyId}'`
        var count = (await conn.query(command))[0]['count(socketId)']
        if(count<=1){
            removeLobby(lobbyId)
        }
    }
    //removeUser
    var command = `delete from users where socketId = '${socket.id}'`
    await conn.query(command)
    conn.end()
    
    select()
}

export async function removeLobby(lobbyId){
    const conn = await pool.getConnection()
    var command = `delete from lobbies where lobbyId = '${lobbyId}'`
    await conn.query(command)
    conn.end()
}

export default{
    newLobby: newLobby,
    newUser: newUser,
    removeUser: removeUser,
    removeLobby: removeLobby
}


