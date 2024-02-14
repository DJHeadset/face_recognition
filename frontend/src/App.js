import React, { useState, useRef } from "react";

const CameraStream = () => {
  const videoRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [frameCounter, setFrameCounter] = useState(0);
  const [status, setStatus] = useState("login");
  const [userName, setUserName] = useState("");
  const [loggedIn, setLoggedIn] = useState("");

  const sendNextFrameIfNoName = async () => {
    try {
      const data = await captureFrame();
      if (data.names.length === 0) {
        console.log("No name found, sending another frame.");

        sendNextFrameIfNoName(); // Send next frame
        setFrameCounter((prevCounter) => prevCounter + 1);
      } else {
        setLoggedIn(data.names[0]);
        stopStreaming(); // Stop streaming if name is returned
      }
    } catch (error) {
      console.error("Error sending frame to backend:", error);
    }
  };

  const captureFrame = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg");

    // Send the frame to the backend
    const response = await fetch(`/api/${status}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ frameData: dataUrl, name: userName }),
    });

    return response.json();
  };

  const startStreaming = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        setStreaming(true);
        sendNextFrameIfNoName(); // Send the first frame when streaming starts
      })
      .catch((err) => console.error("Error accessing camera:", err));
  };

  const stopStreaming = () => {
    const stream = videoRef.current.srcObject;
    const tracks = stream.getTracks();

    tracks.forEach((track) => track.stop());
    videoRef.current.srcObject = null;
    setStreaming(false);
  };

  const handleNameChange = (name) => {
    setUserName(name);
  };

  const handleStatusChange = () => {
    if (status === "login") {
      setStatus("register");
    } else {
      setStatus("login");
    }
  };

  const handleButtonClick = () => {
    if (streaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  };

  return (
    <div>
      <h1>{status}</h1>

      {status === "register" && (
        <input
          type="text"
          placeholder="Name"
          onChange={(e) => handleNameChange(e.target.value)}
        />
      )}
      {status === "login" && <h2>User logged in: {loggedIn}</h2>}
      <button onClick={handleStatusChange}>
        {status === "login" ? "Register" : "Login"}
      </button>
      <button onClick={handleButtonClick}>
        {streaming ? "Stop Streaming" : "Start Streaming"}
      </button>
      <p>Frame Counter: {frameCounter}</p>
      <video ref={videoRef} autoPlay />
    </div>
  );
};

export default CameraStream;
