const express = require("express");
const fs = require("fs");
var cors = require("cors");

// Start ExpressJS Web Server
const app = express();
app.use(cors());

// Get SSL files for Web Server
const options = {
  key: fs.readFileSync("./ssl/privatekey.key"),
  cert: fs.readFileSync("./ssl/certificate.crt")
};

// Start HTTPS Server and attach ExpressJS into it
const https = require("https");
const secureServer = https.createServer(options, app);

//  Ledge IO Server and set Origins
const io = require("socket.io")(secureServer);
io.set("origins", "*:*");
const port = process.env.PORT || 8118;

//  Socket Callback
function onConnection(socket) {
  console.log("connected");
  socket.on("drawTempLine", data => {
    socket.broadcast.emit("drawTempLine", data);
    console.log("drawing templine");
  });
  socket.on("drawLine", data => {
    socket.broadcast.emit("drawLine", data);
    console.log("drawingline");
  });
  socket.on("clear", () => socket.broadcast.emit("clear"));
  socket.on("undo", () => socket.broadcast.emit("undo"));
  socket.on("redo", () => socket.broadcast.emit("redo"));
  socket.on("drawCircle", data => socket.broadcast.emit("drawCircle", data));
  socket.on("drawTempCircle", data =>
    socket.broadcast.emit("drawTempCircle", data)
  );
  socket.on("erase", data => socket.broadcast.emit("erase", data));
  socket.on("copyCanvas", data => {
    socket.broadcast.emit("copyCanvas", data);
  });

  socket.on("emitWindowSize", data => {
    socket.broadcast.emit("emitWindowSize", data);
  });

  socket.on("agentEmit", data => {
    socket.broadcast.emit("agentEmit", data);
  });
}

// Ledge CB to Socket
io.on("connection", onConnection);

// Allow Server to Listen
secureServer.listen(port, () => console.log("listening on port " + port));
