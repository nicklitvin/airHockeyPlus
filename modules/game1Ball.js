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

    getInfoIn(time){
        return({
            'x': this.x + this.xMove*time,
            'y': this.y + this.yMove*time,
            'xMove': this.xMove,
            'yMove': this.yMove
        })
    }
}