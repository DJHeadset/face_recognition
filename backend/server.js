const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const faceapi = require("face-api.js");
const canvas = require("canvas");
const { createCanvas, loadImage, Canvas, Image, ImageData } = require("canvas");
const { promisify } = require("util");

const app = express();
const PORT = 5000;
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

async function loadLabeledFaceDescriptors() {
  const labelsDirectory = path.join(__dirname, "../labels");

  // Read the contents of the labels directory
  const labels = fs
    .readdirSync(labelsDirectory)
    // Filter out only directories
    .filter((item) =>
      fs.statSync(path.join(labelsDirectory, item)).isDirectory()
    );

  console.log("Labels:", labels);
  try {
    labeledFaceDescriptors = await Promise.all(
      labels.map(async (label) => {
        const descriptorsFilePath = path.join(
          __dirname,
          `../labels/${label}/descriptors.json`
        );
        let descriptions = [];
        if (fs.existsSync(descriptorsFilePath)) {
          console.log(`Loading descriptors for ${label} from file...`);
          const descriptiorsData = fs.readFileSync(descriptorsFilePath, "utf8");
          descriptions = JSON.parse(descriptiorsData).map(
            (descriptor) => new Float32Array(Object.values(descriptor))
          );
        } else {
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
          fs.writeFileSync(descriptorsFilePath, JSON.stringify(descriptions));
          console.log(`Descriptors for ${label} written to file`);
        }
        console.log("labelled face descriptiors are loaded");
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  } catch (error) {
    console.error("Error loading labeled face descriptors:", error);
    // Handle or re-throw the error as needed
    throw error;
  }
}

async function convertJpgToImageElement(jpgPath) {
  try {
    const imageData = await fs.promises.readFile(jpgPath);
    const canvas = createCanvas(1, 1);
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.src = imageData;

    return img;
  } catch (error) {
    console.error("Error converting JPG to HTMLImageElement:", error);
    throw error;
  }
}

// Load models and labeled face descriptors when the server starts
async function startServer() {
  try {
    await loadModels();
    await loadLabeledFaceDescriptors();
    // Start the server after loading models and labeled face descriptors
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
}

startServer();

// Endpoint to receive frame data from frontend
app.post("/api/frame", async (req, res) => {
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
