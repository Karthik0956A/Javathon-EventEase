require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const bodyParser = require("body-parser");
const path = require("path");
const isAuthenticated = require("./middleware/isauth");
const Event = require("./models/Event");
const Register = require("./models/Register");
const methodOverride = require("method-override");
const User = require("./models/User");
const app = express();
app.use(methodOverride("_method")); // Allows handling PUT/DELETE in forms


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));

// Session Store
const store = new MongoDBStore({
    uri: process.env.MONGO_URI,
    collection: "sessions",
});

// Express Session
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: store,
        cookie: { maxAge: 15*1000 * 60 * 60 * 24 }, // 15 day
    })
);

// Routes
const authRoutes = require("./routes/auth");
const { error } = require("console");
app.use("/", authRoutes);
app.get("/", isAuthenticated, async (req, res) => {
    
    try {
        const event = await Event.find();
        const userId = req.session.userId;
        const user = await User.findById(userId).populate('username');
        res.render("index",{ username:user , events:event});
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send("An error occurred while fetching user data.");
    }
});

app.get("/dashboard", isAuthenticated, async (req, res) => {
    
    const userId = req.session.userId;
     const user = await User.findById(userId).populate('username');
    try {
        const events = await Event.find({ createdBy: userId });
        res.render("dashboard", { events, username:user });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading dashboard.");
    }
});

app.get("/dashboard/create", isAuthenticated, (req, res) => {
    res.render("create");
});

app.post("/dashboard/create", isAuthenticated, async (req, res) => {
    const { eventName, eventLocation, eventTime, eventDate, description, agenda, contact, capacity, category, image } = req.body;
    const createdBy = req.session.userId;

    try {
        const event = new Event({
            eventName,
            eventLocation,
            eventTime,
            eventDate,
            description,
            agenda,
            contact,
            capacity,
            category,
            createdBy,
            image
        });
        await event.save();
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating event.');
    }
});


app.delete("/dashboard/delete/:eventId", isAuthenticated, async (req, res) => {
    const { eventId } = req.params; // Extract eventId from URL
    const createdBy = req.session.userId; // Ensure the event belongs to the logged-in user

    try {
        const deletedEvent = await Event.findOneAndDelete({ _id: eventId, createdBy });
        if (!deletedEvent) {
            return res.status(404).send("Event not found or not authorized to delete.");
        }
        res.status(200).send("Event deleted successfully."); // Send success response
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting event.");
    }
});

app.get('/dashboard/participants/:eventId', isAuthenticated, async (req, res) => {
    const { eventId } = req.params;

    try {
        const event = await Event.findById(eventId).populate('attendees');
        if (!event) {
            return res.status(404).send('Event not found.');
        }
        res.render('participants', { event });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading participants.');
    }
});

app.get("/api/events", isAuthenticated, async(req, res) => {
    try {
        const events = await Event.find();
        res.json(events);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching events.');
    }
});

app.get("/events/:eventId", isAuthenticated, async (req, res) => {
    const eventId = req.params.eventId; 
    const userId = req.session.userId;
        const user = await User.findById(userId).populate('username'); // Corrected this line
    try {
        const event = await Event.findById(eventId);
        res.render('event', { event , username:user});  // Added 'res.' before render
    } catch (err) {
        console.error(err);  // Changed 'error' to 'err'
        res.status(500).send("Error finding the event");
    }
});


app.post("/register/:eventId", isAuthenticated, async (req, res) => {
    const eventId = req.params.eventId;
    const userId = req.session.userId;

    try {
        const event = await Event.findById(eventId);
        const user = await User.findById(userId);

        if (!event) {
            return res.status(404).send("Event not found.");
        }

        if (!user) {
            return res.status(404).send("User not found.");
        }

        // Check if the user is already registered for the event
        if (!user.registeredEvents.includes(eventId)) {
            user.registeredEvents.push(eventId);
            event.attendees.push(userId);

            // Save changes to both user and event
            await user.save();
            await event.save();

            return res.status(200).send("You have successfully registered for this event.");
        } else {
            return res.status(400).send("You are already registered for this event.");
        }
    } catch (err) {
        console.error("Error registering for the event:", err);
        res.status(500).send("An error occurred while registering for the event.");
    }
});

app.get('/enrolled', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId; // Correctly extract the user ID from the session
        // const user = await User.findById(userId).populate('registeredEvents'); // Populate `registeredEvents` to get event details
        // if (!user) {
        //     return res.status(404).send("User not found");
        // }
        
        const user = await User.findById(userId).populate('username');
        res.render("enrolled", { userId, username:user }); // Pass user (and their enrolled events) to the template
    } catch (error) {
        console.error("Error fetching enrolled events:", error);
        res.status(500).send("An error occurred while fetching your enrolled events.");
    }
});

app.get("/api/:userId/enrolled", isAuthenticated, async (req, res) => {
    try {
        const userId = req.params.userId; // Extract user ID from the route parameter
        const user = await User.findById(userId).populate('registeredEvents'); // Populate `registeredEvents`

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ enrolledEvents: user.registeredEvents, username:user }); // Return the enrolled events as JSON
    } catch (error) {
        console.error("Error fetching enrolled events:", error);
        res.status(500).json({ error: "An error occurred while fetching enrolled events." });
    }
});

app.delete("/api/cancel-registration/:eventId", isAuthenticated, async (req, res) => {
    const eventId = req.params.eventId;
    const userId = req.session.userId;

    try {
        const event = await Event.findById(eventId);
        const user = await User.findById(userId);

        if (!event) {
            return res.status(404).send("Event not found.");
        }

        if (!user) {
            return res.status(404).send("User not found.");
        }

        // Check if the user is registered for the event
        if (user.registeredEvents.includes(eventId)) {
            // Remove event from user's registered events
            user.registeredEvents = user.registeredEvents.filter(id => id.toString() !== eventId);

            // Remove user from the event's attendees
            event.attendees = event.attendees.filter(id => id.toString() !== userId);

            // Save changes to both user and event
            await user.save();
            await event.save();

            return res.status(200).send("Your registration has been canceled.");
        } else {
            return res.status(400).send("You are not registered for this event.");
        }
    } catch (err) {
        console.error("Error canceling registration:", err);
        res.status(500).send("An error occurred while canceling registration.");
    }
});

app.get("/about",isAuthenticated,async(req,res)=>{
    const userId = req.session.userId; 
    const user = await User.findById(userId).populate('username');
    res.render("about",{username:user});
})
// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
