"use strict";

import io from "socket.io-client";

// VARIABLE DECLARATION
const socket = io.connect("https://10.138.224.224:8118", {
  rejectUnauthorized: false
});
// canvas
const tempCanvas = document.getElementById("temp-canvas");
const canvas = document.getElementById("overlay");
const context = canvas.getContext("2d");
const tempContext = tempCanvas.getContext("2d");

// variables
let current = {
  color: "black",
  x: "",
  y: "",
  stateNum: 0,
  strokeWidth: 0,
  drawMode: ""
};
let drawing = false;
let lastEraseTime = new Date().getTime();
const eraserRadius = 10;
const eraseDelay = 200;
let circleStart = { x: 0, y: 0, length: 0, height: 0 };
const tempLine = [];
const actions = [];
let agentCanvasWidth;

const drawMode = {
  PEN: "pen",
  HIGHLIGHTER: "highlighter",
  ERASER: "eraser",
  CIRCLE: "circle",
  RECTANGLE: "rectangle"
};

const actionType = {
  LINE: "line",
  HIGHLIGHTER: "highlighter",
  CLEAR: "clear",
  ERASE: "erase",
  CIRCLE: "circle",
  RECTANGLE: "rectangle"
};

// ACTIONS CLASS SYSTEM
class Action {
  constructor() {
    this.visible = true;
    actions.length = current.stateNum;
  }
  draw() {
    clearTemp();
  }
}

class LineAction extends Action {
  constructor(lines) {
    super();
    this.lines = lines;
    this.type = actionType.LINE;
    this.draw();
  }
  draw() {
    super.draw();

    let lines = this.lines;
    let w = canvas.width;
    let h = canvas.height;

    for (let i = 0; i < lines.length; i++) {
      drawLine(
        lines[i].x0 * w,
        lines[i].y0 * h,
        lines[i].x1 * w,
        lines[i].y1 * h,
        lines[i].color,
        lines[i].strokeWidth,
        context
      );
    }
  }
}

class EraseAction extends Action {
  constructor(eraseNum) {
    super();
    this.eraseNum = eraseNum;
    this.type = actionType.ERASE;
    this.draw();
    redrawActions(current.stateNum);
  }
  draw() {
    actions[this.eraseNum].visible = false;
  }
}

class CircleAction extends Action {
  constructor(circleData) {
    super();
    this.type = actionType.CIRCLE;
    this.circleData = circleData;
    this.draw();
  }
  draw() {
    super.draw();
    drawCircle(
      this.circleData.x0,
      this.circleData.y0,
      this.circleData.x1,
      this.circleData.y1,
      this.circleData.color,
      this.circleData.context
    );
  }
}

class ClearAction extends Action {
  constructor() {
    super();
    this.type = actionType.CLEAR;
    this.draw();
  }
  draw() {
    super.draw();
    clearDrawing();
  }
}

// LISTENERS
window.addEventListener("resize", onResize, false);
// make the canvas fill its parent
function onResize() {
  let clientWindowWidth = window.innerWidth;
  let clientWindowHeight = window.innerHeight;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  tempCanvas.width = window.innerWidth;
  tempCanvas.height = window.innerHeight;
  redrawActions(current.stateNum);
  console.log("changing window size");
  console.log("client window width: " + clientWindowWidth);
  console.log("client window height: " + clientWindowHeight);
  socket.emit("emitWindowSize", { clientWindowWidth, clientWindowHeight });
}

// SOCKET MANAGEMENT
/*
socket emit (must send over in relative coordinates):
  drawTempline - drawline() *
  lineAction - lineAction.draw();
  drawTempCircle - drawcircle()
  circleAction - circleAction.draw()
  eraseAction - eraseAction.draw()
  undo - undoBtnDown()
  redo - undoBtnDown()
  clear - clearAction.draw()
// */

// socket.on("agentEmit", data => {
//   const { agentCanvasWidth } = data;
//   agentCanvasWidth = data;
// });

socket.on("drawTempLine", data => {
  const { x0, x1, y0, y1, color, strokeWidth, proportionX, proportionY } = data;
  drawLine(
    x0 * proportionX,
    y0 * proportionY,
    x1 * proportionX,
    y1 * proportionY,
    color,
    strokeWidth,
    tempContext
  );
});
socket.on("drawLine", () => {
  actions[current.stateNum] = new LineAction([...tempLine]);
  setCurrentState(1);
  redrawActions(current.stateNum);
  tempLine.length = 0;
});

socket.on("clear", () => {
  actions[current.stateNum] = new ClearAction();
  setCurrentState(1);
});
socket.on("undo", () => {
  setCurrentState(-1);
  redrawActions(current.stateNum);
});
socket.on("redo", () => {
  setCurrentState(1);
  redrawActions(current.stateNum);
});
socket.on("drawCircle", data => {
  const { x0, x1, y0, y1, color, proportionX, proportionY } = data;
  actions[current.stateNum] = new CircleAction({
    x0: x0 * proportionX,
    x1: x1 * proportionX,
    y0: y0 * proportionY,
    y1: y1 * proportionY,
    color,
    context
  });
  setCurrentState(1);
  redrawActions(current.stateNum);
});
socket.on("drawTempCircle", data => {
  const { x0, x1, y0, y1, color, proportionX, proportionY } = data;
  clearTemp();
  drawCircle(
    x0 * proportionX,
    y0 * proportionY,
    x1 * proportionX,
    y1 * proportionY,
    color,
    tempContext
  );
});
socket.on("erase", data => {
  actions[current.stateNum] = new EraseAction(data);
  setCurrentState(1);
  redrawActions(current.stateNum);
});

