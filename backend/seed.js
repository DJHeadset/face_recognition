const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const faceapi = require("face-api.js");
const User = require("./model/user");
const connectDB = require("./db");
const { Canvas, Image, ImageData } = require("canvas");
const { default: mongoose } = require("mongoose");

const app = express();
app.use(bodyParser.json());

async function loadModels() {
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk("./models"),
    faceapi.nets.faceRecognitionNet.loadFromDisk("./models"),
    faceapi.nets.faceLandmark68Net.loadFromDisk("./models"),
  ]);
  console.log("Face models loaded");
}

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let labeledFaceDescriptors; // Store labeled face descriptors globally

async function convertJpgToImageElement(jpgPath) {
  try {
    const imageData = await fs.promises.readFile(jpgPath);
    const img = new Image();

    img.src = imageData;

    return img;
  } catch (error) {
    console.error("Error converting JPG to HTMLImageElement:", error);
    throw error;
  }
}

async function loadLabeledFaceDescriptors() {
  const labelsDirectory = path.join(__dirname, "../labels");

  // Read the contents of the labels directory
  const labels = fs
    .readdirSync(labelsDirectory)
    .filter((item) =>
      fs.statSync(path.join(labelsDirectory, item)).isDirectory()
    );

  console.log("Labels:", labels);
  try {
    labeledFaceDescriptors = await Promise.all(
      labels.map(async (label) => {
        let descriptions = [];

        const user = await User.findOne({ username: label });
        if (user) {
          console.log(`${label} is found`);
          //Convert object into Array32
          const input = user.faceDescriptors.toObject().map((obj) => {
            return new Float32Array(Object.keys(obj).map((key) => obj[key]));
          });

          return new faceapi.LabeledFaceDescriptors(label, input);
        } else {
          //if no data exist in database, find pictures in its folder and create faceDescriptor
          console.log(
            `Descriptors JSON file not found for ${label}, loading images...`
          );
          for (let i = 1; i <= 2; i++) {
            const jpgPath = `../labels/${label}/${i}.jpg`;
            console.log(jpgPath);
            const imageElement = await convertJpgToImageElement(jpgPath);
            const detections = await faceapi
              .detectSingleFace(imageElement)
              .withFaceLandmarks()
              .withFaceDescriptor();
            descriptions.push(detections.descriptor);
          }
          await User.create({ username: label, faceDescriptors: descriptions });
          console.log(`Descriptors for ${label} written to database`);
          return new faceapi.LabeledFaceDescriptors(label, descriptions);
        }
      })
    );
  } catch (error) {
    console.error("Error loading labeled face descriptors:", error);
    throw error;
  }
}

async function closeConnection() {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
    process.exit(1);
  }
}

// Connect to MongoDB, load models and labeled face descriptors when the server starts
async function startSeed() {
  try {
    await connectDB();
    await loadModels();
    await loadLabeledFaceDescriptors();
    // Start the server after loading models and labeled face descriptors and connected to database
    console.log("Database updated");
    await closeConnection();
  } catch (error) {
    console.error("Error starting server:", error);
  }
}

startSeed();
