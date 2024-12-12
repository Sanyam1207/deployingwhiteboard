import React, { useEffect } from "react";
import CursorOverlay from "../CursorOverlay/CursorOverlay";
import { connectWithSocketServer } from "../socketConn/socketConn";
import Whiteboard from "./Whiteboard";
import { useLocation } from "react-router-dom";

function WhiteboardPage() {
  

  const location = useLocation();
  const data = location.state;
  console.log(data);


  useEffect(() => {
    connectWithSocketServer(data.roomID, data.userID);
  }, []);

  return (
    <div>
      <Whiteboard role={data.role} userID={data.userID} roomID={data.roomID} />
      <CursorOverlay />
    </div>
  );
}

export default WhiteboardPage;
