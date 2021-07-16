'use strict'

export default class MoveCommands{
    constructor(){
        this.right = false
        this.left = false
        this.up = false
        this.down = false
    }

    recordMoveCommands(move){
        this.left = move.left
        this.right = move.right
        this.up = move.up
        this.down = move.down
    }
 
    resetPlayerMoveCommands(){
        this.up = false
        this.down = false
        this.left = false
        this.right = false
    }
 
    deleteMoveContradictions(){
        if(this.up && this.down){
            this.up = false
            this.down = false
        }
        if(this.left && this.right){
            this.left = false
            this.right = false
        }
    }
}