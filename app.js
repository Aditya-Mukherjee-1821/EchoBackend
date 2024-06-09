import express from 'express';
import userRoute from './routes/user.routes.js';
import dotenv from 'dotenv';
import { connectDB, getSocket } from './utils/features.utils.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';
import {
  ACCEPTED,
  CHAT_OPENED,
  IS_ONLINE,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
  TYPING,
  NEW_REQUEST
} from './constants/events.constants.js';
import { v4 as uuidv4 } from 'uuid';
import { Message } from './models/message.model.js';
import cors from 'cors';
import { socketAuthenticator } from './middlewares/auth.middleware.js';
import { Chat } from './models/chat.models.js';

const app = express();
// create io connection
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      process.env.CLIENT_URL,
    ],
    credentials: true,
  },
});

// configure .env
dotenv.config({
  path: './.env',
});

// static variables
const MongoURI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;

//mapping user id to socket id
const userSocketIdMap = new Map();

// connecting to database
connectDB(MongoURI);

// middlewares
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      process.env.CLIENT_URL,
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use('/user', userRoute);

// create middleware for io authentication
io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await socketAuthenticator(err, socket, next);
  });
});

// create connection in io and access individual connection
io.on('connection', (socket) => {
  const user = socket.user;
  userSocketIdMap.set(user._id.toString(), socket.id);
  //emit all the current updated list of users that are active to the particular socket that got connected now
  io.emit(IS_ONLINE, Array.from(userSocketIdMap?.keys()));

  console.log(Array.from(userSocketIdMap.keys()));

  socket.on(NEW_MESSAGE, async ({ chat_id, members, content }) => {
    const messageForRealtime = {
      content: content,
      _id: uuidv4(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chat_id,
      createdAt: new Date().toISOString(),
    };

    // console.log(messageForRealtime);

    const messageForDB = {
      content: content,
      sender: user._id,
      chat: chat_id,
    };
    const memberSockets = getSocket(members);
    // filter out all null values from memberSockets
    const filteredSockets = memberSockets.filter((item) => item != null);
    // console.log(filteredSockets);
    io.to(filteredSockets).emit(NEW_MESSAGE, messageForRealtime);
    io.to(filteredSockets).emit(NEW_MESSAGE_ALERT, { chat: chat_id });
    try {
      await Message.create(messageForDB);
      await Chat.findByIdAndUpdate(chat_id, {
        lastMessage: content,
        lastMessageTime: new Date().toISOString(),
      });
    } catch (err) {
      console.log(err);
    }
  });

  socket.on(NEW_REQUEST, (user_id) => {
    console.log('Got new request for', user_id);
    const userSocket = getSocket([{ _id: user_id }]);
    if (userSocket?.length !== 0) io.to(userSocket).emit(NEW_REQUEST, user_id);
    else console.log('could not emit!');
  });

  socket.on(ACCEPTED, (members) => {
    const memberObj = [{ _id: members[0] }, { _id: members[1] }];
    const userSockets = getSocket(memberObj);
    const filteredSockets = userSockets.filter((item) => item != null);
    if (filteredSockets?.length !== 0)
      io.to(filteredSockets).emit(REFETCH_CHATS, 'Refetch');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    //delete the user from the map
    userSocketIdMap.delete(user._id.toString());
    io.emit(IS_ONLINE, Array.from(userSocketIdMap?.keys()));
  });
});

app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`Server is running on ${PORT}!`);
});

export { userSocketIdMap };
