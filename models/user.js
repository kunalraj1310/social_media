const mongoose = require('mongoose')
const { post } = require('../app')
require('dotenv').config();

mongoose.connect(process.env.MONGO_URL)

const userschema = mongoose.Schema({
    email:String,
    username:String,
    password:String,
    post: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    }]
})

module.exports = mongoose.model("user",userschema)