const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        phone:{
            type:String,
            required: true,
            match: /^[0-9]{10}$/,
        },
        registeredEvents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Event", 
                // Reference to the Event model
                
                default:[],
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
