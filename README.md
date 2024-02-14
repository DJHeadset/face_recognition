# Face Recognition Server

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
- [Usage](#usage)

## Description

This is a Node.js server application for face recognition tasks, such as user login and registration. It uses Express.js for handling HTTP requests and face-api.js for face detection and recognition.

## Features

- User login: Recognizes users based on their face and allows them to log in.
- User registration: Registers new users by recognizing their faces and storing their information in a MongoDB database.

## Technologies Used

<img alt="Static Badge" src="https://img.shields.io/badge/Mongo-mongo?logo=mongodb&color=green" height="30"> <img alt="Static Badge" src="https://img.shields.io/badge/Express-express?logo=express&color=black" height="30"> <img alt="Static Badge" src="https://img.shields.io/badge/React-react?logo=react&color=blue" height="30"> <img alt="Static Badge" src="https://img.shields.io/badge/Node.js-node?logo=nodedotjs&color=white" height="30">
<img alt="Static Badge" src="https://img.shields.io/badge/Canvas-canvas?logo=canvas&color=grey" height="30">

## Installation

1. Clone the repository:

```
git clone git@github.com:DJHeadset/face_recognition.git
```

2. Navigate to the project backend and install dependencies:

```
cd backend
npm i
```

3. Set up MongoDB:

   - Install MongoDB and start the MongoDB server.

4. Update the `.env` file with your MongoDB connection string.

5. For first time running and regular updates run the seeding program

```
npm run seed
```

6. Start the server

```
npm run dev
```

7. Open a new terminal, navigate to frontend directory, install dependencies and start the application

```
cd frontend
npm i
npm start
```

8. The frontend can be accessed in the browser through http://localhost:3000/

## Usage

### Server

#### Login

- **URL**: `/api/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "frameData": "base64_encoded_image_frame"
  }
  ```
- Response

    ```json
    {
      "names": ["username1", "username2"]
    }

#### Register
- **URL**: `/api/register`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "name": "username",
    "frameData": "base64_encoded_image_frame"
  }
  ```
- Response

    ```json
    {
    "message": "New user created",
    "names": "username"
    }

### Seed
in order for the seeder to find the pictures the folder structure should be like so:
```
root
    frontend
    backend
    labels
        username
            1.jpg
            2.jpg
        username
            1.jpg
            2.jpg
        ...
```
The seeder will look for folder names inside the 'label' folder and them as usernames. There has to be 2 pictures in there with the faces clearly showing in order to get good data. The seeder will use theese images to populate the database