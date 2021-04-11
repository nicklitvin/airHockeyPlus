'use strict'
import cookie from '/modules/cookies.js'
const socket = io()

function toHome(){
    const url = window.location.href.split('/error')[0]
    window.location.href = url
}
window.toHome = toHome