const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 8118;

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

io.on("connection", onConnection);

http.listen(port, () => console.log("listening on port " + port));
