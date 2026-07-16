const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient } = require("mongodb");

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

app.use(cors());
app.use(express.json());

app.get("/", function(req, res){
    res.send("Spice Haven Backend is Running!");
});

app.post("/reservation", async function(req, res) {

    try {

        const reservationData = {
    ...req.body,
    status: "Pending"
};

        const database = client.db("spiceHaven");

        const reservations = database.collection("reservations");

        await reservations.insertOne(reservationData);

        console.log("Reservation saved:", reservationData);

        res.json({
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

        const contactData = req.body;

        const database = client.db("spiceHaven");

        const contacts = database.collection("contacts");

        await contacts.insertOne(contactData);

        console.log("Contact message saved:", contactData);

        res.json({
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

app.post("/admin/login", function(req, res){

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
        const { ObjectId } = require("mongodb");
        const { status } = req.body;

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

app.listen(PORT, "0.0.0.0", function(){
    console.log("Server running on port " + PORT);
});
