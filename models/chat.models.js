import mongoose, { Schema, Types, model } from "mongoose";

const chatSchema = new Schema({
    members: [{
        type: Types.ObjectId,
        ref: "User"
    }],
    lastMessage: {
        type: String,
    },
    lastMessageTime: {
        type: Date,
    }
}, {timestamps :true});

export const Chat = mongoose.models.Chat || model("Chat", chatSchema);
