const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");
const rateLimit = require("express-rate-limit");

const client = new MongoClient(process.env.MONGODB_URI);

const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
}

connectDB();

const allowedOrigins = [
    "https://memohammedikhlas.github.io",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
];

app.use(cors({
    origin: allowedOrigins
}));
app.use(express.json({ limit: "10kb" }));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes."
    }
});

app.use(limiter);

app.get("/", function(req, res){
    res.send("Spice Haven Backend is Running!");
});

app.post("/reservation", async function(req, res) {
    try {
        const { name, phone, date, time, guests } = req.body;

        // Required fields check
        if (!name || !phone || !date || !time || !guests) {
            return res.status(400).json({
                success: false,
                message: "All reservation fields are required"
            });
        }

        // Basic validation
        if (name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid name"
            });
        }

        if (!/^[0-9+\-\s()]{7,20}$/.test(phone.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid phone number"
            });
        }

        const guestCount = Number(guests);

        if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
            return res.status(400).json({
                success: false,
                message: "Guests must be between 1 and 20"
            });
        }

        const reservationDate = new Date(`${date}T${time}`);

        if (
            Number.isNaN(reservationDate.getTime()) ||
            reservationDate.getTime() < Date.now()
        ) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid future date and time"
            });
        }

        const reservationData = {
            name: name.trim(),
            phone: phone.trim(),
            date,
            time,
            guests: guestCount,
            status: "Pending",
            createdAt: new Date()
        };

        const database = client.db("spiceHaven");
        const reservations = database.collection("reservations");

        await reservations.insertOne(reservationData);

        res.status(201).json({
            success: true,
            message: "Reservation saved successfully!"
        });

    } catch (error) {
        console.error("Error saving reservation:", error);

        res.status(500).json({
            success: false,
            message: "Failed to save reservation"
        });
    }
});

app.post("/contact", async function(req, res) {
    try {
        const { name, email, phone, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Name, email and message are required"
            });
        }

        if (name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid name"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        if (
            phone &&
            !/^[0-9+\-\s()]{7,20}$/.test(phone.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid phone number"
            });
        }

        if (message.trim().length < 5 || message.trim().length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Message must be between 5 and 1000 characters"
            });
        }

        const contactData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : "",
            message: message.trim(),
            createdAt: new Date()
        };

        const database = client.db("spiceHaven");
        const contacts = database.collection("contacts");

        await contacts.insertOne(contactData);

        res.status(201).json({
            success: true,
            message: "Message sent successfully!"
        });

    } catch (error) {
        console.error("Error saving contact message:", error);

        res.status(500).json({
            success: false,
            message: "Failed to send message"
        });
    }
});

app.post("/admin/login", loginLimiter, function(req, res){

    const { username, password } = req.body;

    if(
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ){

        const token = jwt.sign(
            { role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        return res.json({
            success: true,
            message: "Login successful",
            token: token
        });
    }

    res.status(401).json({
        success: false,
        message: "Invalid username or password"
    });

});

function verifyAdmin(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access denied"
        });
    }

    const token = authHeader.split(" ")[1];

    try {

        jwt.verify(token, process.env.JWT_SECRET);

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });

    }
}

app.get("/admin/reservations", verifyAdmin, async function(req, res) {

    try {
        const database = client.db("spiceHaven");
        const reservations = database.collection("reservations");

        const data = await reservations
            .find({})
            .sort({ _id: -1 })
            .toArray();

        res.json({
            success: true,
            reservations: data
        });

    } catch (error) {
        console.error("Error fetching reservations:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch reservations"
        });
    }
});


app.get("/admin/contacts", verifyAdmin, async function(req, res) {

    try {
        const database = client.db("spiceHaven");
        const contacts = database.collection("contacts");

        const data = await contacts
            .find({})
            .sort({ _id: -1 })
            .toArray();

        res.json({
            success: true,
            contacts: data
        });

    } catch (error) {
        console.error("Error fetching contacts:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch contact messages"
        });
    }
});

app.patch("/admin/reservations/:id/status", verifyAdmin, async function(req, res) {

    try {

        if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
        success: false,
        message: "Invalid reservation ID"
    });
}

        const { status } = req.body;

        const allowedStatuses = [
    "Pending",
    "Confirmed",
    "Cancelled"
];

if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
        success: false,
        message: "Invalid reservation status"
    });
}

        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        const database = client.db("spiceHaven");
        const reservations = database.collection("reservations");

        await reservations.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: status } }
        );

        res.json({
            success: true,
            message: "Reservation status updated"
        });

    } catch (error) {
        console.error("Status update error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update reservation status"
        });
    }

});

app.delete("/admin/reservations/:id", verifyAdmin, async function(req, res) {

    try {

        if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
        success: false,
        message: "Invalid reservation ID"
    });
}

        const { ObjectId } = require("mongodb");

        const database = client.db("spiceHaven");
        const reservations = database.collection("reservations");

        const result = await reservations.deleteOne({
            _id: new ObjectId(req.params.id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found"
            });
        }

        res.json({
            success: true,
            message: "Reservation deleted successfully"
        });

    } catch (error) {

        console.error("Reservation delete error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete reservation"
        });

    }

});

app.delete("/admin/contacts/:id", verifyAdmin, async function(req, res) {

    try {

        if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
        success: false,
        message: "Invalid contact ID"
    });
}

        const { ObjectId } = require("mongodb");

        const database = client.db("spiceHaven");
        const contacts = database.collection("contacts");

        const result = await contacts.deleteOne({
            _id: new ObjectId(req.params.id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Contact message not found"
            });
        }

        res.json({
            success: true,
            message: "Contact message deleted successfully"
        });

    } catch (error) {

        console.error("Contact delete error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete contact message"
        });

    }

});

app.listen(PORT, "0.0.0.0", function(){
    console.log("Server running on port " + PORT);
});
