import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Menu from "./Menu";
import rough from "roughjs/bundled/rough.esm";
import { actions, cursorPositions, toolTypes } from "../constants";
import {
  createElement,
  updateElement,
  drawElement,
  adjustmentRequired,
  adjustElementCoordinates,
  getElementAtPosition,
  getCursorForPosition,
  getResizedCoordinates,
  updatePencilElementWhenMoving,
} from "./utils";
import { v4 as uuid } from "uuid";
import { setMessages, updateElement as updateElementInStore } from "./whiteboardSlice";
import { emitAudioStream, emitCursorPosition, emitMessages, emitStudentSleeping, quiz } from "../socketConn/socketConn";
import ring from '.././resources/audio/ring.mp3'
import { store } from "../store/store";
import { clearAudioStream } from "../store/audioSlice";

let emitCursor = true;
let lastCursorPosition;

const Whiteboard = ({ role, userID, roomID }) => {
  const canvasRef = useRef();
  const textAreaRef = useRef();
  console.log(role)
  if (role === "teacher") {
    emitCursor = true
  } else {
    emitCursor = false
  }

  // eslint-disable-next-line
  const [moveCanvas, setMoveCanvas] = useState("");
  // eslint-disable-next-line
  const toolType = useSelector((state) => state.whiteboard.tool);
  // eslint-disable-next-line
  const elements = useSelector((state) => state.whiteboard.elements);
  // eslint-disable-next-line
  const sleptStudent = useSelector((state) => state.whiteboard.slepingStudent);
  const messages = useSelector((state) => state.whiteboard.messages);
  const quizAnswer = useSelector((state) => state.whiteboard.quizAnswer);
  const [pollResult, setPollResult] = useState(false);
  const [iscorrect, setIsCorrect] = useState(null)
  const [resultPoll, setResultPoll] = useState('')
  const [mousePosition, setMousePosition] = useState({
    x: 0,
    y: 0
  })
  const [openImageModel, setOpenImageModel] = useState()
  const [imageUrl, setImageUrl] = useState()
  const [input, setInput] = useState('')

  const [action, setAction] = useState(null);
  // eslint-disable-next-line
  const [wakeupIndex, setWakeupIndex] = useState(0);
  const [openChatModal, setOpenChatModal] = useState(false);
  const [poleDialogue, setPoleDialogue] = useState(false)
  // eslint-disable-next-line
  const [pollAnswer, setPoleAnswer] = useState(null)
  const [selectedElement, setSelectedElement] = useState(null);
  const [showPopup, setShowPopup] = useState(false)
  const dispatch = useDispatch();
  const audioRef = useRef(null)




  const audioStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Select audio-related state from Redux
  // eslint-disable-next-line
  const activeAudioSource = useSelector(state => state.audioStreaming.activeAudioSource);
  const audioStream = useSelector(state => state.audioStreaming.audioStream);


















  useEffect(() => {
    // Audio streaming setup for teacher
    if (role === 'teacher') {
      const startAudioCapture = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });

          audioStreamRef.current = stream;
          mediaRecorderRef.current = new MediaRecorder(stream);

          const audioChunks = [];

          mediaRecorderRef.current.addEventListener("dataavailable", (event) => {
            audioChunks.push(event.data);
          });

          mediaRecorderRef.current.addEventListener("stop", () => {
            const audioBlob = new Blob(audioChunks);
            audioChunks.length = 0; // Clear the array

            const fileReader = new FileReader();
            fileReader.readAsDataURL(audioBlob);
            fileReader.onloadend = () => {
              const base64String = fileReader.result;
              emitAudioStream({
                audioData: base64String,
                roomID,
                userID
              });
            };

            // Restart recording
            mediaRecorderRef.current.start();
            setTimeout(() => {
              mediaRecorderRef.current.stop();
            }, 100);
          });

          // Initial start
          mediaRecorderRef.current.start();
          setTimeout(() => {
            mediaRecorderRef.current.stop();
          }, 100);
        } catch (error) {
          console.error('Error setting up audio capture:', error);
        }
      };

      startAudioCapture();
    }

    // Cleanup function
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      dispatch(clearAudioStream());
    };
  }, [role, roomID, userID, dispatch]);

  // Optional: Audio playback for students
  useEffect(() => {
    if (role === 'student' && audioStream) {
      const audio = new Audio(audioStream);
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        dispatch(clearAudioStream());
      });

      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [audioStream, role, dispatch]);













  const doNotSendData = () => {
    setWakeupIndex(0)
    if (audioRef.current) {
      resetAudio()
    }
    setShowPopup(false)
  }


  useEffect(() => {
    if (role === "student") {
      const popupInterval = setInterval(() => {
        setShowPopup(true);
        setWakeupIndex((prev) => {
          const newCount = prev + 1;
          if (newCount === 3) {

            audioRef.current = new Audio(ring)
            playAudio()
            console.log(userID);

            emitStudentSleeping(userID, roomID)
          }
          return newCount
        })

      }, 1 * 60 * 1000); // Every 3 minutes

      return () => clearInterval(popupInterval); // Cleanup interval on unmount
    }
  }, [role]);


  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log(elements);


    const roughCanvas = rough.canvas(canvas);

    elements.forEach((element) => {
      drawElement({ roughCanvas, context: ctx, element });
    });
  }, [elements]);


  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  const resetAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause(); // Pause the audio
      audioRef.current.currentTime = 0; // Reset the playback position to the start
    }
  };

  const handleMouseDown = (event) => {
    const { clientX, clientY } = event;

    const adjustedY = clientY

    if (selectedElement && action === actions.WRITING) {
      return;
    }

    switch (toolType) {
      case toolTypes.RECTANGLE:
      case toolTypes.LINE:
      case toolTypes.PENCIL: {
        const element = createElement({
          x1: clientX,
          y1: adjustedY,
          x2: clientX,
          y2: adjustedY,
          toolType,
          id: uuid(),
        });

        console.log(clientY);
        console.log(adjustedY);


        setAction(actions.DRAWING);
        setSelectedElement(element);
        dispatch(updateElementInStore(element));
        break;
      }
      case toolTypes.TEXT: {
        const element = createElement({
          x1: clientX,
          y1: clientY,
          x2: clientX,
          y2: clientY,
          toolType,
          id: uuid(),
        });

        setAction(actions.WRITING);
        setSelectedElement(element);
        dispatch(updateElementInStore(element));
        break;
      }

      case toolTypes.IMAGE: {
        setOpenImageModel(true)
        setMousePosition({ x: clientX, y: clientY })
        break;
      }

      case toolTypes.SELECTION: {
        const element = getElementAtPosition(clientX, clientY, elements);

        if (
          element &&
          (element.type === toolTypes.RECTANGLE ||
            element.type === toolTypes.TEXT ||
            element.type === toolTypes.LINE || element.type === toolTypes.IMAGE)
        ) {
          setAction(
            element.position === cursorPositions.INSIDE
              ? actions.MOVING
              : actions.RESIZING
          );

          const offsetX = clientX - element.x1;
          const offsetY = clientY - element.y1;

          setSelectedElement({ ...element, offsetX, offsetY });
        }

        if (element && element.type === toolTypes.PENCIL) {
          setAction(actions.MOVING);

          const xOffsets = element.points.map((point) => clientX - point.x);
          const yOffsets = element.points.map((point) => clientY - point.y);

          setSelectedElement({ ...element, xOffsets, yOffsets });
        }
        break;
      }

      default: {
        return
      }
    }
  };


  const handleMouseUp = () => {
    const selectedElementIndex = elements.findIndex(
      (el) => el.id === selectedElement?.id
    );

    if (selectedElementIndex !== -1) {
      if (action === actions.DRAWING || action === actions.RESIZING) {
        if (adjustmentRequired(elements[selectedElementIndex].type)) {
          const { x1, y1, x2, y2 } = adjustElementCoordinates(
            elements[selectedElementIndex]
          );

          updateElement(
            {
              id: selectedElement.id,
              index: selectedElementIndex,
              x1,
              x2,
              y1,
              y2,
              type: elements[selectedElementIndex].type,
            },
            elements, roomID
          );
        }
      }
    }

    setAction(null);
    setSelectedElement(null);
  };

  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;

    lastCursorPosition = { x: clientX, y: clientY };

    if (emitCursor) {
      emitCursorPosition({ x: clientX, y: clientY });
      emitCursor = false;

      console.log("sending-position");

      setTimeout(() => {
        emitCursor = true;
        emitCursorPosition(lastCursorPosition);
      }, [50]);
    }

    if (action === actions.DRAWING) {
      // find index of selected element
      const index = elements.findIndex((el) => el.id === selectedElement.id);

      if (index !== -1) {
        updateElement(
          {
            index,
            id: elements[index].id,
            x1: elements[index].x1,
            y1: elements[index].y1,
            x2: clientX,
            y2: clientY,
            type: elements[index].type,
          },
          elements, roomID
        );
      }
    }

    if (toolType === toolTypes.SELECTION) {
      const element = getElementAtPosition(clientX, clientY, elements);

      event.target.style.cursor = element
        ? getCursorForPosition(element.position)
        : "default";
    }

    if (
      selectedElement &&
      toolType === toolTypes.SELECTION &&
      action === actions.MOVING &&
      selectedElement.type === toolTypes.PENCIL
    ) {
      const newPoints = selectedElement.points.map((_, index) => ({
        x: clientX - selectedElement.xOffsets[index],
        y: clientY - selectedElement.yOffsets[index],
      }));

      const index = elements.findIndex((el) => el.id === selectedElement.id);

      if (index !== -1) {
        updatePencilElementWhenMoving({ index, newPoints }, elements);
      }

      return;
    }

    if (
      toolType === toolTypes.SELECTION &&
      action === actions.MOVING &&
      selectedElement
    ) {
      const { id, x1, x2, y1, y2, type, offsetX, offsetY, text } =
        selectedElement;

      const width = x2 - x1;
      const height = y2 - y1;

      const newX1 = clientX - offsetX;
      const newY1 = clientY - offsetY;

      const index = elements.findIndex((el) => el.id === selectedElement.id);

      if (index !== -1) {
        updateElement(
          {
            id,
            x1: newX1,
            y1: newY1,
            x2: newX1 + width,
            y2: newY1 + height,
            type,
            index,
            text,
          },
          elements, roomID
        );
      }
    }

    if (
      toolType === toolTypes.SELECTION &&
      action === actions.RESIZING &&
      selectedElement
    ) {
      const { id, type, position, ...coordinates } = selectedElement;
      const { x1, y1, x2, y2 } = getResizedCoordinates(
        clientX,
        clientY,
        position,
        coordinates
      );

      const selectedElementIndex = elements.findIndex(
        (el) => el.id === selectedElement.id
      );

      if (selectedElementIndex !== -1) {
        updateElement(
          {
            x1,
            x2,
            y1,
            y2,
            type: selectedElement.type,
            id: selectedElement.id,
            index: selectedElementIndex,
          },
          elements, roomID
        );
      }
    }
  };

  const handleTextareaBlur = (event) => {
    const { id, x1, y1, type } = selectedElement;

    const index = elements.findIndex((el) => el.id === selectedElement.id);

    if (index !== -1) {
      updateElement(
        { id, x1, y1, type, text: event.target.value, index },
        elements, roomID
      );

      setAction(null);
      setSelectedElement(null);
    }
  };

  const handleSendChat = () => {
    const dataToSend = { message: input, userID: userID }
    const messageCopy = [...messages, dataToSend]
    console.log(messageCopy);

    store.dispatch(setMessages(messageCopy))
    emitMessages({ userID, message: input, roomID, messageCopy })
  }

  const manageQuizClick = (correctAnswer) => {
    console.log('quiz clicked');

    setPoleAnswer(correctAnswer)
    quiz({ correctAnswer, roomID })
    setPoleDialogue(false)
  }

  const handleStudentAnswer = (selectedAnswer) => {

    if (selectedAnswer === quizAnswer) {
      setResultPoll("Congrats You Have Answered Correctly")
      console.log(`is correct ${iscorrect}`);

    } else {
      setResultPoll("Oops wrong answer, better luck next time")
    }
    setPollResult(true)

    setTimeout(() => {
      setPollResult(false)
      setResultPoll("")
      setIsCorrect(null)
    }, 7000);
  }



  return (
    <>
      {role === 'teacher' && (
        <>
          <Menu roomID={roomID} />
          {action === actions.WRITING ? (
            <textarea
              ref={textAreaRef}
              onBlur={handleTextareaBlur}
              style={{
                position: "absolute",
                top: selectedElement.y1 - 3,
                left: selectedElement.x1,
                font: "24px sans-serif",
                margin: 0,
                padding: 0,
                border: 0,
                outline: 0,
                resize: "auto",
                overflow: "hidden",
                whiteSpace: "pre",
                background: "transparent",
              }}
            />
          ) : null}
        </>
      )}

      {openImageModel && (
        <div
          style={{
            position: "absolute",
            top: '50%',
            left: '50%',
            background: "white",
            padding: "20px",
            border: "1px solid black",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <input
            type="text"
            placeholder="Enter image URL"
            value={imageUrl || ""}
            onChange={(e) => setImageUrl(e.target.value)}
            style={{ marginBottom: "10px", width: "200px", padding: "5px" }}
          />
          <div>
            <button
              onClick={(e) => {
                if (imageUrl) {
                  // Add the image element to the canvas
                  const element = createElement({
                    x1: mousePosition.x,
                    y1: mousePosition.y,
                    x2: mousePosition.x + 600,
                    y2: mousePosition.y + 600,
                    toolType: toolTypes.IMAGE,
                    id: uuid(),
                    src: imageUrl,
                    roomID
                  });

                  setSelectedElement(element);
                  dispatch(updateElementInStore(element));
                }
                setOpenImageModel(false);
                setImageUrl(""); // Clear input field
              }}
              style={{ marginRight: "10px" }}
            >
              Add
            </button>
            <button onClick={() => setOpenImageModel(false)}>Cancel</button>
          </div>
        </div>
      )}

      {role === 'student' &&
        showPopup && (
          <div style={{
            padding: '4px',
            border: '2px solid black',
            width: '200px',
            position: 'absolute',
            top: '50%',
            left: '50%',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#787878',
            color: '#fff',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <h2>Are You Awake ?</h2>
            <button className="awake-button"
              style={{
                padding: '10px',
                width: '50px',
              }}
              onClick={() => { doNotSendData() }}
            >Yes</button>
          </div>
        )
      }

      <canvas
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        ref={canvasRef}
        className={moveCanvas}
        width={window.innerWidth}
        height={window.innerHeight}
        id="canvas"
      />

      {role === 'teacher' && sleptStudent && (
        <div
          style={{
            position: 'absolute',
            fontSize: '1.2rem',
            bottom: 20,
            right: 10
          }}
        >
          {sleptStudent} is sleeping
        </div>
      )}

      {openChatModal && (
        <div className="chat-container">
          <div className="chat-display">
            {messages.map((msg, index) => (
              <div key={index} className="chat-message">
                from : {msg.userID}  : : {msg.message}
              </div>
            ))}
          </div>
          <div className="chat-input-container">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="chat-input"
            />
            <button onClick={() => { handleSendChat() }} className="chat-send-button">
              Send
            </button>
            <button className="chat-send-button" onClick={() => { setOpenChatModal(false) }}>
              Close
            </button>
          </div>
        </div>
      )}
      {
        role === 'teacher' && (
          <button onClick={() => setPoleDialogue(true)} style={{
            right: 120
          }} className="chatbutton">
            conduct poll
          </button>
        )
      }

      {
        role === 'teacher' && poleDialogue && (
          <div className="papa-button-container">
            <h3>Please select the correct answer</h3>
            <div className="button-container">
              <button className="button" onClick={() => { manageQuizClick(1) }}>Option 1</button>
              <button className="button" onClick={() => { manageQuizClick(2) }}>Option 2</button>
              <button className="button" onClick={() => { manageQuizClick(3) }}>Option 3</button>
              <button className="button" onClick={() => { manageQuizClick(4) }}>Option 4</button>
            </div>
          </div>

        )
      }

      {
        role === 'student' && quizAnswer && (
          <div className="papa-button-container">
            <h3>Please select the correct answer</h3>

            {
              pollResult && (
                <div>
                  <h2>
                    {resultPoll}
                  </h2>
                </div>
              )
            }

            <div className="button-container">
              <button className="button" onClick={() => { handleStudentAnswer(1) }}>Option 1</button>
              <button className="button" onClick={() => { handleStudentAnswer(2) }}>Option 2</button>
              <button className="button" onClick={() => { handleStudentAnswer(3) }}>Option 3</button>
              <button className="button" onClick={() => { handleStudentAnswer(4) }}>Option 4</button>
            </div>
          </div>
        )
      }

      <button onClick={() => setOpenChatModal(true)} className="chatbutton">
        Open Chat
      </button>

    </>
  );
};

export default Whiteboard;
