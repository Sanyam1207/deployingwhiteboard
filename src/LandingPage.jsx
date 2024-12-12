import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LandingPage = () => {
  const [role, setRole] = useState("");
  const [roomID, setRoomID] = useState(""); // Room ID input
  const [userID, setUserID] = useState(""); // User ID input
  const roleRef = useRef()
  const userIDRef = useRef()
  const navigate = useNavigate();
  const location = useLocation()

  useEffect(() => {
    // Parse query parameters from the URL
    const params = new URLSearchParams(location.search);
    const queryRole = params.get("role");
    const queryRoomID = params.get("roomID");
    const userID = params.get("userID");

    if (queryRole && queryRoomID) {
      // If role and roomID are found, redirect to whiteboard
      navigate("/whiteboard", { state: { role: queryRole, roomID: queryRoomID, userID: userID } });
    }
  }, [location, navigate]);


  const handleRedirect = async (e) => {
    e.preventDefault();
    setUserID(userIDRef.current.value)
    setRole(roleRef.current.value)
    const data = { roomID, role }
    navigate("/whiteboard", { state: data })
    console.log("Redirected");
  }

  return (
    <div>
      <h1>Select Your Role</h1>
      <form onSubmit={handleRedirect}>
        <div>
          <label>Role:</label>
          <select ref={roleRef} onChange={(e) => setRole(e.target.value)} value={role}>
            <option value="">Select Role</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>
        <div>
          <label>Room ID:</label>
          <input
            type="text"
            value={roomID}
            onChange={(e) => setRoomID(e.target.value)}
            placeholder="Enter Room ID"
          />
        </div>

        <div>
          <label>User ID:</label>
          <input ref={userIDRef}
            type="text"
            value={userID}
            onChange={(e) => setUserID(e.target.value)}
            placeholder="Enter User ID"
          />
        </div>
        <button type="submit" onClick={handleRedirect}>Join Whiteboard</button>
        <button onClick={handleRedirect}>gsffdg</button>
      </form>
    </div>
  );
};

export default LandingPage;
