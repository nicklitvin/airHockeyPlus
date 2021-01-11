'use strict'

export function toLobby(socket,lobbyId){
    var a = `lobby/?a=${lobbyId}`
    socket.emit('redirect',a)
}

export function error(socket){
    console.log('error')
}
export default{
    toLobby: toLobby,
    error: error
}