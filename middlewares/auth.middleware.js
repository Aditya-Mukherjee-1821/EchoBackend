import jwt from 'jsonwebtoken';
import { User } from '../models/user.models.js';

const isUserAuthenticated = async (req, res, next) => {
  const token = req.cookies['EchoToken'];
  if (!token) {
    // create an err obj with mssg User not logged in and set its status code to 401
    const err = new Error('User not logged in');
    err.statusCode = 401;
    return next(err);
  }

  const decodedData = jwt.verify(token, process.env.SECRET_KEY);

  req.user_id = decodedData._id;
  next();
};

const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const token = socket.request.cookies['EchoToken']; //this .cookies attribute is found by paasing it thru cookie parser mid
    if (!token) return next(new Error('Not authorized'));

    const decodedData = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decodedData._id);
    if (!user) return next(new Error('Not authorized'));

    socket.user = user;

    return next();
  } catch (error) {
    next(error);
  }
};

export { isUserAuthenticated, socketAuthenticator };
