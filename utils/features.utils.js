import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { userSocketIdMap } from '../app.js';

// connection to DB
const connectDB = (uri) => {
  mongoose
    .connect(uri, { dbName: 'Echo' })
    .then((data) => {
      console.log(`Connected to DB: ${data.connection.host}`);
    })
    .catch((err) => {
      throw err;
    });
};

// creation of token
const sendToken = (res, user, status, message) => {
  const secretKey = process.env.SECRET_KEY;
  const cookieOptions = {
    maxAge: 15 * 86400000,
    sameSite: 'none',
    secure: true,
    httpOnly: true,
  };
  const token = jwt.sign({ _id: user._id }, secretKey);

  return res.status(status).cookie('EchoToken', token, cookieOptions).json({
    token,
    success: true,
    message,
  });
};

const deleteToken = (res, status, message) => {
  const cookieOptions = {
    maxAge: 0,
    sameSite: 'none',
    secure: true,
    httpOnly: true,
  };

  return res.status(status).cookie('EchoToken', '', cookieOptions).json({
    success: true,
    message,
  });
};

const emitEvent = (req, event, members, data) => {
  console.log('Emitting event:', event);
  console.log('Members:', members);
};

const getSocket = (users = []) => {
  const sockets = users.map((user) =>
    userSocketIdMap.get(user._id.toString())
      ? userSocketIdMap.get(user._id.toString())
      : null
  );

  return sockets;
};

export { connectDB, sendToken, deleteToken, emitEvent, getSocket };
