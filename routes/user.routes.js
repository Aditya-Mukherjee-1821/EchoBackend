import express from 'express';
import {
  acceptRequest,
  getMyChats,
  getMyMessages,
  login,
  logout,
  searchFriends,
  sendRequest,
  signup,
  getNotifications,
  sendMessage,
  getToken,
} from '../controllers/user.controllers.js';
import { isUserAuthenticated } from '../middlewares/auth.middleware.js';

const app = express.Router();

app.post('/signUp', signup);
app.post('/login', login);

app.get('/token', getToken);

app.use(isUserAuthenticated);

app.get('/me', getMyChats);

app.get('/messages/:_id', getMyMessages);

app.get('/search', searchFriends);

app.put('/request', sendRequest);

app.put('/accept', acceptRequest);

app.post('/send', sendMessage);

app.get('/notifications', getNotifications);

app.get('/logout', logout);

export default app;
