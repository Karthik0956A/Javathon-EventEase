const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true,
    },
    eventLocation: {
        type: String,
        required: true,
    },
    eventTime: {
        type: String,
        required: true,
    },
    eventDate: {
        type: Date,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    agenda: {
        type: String,
        required: true,
    },
    contact: {
        type: String,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
        min: 1,
    },
    category: {
        type: String,
        enum: ["conference", "workshop", "meetup"],
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to the User model
        required: true,
    },
    attendees: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // References users who have registered for the event
        },
    ],
    image:{
        type:String,
        required:true,
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model("Event", EventSchema);
