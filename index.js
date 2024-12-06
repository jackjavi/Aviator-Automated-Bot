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

// Endpoint to get the number of bets
app.get("/bet-count", (req, res) => {
  const filePath = "bets.json";

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err && err.code === "ENOENT") {
      // If file doesn't exist, return count as 0
      return res.json({ count: 0 });
    } else if (!err) {
      // Parse the file and return the number of entries
      const bets = JSON.parse(data);
      return res.json({ count: bets.length });
    } else {
      res.status(500).send("Error reading bets file.");
    }
  });
});

app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
