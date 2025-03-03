import React, { useEffect, useRef } from "react";

function VoiceChat() {
  // const [audioChunks, setAudioChunks] = useState([]);
  const audioChunks = useRef([]);
  const mediaRecorder = useRef(null);
  const websocket = useRef(null);
  const audioPlayer = useRef(new Audio());

  useEffect(() => {
    websocket.current = new WebSocket("ws://localhost:8000/ws"); // Adjust URL if needed

    websocket.current.onopen = () => {
      console.log("WebSocket connected");
    };

    websocket.current.onmessage = (event) => {
      const audioBlob = new Blob([event.data], { type: "audio/wav" }); // or audio/ogg, depending on your backend
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPlayer.current.src = audioUrl;
      audioPlayer.current.play();
    };

    websocket.current.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      if (websocket.current) {
        websocket.current.close();
      }
      if (
        mediaRecorder.current &&
        mediaRecorder.current.state === "recording"
      ) {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      }); // or audio/ogg

      mediaRecorder.current.ondataavailable = (event) => {
        console.log("***********event.data.size", event.data.size);
        if (event.data.size > 0) {
          audioChunks.current = [...audioChunks.current, event.data];
        }
      };

      mediaRecorder.current.onstop = () => {
        console.log("*********audioChunks", audioChunks.current);
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" }); // or audio/ogg
        audioChunks.current = [];
        console.log("Audio Blob Size:", audioBlob.size);
        if (
          websocket.current &&
          websocket.current.readyState === WebSocket.OPEN
        ) {
          audioBlob.arrayBuffer().then((buffer) => {
            websocket.current.send(
              JSON.stringify({ audio: Array.from(new Uint8Array(buffer)) })
            );
          });
        }
      };

      mediaRecorder.current.start();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    }
  };

  console.log("****************audioChunks", audioChunks);
  return (
    <div>
      <button onMouseDown={startRecording} onMouseUp={stopRecording}>
        Hold to Talk
      </button>
      <audio ref={audioPlayer} controls />
    </div>
  );
}

export default VoiceChat;
