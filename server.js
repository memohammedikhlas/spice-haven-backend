const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);

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

        const reservationData = req.body;

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
        return res.json({
            success: true,
            message: "Login successful"
        });
    }

    res.status(401).json({
        success: false,
        message: "Invalid username or password"
    });

});

app.listen(PORT, "0.0.0.0", function(){
    console.log("Server running on port " + PORT);
});
