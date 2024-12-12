const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const server = http.createServer(app);

app.use(cors());
app.use(express.json())

let users = new Map()
let socketMap = new Map()
let elements = [];

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});


io.on("connection", (socket) => {
  
  socket.on('join-room', ({userID, roomID}) => {
    socket.join(roomID)
  })
  
  io.to(socket.id).emit("whiteboard-state", {elements});
  
  socket.on("element-update", ({elementData, roomID}) => {
    updateElementInElements(elementData);
    


    socket.broadcast.to(roomID).emit("element-update", elementData);
  });

  socket.on('student-sleeping', ({userID, roomID}) => {
    socket.broadcast.to(roomID).emit('student-sleeping', userID)
  })

  socket.on('message', ({userID, message, roomID, messageCopy}) => {
    socket.broadcast.to(roomID).emit('message', {userID, message, roomID, messageCopy})
  })

  socket.on("whiteboard-clear", (roomID) => {
    elements = [];

    socket.broadcast.to(roomID).emit("whiteboard-clear");
  });

  socket.on("cursor-position", ({cursorData, roomID}) => {
    socket.broadcast.to(roomID).emit("cursor-position", {
      ...cursorData,
      userId: socket.id,
    });
  });

  socket.on('quiz', ({correctAnswer, roomID}) => {
    console.log(correctAnswer);
    
    socket.broadcast.to(roomID).emit('quiz', {correctAnswer})
  })


  socket.on('audioStream', ({audioData, roomID}) => {
    socket.broadcast.to(roomID).emit('audioStream', {audioData});
  });



  socket.on("disconnect", () => {
    socket.broadcast.emit("user-disconnected", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Hello server is working");
});

app.post("/", (req, res) => {
  const { role, roomID, userID } = req.body
  tempRoomID = roomID
  console.log('role' + role);
  users.set(userID, {role: role, socketID: null})
})

const PORT = process.env.PORT || 3003;

server.listen(PORT, () => {
  console.log("server is running on port", PORT);
});

const updateElementInElements = (elementData) => {
  const index = elements.findIndex((element) => element.id === elementData.id);

  if (index === -1) return elements.push(elementData);

  elements[index] = elementData;
};
