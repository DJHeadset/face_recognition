require("dotenv").config();
const Mongoose = require("mongoose");
const { MONGO_URL, PORT = 27017 } = process.env;

if (!MONGO_URL) {
  console.error("Missing MONGO_URL environment variable");
  process.exit(1);
}

const connectDB = async () => {
  await Mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("MongoDB Connected");
};
module.exports = connectDB;
