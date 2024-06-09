import mongoose, { Schema, Types, model } from 'mongoose';

const messageSchema = new Schema(
  {
    sender: {
      type: Types.ObjectId,
      ref: 'User',
    },
    chat: {
      type: Types.ObjectId,
      ref: 'Chat',
    },
    content: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Message =
  mongoose.models.Message || model('Message', messageSchema);
