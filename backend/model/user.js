const Mongoose = require("mongoose");

const UserSchema = new Mongoose.Schema({
    username: {
      type: String,
      required: true
    },
    faceDescriptors: {
        type: [Object],
        required: true
      }
  });

const User = Mongoose.model("user", UserSchema);
module.exports = User;
