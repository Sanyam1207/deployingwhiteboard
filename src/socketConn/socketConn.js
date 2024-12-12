import { io } from "socket.io-client";
import {
  updateCursorPosition,
  removeCursorPosition,
} from "../CursorOverlay/cursorSlice";
import { store } from "../store/store";
import { setElements, setMessages, setQuizAnswer, setSleepingStudent, updateElement } from "../Whiteboard/whiteboardSlice";
import { clearAudioStream, setActiveAudioSource, setAudioStream } from "../store/audioSlice";

let socket;

export const connectWithSocketServer = (roomID, userID) => {
  socket = io("http://localhost:3003");
  console.log(`room ID from connect to socket : : ${roomID} : : ${userID}`);

  socket.on("connect", () => {
    console.log("connected to socket.io server");
    socket.emit("join-room", { userID, roomID });
  });

  socket.on("whiteboard-state", (data) => {
    const { elements } = data;
    store.dispatch(setElements(elements)); // Set elements for the whiteboard
  });

  socket.on("element-update", (elementData) => {
    store.dispatch(updateElement(elementData)); // Update the whiteboard with new element
  });

  socket.on("whiteboard-clear", () => {
    store.dispatch(setElements([])); // Clear the whiteboard
  });

  socket.on('student-sleeping', (userID) => {
    console.log(`Student ID : : ${userID}`);
    store.dispatch(setSleepingStudent(userID))

    setTimeout(() => {
      store.dispatch(setSleepingStudent(null))
    }, 8000);
  })

  socket.on("cursor-position", (cursorData) => {
    store.dispatch(updateCursorPosition(cursorData)); // Update cursor position
  });

  socket.on("user-disconnected", (disconnectedUserId) => {
    store.dispatch(removeCursorPosition(disconnectedUserId)); // Remove cursor for disconnected user
  });

  socket.on('message', ({ userID, message, roomID, messageCopy }) => {
    console.log(`Message copy : : ${messageCopy}`);

    store.dispatch(setMessages(messageCopy))
  })

  socket.on('quiz', ({ correctAnswer }) => {
    store.dispatch(setQuizAnswer(correctAnswer))
    console.log(`correct from socket.on ${correctAnswer}`);

    setTimeout(() => {
      store.dispatch(setQuizAnswer(null))
    }, 1 * 15 * 500);
  })

  socket.on('audioStream', ({ audioData, userID }) => {
    try {
      // Validate audio data
      if (!audioData) return;

      // Process audio data
      const newData = audioData.split(";");
      newData[0] = "data:audio/ogg;";
      const processedAudioSrc = newData[0] + newData[1];

      // Dispatch to Redux store
      store.dispatch(setAudioStream(processedAudioSrc));
      store.dispatch(setActiveAudioSource(userID));

      // Optional: Create and play audio
      const audio = new Audio(processedAudioSrc);
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        store.dispatch(clearAudioStream());
      });
    } catch (error) {
      console.error('Error processing audio stream:', error);
      store.dispatch(clearAudioStream());
    }
  });
};

export const emitElementUpdate = (elementData, roomID) => {
  console.log(elementData);

  socket.emit("element-update", { elementData, roomID });
};

export const emitClearWhiteboard = (roomID) => {
  socket.emit("whiteboard-clear", roomID);
};

export const emitCursorPosition = (cursorData, roomID) => {
  socket.emit("cursor-position", { cursorData, roomID });
};

export const emitStudentSleeping = (userID, roomID) => {
  console.log(`Student ID : : ${userID}, room ID : : : : : ${roomID}`);

  socket.emit('student-sleeping', { userID, roomID })
}

export const emitMessages = ({ userID, message, roomID, messageCopy }) => {
  socket.emit('message', { userID, message, roomID, messageCopy })
}

export const quiz = ({ correctAnswer, roomID }) => {
  console.log(`correct asnwer :  :${correctAnswer}`);

  socket.emit('quiz', { correctAnswer, roomID })
}

export const emitAudioStream = ({audioData, roomID, userID}) => {
  socket.emit('audioStream', { 
    audioData, 
    roomID,
    userID // Include user ID to identify the audio source
  })}