const express = require("express");
const bodyParser = require("body-parser");
const faceapi = require("face-api.js");
const canvas = require("canvas");
const User = require("./model/user");
const connectDB = require("./db");
const { createCanvas, loadImage, Canvas, Image, ImageData } = require("canvas");

const app = express();
const PORT = 5000;
app.use(bodyParser.json());

// Function to load face recognition models
async function loadModels() {
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk("./models"),
    faceapi.nets.faceRecognitionNet.loadFromDisk("./models"),
    faceapi.nets.faceLandmark68Net.loadFromDisk("./models"),
  ]);
  console.log("Face models loaded");
}

// Patching environment variables for faceapi to work with node-canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let labeledFaceDescriptors; // Store labeled face descriptors globally

// Function to load labeled face descriptors from the database
async function loadLabeledFaceDescriptors() {
  try {
    const users = await User.find({}, "username faceDescriptors");

    labeledFaceDescriptors = await Promise.all(
      users.map(async (user) => {
        const { username, faceDescriptors } = user;
        if (faceDescriptors && faceDescriptors.length > 0) {
          console.log(username + " loaded");
          //faceDesctiptors stored as an array of object in the database
          //it is nessessarry to convert the object into Flot32Array
          const input = faceDescriptors.toObject().map((obj) => {
            return new Float32Array(Object.keys(obj).map((key) => obj[key]));
          });
          return new faceapi.LabeledFaceDescriptors(username, input);
        }
      })
    );
  } catch (error) {
    console.error("Error loading labeled face descriptors:", error);
    throw error;
  }
}

// Connect to MongoDB, load models and labeled face descriptors when the server starts
async function startServer() {
  try {
    await connectDB();
    await loadModels();
    await loadLabeledFaceDescriptors();
    // Start the server after loading models and labeled face descriptors and connected to database
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
}

startServer();

//ENDPOINTS

app.post("/api/login", async (req, res) => {
  const frameData = req.body.frameData;

  if (frameData === "data:,") {
    console.log("empty data");
    res.json({ names: [] });
  } else {
    try {
      if (!labeledFaceDescriptors) {
        // If labeled face descriptors not loaded, send error response
        return res
          .status(500)
          .json({ error: "Labeled face descriptors not loaded" });
      }

      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

      const img = await canvas.loadImage(frameData);
      const detections = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const results = detections.map(
        (d) => faceMatcher.findBestMatch(d.descriptor).label
      );

      console.log("Recognized faces:", results);
      res.json({ names: results });
    } catch (error) {
      console.error("Error processing frame:", error);
      res.status(500).json({ error: "Error processing frame" });
    }
  }
});

app.post("/api/register", async (req, res) => {
  const name = req.body.name;
  const frameData = req.body.frameData;
  if (frameData === "data:,") {
    console.log("empty data");
    res.json({ message: "", names: [] });
  } else {
    try {
      // If labeled face descriptors not loaded, send error response
      if (!labeledFaceDescriptors) {
        return res
          .status(500)
          .json({ error: "Labeled face descriptors not loaded" });
      }

      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
      const img = await canvas.loadImage(frameData);
      const detections = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptors();
      const results = detections.map(
        (d) => faceMatcher.findBestMatch(d.descriptor).label
      );
      if (results.length === 0) {
        console.log("no face");
        res.json({ message: "There is no face in the frame", names: [] });
      } else if (results.length > 1) {
        console.log("multiple faces");
        res.json({
          message: "Please make sure only 1 person is in the frame",
          names: [],
        });
      } else {
        console.log("Recognized faces:", results);
        // Check if the recognized face already exists in the database
        let user = await User.findOne({ username: results });
        if (!user) {
          console.log("No saved user");
          // If the recognized face is new, create a new user entry
          await User.create({
            username: name,
            faceDescriptors: [detections[0].descriptor],
          });
          console.log("New user created:", name);
          res.json({ message: "New user created", names: [] }); //1st set of faceDescriptiors
        } else {
          // If the recognized face already exists, update the face descriptors
          user.faceDescriptors.push(detections[0].descriptor);
          await user.save();
          console.log(
            "Face descriptors extended for existing user:",
            user.username
          );
          res.json({ message: `${user.username} updated`, names: results }); //2+ faceDescriptiors for the user
        }
      }
    } catch (error) {
      console.error("Error registering:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
