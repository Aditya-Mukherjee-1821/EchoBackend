import { compare } from 'bcrypt';
import { User } from '../models/user.models.js';
import { deleteToken, emitEvent, sendToken } from '../utils/features.utils.js';
import { Chat } from '../models/chat.models.js';
import { Message } from '../models/message.model.js';
import { Request } from '../models/request.model.js';
import {
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  NEW_REQUEST,
  REFETCH_CHATS,
} from '../constants/events.constants.js';

const signup = async (req, res, next) => {
  const { name, handle, password } = req.body;
  try {
    const user = await User.create({
      name: name,
      handle: handle,
      password: password,
    });
    sendToken(res, user, 201, 'Token generated successfully.');
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { handle, password } = req.body;
    const user = await User.findOne({ handle }).select('+password');
    if (!user) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      return next(err);
    }
    const isMatch = await compare(password, user.password);
    if (!isMatch) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      return next(err);
    }
    sendToken(res, user, 200, `Welcome back, ${user.name}`);
  } catch (err) {
    next(err);
  }
};

const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ members: req.user_id }).populate(
      'members',
      'name'
    );

    const transformedChats = chats.map((chat) => {
      return {
        _id: chat._id,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        //filter all members except req.user_id from members
        otherMember: chat.members.filter(
          (member) => member._id.toString() !== req.user_id.toString()
        ),
        members: chat.members,
      };
    });
    transformedChats.sort(
      (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );
    res.status(200).json({
      success: true,
      transformedChats: [transformedChats, req.user_id],
    });
  } catch (err) {
    next(err);
  }
};

const getMyMessages = async (req, res, next) => {
  try {
    //fetch all messages from the Messages databse with page, limit and skip
    const messages = await Message.find({
      chat: req.params._id,
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name')
      .lean();
    // calculate the total number of pages from totalMessageCount and limit
    //send the response with status code 200, messages reversed and the total pages
    res.status(200).json({
      success: true,
      messages: messages,
      user: req.user_id,
    });
  } catch (err) {
    next(err);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { chat_id, content } = req.body;
    const message = await Message.create({
      chat: chat_id,
      content,
      sender: req.user_id,
    });
    // update the lastMessage of Chat model where chat = chat
    await Chat.findByIdAndUpdate(chat_id, {
      lastMessage: content,
      lastMessageTime: message.createdAt,
    });
    const { members } = await Chat.findById(chat_id);
    // send response that the message has been sent successfully

    // emit event
    emitEvent(req, NEW_MESSAGE, members, {
      chat_id,
      message,
    });
    emitEvent(req, NEW_MESSAGE_ALERT, members, {
      chat_id,
    });
    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

const searchFriends = async (req, res, next) => {
  const { name = '' } = req.query;
  try {
    //get all the chats in which user_id is present as members
    const myChats = await Chat.find({
      members: req.user_id,
    });
    //from chats concatenate all the member lists
    const allUsersFromMyChats = myChats.map((chat) => chat.members).flat();
    //fetch all users from User database
    const usersToSearch = await User.find({
      _id: { $nin: allUsersFromMyChats },
      name: { $regex: name, $options: 'i' },
    });
    // filter out my id and name from usersToSearch
    const filteredUsers = usersToSearch.filter(
      (user) => user._id.toString() !== req.user_id.toString()
    );
    //send response with status code
    res.status(200).json({ success: true, filteredUsers });
  } catch (err) {
    next(err);
  }
};

const sendRequest = async (req, res, next) => {
  try {
    const { reqUser_id } = req.body;
    const request = await Request.findOne({
      $or: [
        { sender: req.user_id, receiver: reqUser_id },
        { sender: reqUser_id, receiver: req.user_id },
      ],
    });
    if (request) {
      const err = new Error('Request already sent');
      err.statusCode = 200;
      return next(err);
    }
    await Request.create({
      sender: req.user_id,
      receiver: reqUser_id,
    });

    // emit event
    emitEvent(req, NEW_REQUEST, [reqUser_id]);

    res
      .status(201)
      .json({ success: true, message: 'Request sent successfully' });
  } catch (err) {
    next(err);
  }
};

const acceptRequest = async (req, res, next) => {
  try {
    const { req_id, accept } = req.body;
    const request = await Request.findById(req_id)
      .populate('sender', 'name _id')
      .populate('receiver', 'name _id');

    if (!request) {
      const err = new Error('Request not found');
      err.statusCode = 404;
      return next(err);
    }
    if (!accept) {
      await request.deleteOne();
      // return response that the request has not been accepted
      return res
        .status(200)
        .json({ success: true, message: 'Request declined' });
    }

    const chat = await Chat.create({
      members: [request.sender._id, request.receiver._id],
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
    });

    await request.deleteOne();

    //emit event
    emitEvent(req, REFETCH_CHATS, chat.members);

    res.status(201).json({
      success: true,
      message: 'Request accepted successfully',
      members: [request.sender._id, request.receiver._id],
    });
  } catch (err) {
    next(err);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const request = await Request.find({ receiver: req.user_id }).populate(
      'sender',
      'name'
    );
    // send the response request
    res.status(201).json({ success: true, request });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  deleteToken(res, 200, 'User logged out successfully');
};

export {
  login,
  signup,
  getMyChats,
  logout,
  getMyMessages,
  searchFriends,
  sendRequest,
  acceptRequest,
  getNotifications,
  sendMessage,
};
