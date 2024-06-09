const create = async (req, res, next) => {
    try {
        //create a new message using the Message model
        const message = await Message.create({
            chat: "6659cc5011e3c39b52c45abd",
            sender: req.user_id,
            content: "Hi how are you?"
        });
        //send the response with status code 201, message and success true
        res.status(201).json({ success: true, message });

    }
    catch (err) {
        next(err);
    }
};