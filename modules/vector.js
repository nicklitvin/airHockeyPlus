'use strict'

export default class Vector{
    constructor(x,y){
        this.x = x
        this.y = y
    }

    normalise(){
        const length = (this.x**2 + this.y**2)**(1/2)
        if(!length){
            this.x = 0
            this.y = 0
        }
        else{
            this.x /= length
            this.y /= length
        }
    }

    dotProduct(newVector){
        return(this.x*newVector.x + this.y*newVector.y)
    }

    multiply(scalar){
        return(new Vector(this.x*scalar,this.y*scalar))
    }

    add(newVector){
        return(new Vector(this.x + newVector.x, this.y + newVector.y))
    }

    getMagnitude(){
        return( (this.x**2 + this.y**2)**(1/2) )
    }
}