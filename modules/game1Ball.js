'use strict'
export default class Ball{
    constructor(x,y){
        this.x = x
        this.y = y
        this.dx = 0
        this.dy = 0
        this.radius = .25

        this.xMove = 0
        this.yMove = 0
    }
}