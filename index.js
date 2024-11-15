import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.json());

// Route to display the input form
app.get("/", (req, res) => {
  res.render("index"); // Renders the form page
});

// Route to handle form submission
app.post("/add-bets", (req, res) => {
  const { odds, amount } = req.body;

  const data = {
    odds: parseFloat(odds),
    amount: parseFloat(amount),
  };

  const filePath = "bets.json";

  // Read and update JSON file
  fs.readFile(filePath, (err, content) => {
    let bets = [];
    if (!err) {
      bets = JSON.parse(content || "[]");
    }
    bets.push(data);

    // Write updated data back to file
    fs.writeFile(filePath, JSON.stringify(bets, null, 2), (writeErr) => {
      if (writeErr) return res.status(500).send("Error saving data.");
      res.send("Bet added successfully!");
    });
  });
});

app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
