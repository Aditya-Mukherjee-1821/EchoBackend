import { hash } from "bcrypt";
import mongoose, { Schema, model } from "mongoose";

const userScehma = new Schema({
    name: {
        type: String,
        required: true
    },
    handle: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
}, { timestamps: true })

userScehma.pre("save", async function (next) {

    // hash only when the data is modified
    if (!this.isModified("password")) return next();
    this.password = await hash(this.password, 10);
})

export const User = mongoose.models.User || model("User", userScehma);