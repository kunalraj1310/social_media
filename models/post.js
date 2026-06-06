const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    postcontent: {
        type: String,
        required: true
    },

    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],
    title:{
        type: String,
        required: true
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },

    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("post", postSchema);