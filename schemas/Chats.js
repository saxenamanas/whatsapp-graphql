const mongoose = require('mongoose');

const ChatsSchema = new mongoose.Schema({
    participants:{
        type:String,
        required:true
    },
    chatHistory:{
        type:Array,
    }
});

const Chat = mongoose.model('Chat',ChatsSchema);

export default Chat;