// DRAWING FUNCTIONS
// function to draw lines and emit
function drawLine(x0, y0, x1, y1, color, strokeWidth, myContext) {
  myContext.strokeStyle = color;
  myContext.lineWidth = strokeWidth;
  myContext.beginPath();
  myContext.moveTo(x0, y0);
  myContext.lineTo(x1, y1);
  myContext.stroke();
  myContext.closePath();

  let w = canvas.width;
  let h = canvas.height;

  // add to drawing array
  tempLine.push({
    x0: x0 / w,
    y0: y0 / h,
    x1: x1 / w,
    y1: y1 / h,
    color: color,
    strokeWidth: strokeWidth,
    context: myContext
  });
}

function drawCircle(x0, y0, x1, y1, color, myContext) {
  let coords = {
    x: (x0 + x1) / 2,
    y: (y0 + y1) / 2,
    length: Math.abs(x0 - x1),
    height: Math.abs(y0 - y1)
  };

  myContext.strokeStyle = color;
  myContext.lineWidth = 2;
  myContext.beginPath();
  myContext.ellipse(
    coords.x,
    coords.y,
    coords.length,
    coords.height,
    0,
    0,
    2 * Math.PI
  );
  myContext.stroke();
}

// check for actions to erase
function eraseCheck(event) {
  // current.x = event.clientX || event.touches[0].clientX;
  // current.y = event.clientY || event.touches[0].clientY;
  let w = canvas.width;
  let h = canvas.height;
  for (let i = 0; i < current.stateNum; i++) {
    if (actions[i].visible) {
      if (actions[i].type === actionType.LINE) {
        for (let j = 0; j < actions[i].lines.length; j++) {
          let distToCursor = Math.sqrt(
            (actions[i].lines[j].x0 * w - current.x) ** 2 +
              (actions[i].lines[j].y0 * h - current.y) ** 2
          );

          if (distToCursor <= eraserRadius) {
            actions[current.stateNum] = new EraseAction(i);
            setCurrentState(1);
            break;
          }
        }
      }
      if (actions[i].type === actionType.CIRCLE) {
        let circleData = actions[i].circleData;
        let Xcenter = (circleData.x0 + circleData.x1) / 2;
        let Ycenter = (circleData.y0 + circleData.y1) / 2;
        let Xrad = Math.abs(circleData.x0 - circleData.x1);
        let Yrad = Math.abs(circleData.y0 - circleData.y1);
        let distToCursor =
          Math.pow((current.x - Xcenter) / Xrad, 2) +
          Math.pow((current.y - Ycenter) / Yrad, 2);

        if (Math.abs(distToCursor - 1) <= 0.1) {
          actions[current.stateNum] = new EraseAction(i);
          setCurrentState(1);
        }
      }
    }
  }
  // redraw if any changes
  redrawActions(current.stateNum);
}

// Clear function
function clearDrawing() {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
  clearTemp();
}

// Clear temp
function clearTemp() {
  tempContext.clearRect(
    0,
    0,
    tempContext.canvas.width,
    tempContext.canvas.height
  );
}

// Redraw state function
function redrawActions(state) {
  clearDrawing();

  actions.map(i => (i.visible = true));

  //RUN ERASER DRAWS FIRST
  for (let i = 0; i < state; i++) {
    if (actions[i].type === actionType.ERASE) actions[i].draw();
  }

  //Iterate through actions array to redraw each one sequentially
  for (let i = 0; i < state; i++) {
    if (actions[i].visible && actions[i].type !== actionType.ERASE) {
      actions[i].draw();
    }
  }
}

// UTILITY FUNCTIONS
function setCurrentState(delta) {
  current.stateNum += delta;
}

function setLineMode() {
  switch (current.drawMode) {
    case drawMode.PEN:
      current.strokeWidth = 2;
      break;
    case drawMode.HIGHLIGHTER:
      current.strokeWidth = 20;
      break;
    case drawMode.CIRCLE:
      current.strokeWidth = 2;
      break;
    default:
  }
}

// limit the number of events per second
function throttle(callback, delay) {
  let previousCall = new Date().getTime();
  return function() {
    let time = new Date().getTime();

    if (time - previousCall >= delay) {
      previousCall = time;
      callback.apply(null, arguments);
    }
  };
}

function setButtonColor(buttonArray, buttonNumber, color) {
  for (let i = 0; i < buttonArray.length; i++) {
    buttonArray[i].style.backgroundColor = "white";
  }
  buttonArray[buttonNumber].style.backgroundColor = color;
}

// INITIALISATION
function init() {
  setCurrentState(0);
  onResize();
  current.drawMode = drawMode.PEN;
  setLineMode();
}

init();
