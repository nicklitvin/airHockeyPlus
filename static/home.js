const socket = io();

function createLobby(){
    socket.emit('createLobby')
}

socket.on('redirect', (url)=>{
    window.location.href += url
})

//TEMPORARY
createLobby()