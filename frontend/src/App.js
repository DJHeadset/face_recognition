import React, { useState, useRef } from "react";

const CameraStream = () => {
  const videoRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [frameCounter, setFrameCounter] = useState(0);

  const sendNextFrameIfNoName = async () => {
    try {
      const data = await captureFrame();
      if (data.names.length === 0) {
        console.log("No name found, sending another frame.");
        sendNextFrameIfNoName(); // Send next frame
        setFrameCounter((prevCounter) => prevCounter + 1); // Increment frame counter
      } else {
        console.log("Name:", data.names[0]);
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
    const response = await fetch(`/api/frame`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ frameData: dataUrl }),
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

  const handleButtonClick = () => {
    if (streaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  };

  return (
    <div>
      <button onClick={handleButtonClick}>
        {streaming ? "Stop Streaming" : "Start Streaming"}
      </button>
      <p>Frame Counter: {frameCounter}</p>
      <video ref={videoRef} autoPlay />
    </div>
  );
};

export default CameraStream;
