// const io = require("socket.io");

import io from "socket.io-client";

// VARIABLE DECLARATION
let socket;
// canvas
let tempCanvas;
let canvas;
let cursorCanvas;
let context;
let tempContext;
// buttons
let toolBtns;
let clearBtn;
let redoBtn;
let undoBtn;
let colorBtns;
let circleColor;
// get-video-size
let card;

// testing
let cardWidth;
let cardHeight;
let cardLeft;
let cardTop;
let proportion;
let proportionX;
let proportionY;
let canvasLeft;
let canvasTop;
let canvasWidth;
let receivedWindowWidth;
let receivedWindowHeight;
let callInterface;

callInterface = document.getElementById("callInterface");
callInterface.addEventListener("mousemove", cursorCheck, false);

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
let tempLine = [];
let actions = [];

// SOCKET CONNECT
export function socketConnect() {
  socket = io.connect("https://10.138.224.224:8118", {
    rejectUnauthorized: false
  });

  socket.on("emitWindowSize", data => {
    const { clientWindowWidth, clientWindowHeight } = data;
    console.log("Receiving Client Window Size");
    receivedWindowWidth = clientWindowWidth;
    receivedWindowHeight = clientWindowHeight;
  });
}

// Initiate Variables
export function startAnnotation() {
  // canvas
  tempCanvas = document.getElementById("temp-canvas");
  canvas = document.getElementById("overlay");
  cursorCanvas = document.getElementById("cursor-canvas");
  context = canvas.getContext("2d");
  tempContext = tempCanvas.getContext("2d");
  // buttons
  toolBtns = document.getElementsByClassName("tool");
  clearBtn = document.getElementById("clear");
  redoBtn = document.getElementById("redo");
  undoBtn = document.getElementById("undo");
  colorBtns = document.getElementsByClassName("color");

  // Initial canvas set up
  card = document.getElementById("drawCanvas");
  // canvas.height = card.offsetHeight;
  // tempCanvas.width = card.offsetWidth;
  // tempCanvas.height = card.offsetHeight;

  // Testing
  cardWidth = card.offsetWidth;
  cardHeight = card.offsetHeight;
  cardLeft = getOffset(card).left;
  canvasLeft = cardLeft;
  cardTop = getOffset(card).top;
  // cardRight = cardLeft + cardWidth;
  // cardBottom = cardTop + cardHeight;

  // Set canvas size to client's inner window proportion
  socket.on("emitWindowSize", data => {
    const { clientWindowWidth, clientWindowHeight } = data;
    receivedWindowWidth = clientWindowWidth;
    receivedWindowHeight = clientWindowHeight;
    setProportion(receivedWindowHeight, receivedWindowWidth);
    setCanvasDimensionProportion();
  });

  function setProportion(receivedWindowHeight, receivedWindowWidth) {
    proportion = receivedWindowHeight / receivedWindowWidth;
  }

  function setCanvasDimensionProportion() {
    canvas.width = card.offsetWidth;
    canvas.height = proportion * cardWidth;
    canvasTop = cardTop + cardHeight - canvas.height;
    tempCanvas.width = card.offsetWidth;
    tempCanvas.height = proportion * cardWidth;
    proportionX = receivedWindowWidth / canvas.width;
    proportionY = receivedWindowHeight / canvas.height;
  }

  current = {
    color: "black",
    x: "",
    y: "",
    stateNum: 0,
    strokeWidth: 0,
    drawMode: ""
  };

  drawing = false;
  lastEraseTime = new Date().getTime();
  circleStart = { x: 0, y: 0, length: 0, height: 0 };
  tempLine = [];
  actions = [];

  // AGENT EVENT MANAGEMENT
  //Mouse event management
  canvas.addEventListener("mousedown", MouseDown, false);
  // canvas.addEventListener("click", MouseClick, false);
  canvas.addEventListener("mouseup", MouseUp, false);
  canvas.addEventListener("mouseout", MouseUp, false);
  canvas.addEventListener("mousemove", throttle(MouseMove, 10), false);
  canvas.addEventListener("mousemove", cursorCheck, false);

  //Touch support for mobile devices
  canvas.addEventListener("touchstart", MouseDown, false);
  canvas.addEventListener("touchend", MouseUp, false);
  canvas.addEventListener("touchcancel", MouseUp, false);
  canvas.addEventListener("touchmove", throttle(MouseMove, 10), false);

  // tool buttons
  // TODO: add tools
  clearBtn.addEventListener("click", clearBtnDown, false);
  redoBtn.addEventListener("click", redoBtnDown, false);
  undoBtn.addEventListener("click", undoBtnDown, false);

  for (let i = 0; i < toolBtns.length; i++) {
    toolBtns[i].addEventListener("click", toolBtnsDown, false);
  }

  for (let i = 0; i < colorBtns.length; i++) {
    colorBtns[i].addEventListener("click", colorBtnsDown, false);
  }

  window.addEventListener("resize", onResize, false);

  // Initiate
  setCurrentState(0);
  onResize();
  current.drawMode = drawMode.PEN;
  // toolBtns[0].style.backgroundColor = "red";
  setLineMode();
}

export function endAnnotation() {
  // AGENT EVENT MANAGEMENT
  //Mouse event management
  canvas.removeEventListener("mousedown", MouseDown, false);
  // canvas.addEventListener("click", MouseClick, false);
  canvas.removeEventListener("mouseup", MouseUp, false);
  canvas.removeEventListener("mouseout", MouseUp, false);
  canvas.removeEventListener("mousemove", throttle(MouseMove, 10), false);

  //Touch support for mobile devices
  canvas.removeEventListener("touchstart", MouseDown, false);
  canvas.removeEventListener("touchend", MouseUp, false);
  canvas.removeEventListener("touchcancel", MouseUp, false);
  canvas.removeEventListener("touchmove", throttle(MouseMove, 10), false);

  // tool buttons
  // TODO: add tools
  clearBtn.removeEventListener("click", clearBtnDown, false);
  redoBtn.removeEventListener("click", redoBtnDown, false);
  undoBtn.removeEventListener("click", undoBtnDown, false);

  for (let i = 0; i < toolBtns.length; i++) {
    toolBtns[i].removeEventListener("click", toolBtnsDown, false);
  }

  for (let i = 0; i < colorBtns.length; i++) {
    colorBtns[i].removeEventListener("click", colorBtnsDown, false);
  }

  window.removeEventListener("resize", onResize, false);

  socket.emit("clear");
}

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

    for (let i = 0; i < lines.length; i++) {
      drawLine(
        lines[i].x0,
        lines[i].y0,
        lines[i].x1,
        lines[i].y1,
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

// DRAWING FUNCTIONS
// function to draw lines and emit
function drawLine(x0, y0, x1, y1, color, strokeWidth, myContext) {
  if (!x0) return;

  // const newX0 = x0 - cardLeft;
  // const newX1 = x1 - cardLeft;
  // const newY0 = y0 - cardTop;
  // const newY1 = y1 - cardTop;

  // if (newX0 <= 0 || newX0 > cardWidth) return;
  // if (newY0 <= 0 || newY0 > cardHeight) return;
  // if (newX1 <= 0 || newX1 > cardWidth) return;
  // if (newY1 <= 0 || newY1 > cardHeight) return;

  myContext.strokeStyle = color;
  myContext.lineWidth = strokeWidth;
  myContext.beginPath();
  myContext.moveTo(x0, y0);
  myContext.lineTo(x1, y1);
  myContext.stroke();
  myContext.closePath();

  // let w = canvas.width;
  // let h = canvas.height;

  // add to drawing array
  tempLine.push({
    x0: x0,
    y0: y0,
    x1: x1,
    y1: y1,
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
  let w = canvas.width;
  let h = canvas.height;
  for (let i = 0; i < current.stateNum; i++) {
    if (actions[i].visible) {
      if (actions[i].type === actionType.LINE) {
        for (let j = 0; j < actions[i].lines.length; j++) {
          let distToCursor = Math.sqrt(
            (actions[i].lines[j].x0 - current.x) ** 2 +
              (actions[i].lines[j].y0 - current.y) ** 2
          );
          if (distToCursor <= eraserRadius + 100) {
            actions[current.stateNum] = new EraseAction(i);
            setCurrentState(1);
            socket.emit("erase", i);
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
          socket.emit("erase", i);
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
*/

// INPUT MANAGEMENT - MOUSE/TOUCH
function MouseDown(e) {
  drawing = true;

  switch (current.drawMode) {
    case drawMode.PEN:
    case drawMode.HIGHLIGHTER:
      current.x = e.clientX || e.touches[0].clientX;
      current.y = e.clientY || e.touches[0].clientY;

      // Reset LineAction object
      tempLine.length = 0;

      break;

    case drawMode.ERASER:
      current.x = e.clientX || e.touches[0].clientX;
      current.y = e.clientY || e.touches[0].clientY;
      eraseCheck(e);
      break;
    // case drawMode.ERASER:
    //   break;
    case drawMode.CIRCLE:
      circleStart.x = e.clientX || e.touches[0].clientX;
      circleStart.y = e.clientY || e.touches[0].clientY;
      break;
    default:
      return;
  }
}

function MouseUp(e) {
  switch (current.drawMode) {
    case drawMode.PEN:
    case drawMode.HIGHLIGHTER:
      if (!drawing) {
        return;
      }
      drawing = false;

      drawLine(
        current.x - canvasLeft,
        current.y - canvasTop,
        e.clientX - canvasLeft || e.touches[0].clientX - canvasLeft,
        e.clientY - canvasTop || e.touches[0].clientY - canvasTop,
        current.color,
        current.strokeWidth,
        tempContext
      );

      actions[current.stateNum] = new LineAction([...tempLine]);
      socket.emit("drawLine");
      setCurrentState(1);
      redrawActions(current.stateNum);
      break;
    case drawMode.ERASER:
      if (!drawing) {
        return;
      }
      drawing = false;
      current.x = e.clientX - canvasLeft || e.touches[0].clientX - canvasLeft;
      current.y = e.clientY - canvasTop || e.touches[0].clientY - canvasTop;
      eraseCheck(e);
      break;
    case drawMode.CIRCLE:
      if (!drawing) {
        return;
      }
      drawing = false;

      const coords = {
        x0: circleStart.x - canvasLeft,
        y0: circleStart.y - canvasTop,
        x1: current.x - canvasLeft,
        y1: current.y - canvasTop,
        color: current.color
      };

      actions[current.stateNum] = new CircleAction(
        Object.assign({}, coords, { context })
      );
      setCurrentState(1);
      redrawActions(current.stateNum);
      socket.emit("drawCircle", { ...coords, proportionX, proportionY });
      break;
    default:
      return;
  }
}

function MouseMove(e) {
  switch (current.drawMode) {
    case drawMode.PEN:
    case drawMode.HIGHLIGHTER:
      if (!drawing) {
        return;
      }
      const tempLineData = {
        x0: current.x - canvasLeft,
        y0: current.y - canvasTop,
        x1: e.clientX - canvasLeft || e.touches[0].clientX - canvasLeft,
        y1: e.clientY - canvasTop || e.touches[0].clientY - canvasTop,
        color: current.color,
        strokeWidth: current.strokeWidth
      };

      drawLine(...Object.values({ ...tempLineData, myContext: tempContext }));
      socket.emit("drawTempLine", {
        ...tempLineData,
        proportionX,
        proportionY
      });
      current.x = e.clientX || e.touches[0].clientX;
      current.y = e.clientY || e.touches[0].clientY;
      break;

    case drawMode.ERASER:
      if (!drawing) {
        return;
      }
      current.x = e.clientX || e.touches[0].clientX;
      current.y = e.clientY || e.touches[0].clientY;
      let currEraseTime = new Date().getTime();
      if (currEraseTime - lastEraseTime >= eraseDelay) {
        lastEraseTime = currEraseTime;
        eraseCheck(e);
      }
      break;

    case drawMode.CIRCLE:
      if (!drawing) {
        return;
      }
      clearTemp();
      current.x = e.clientX || e.touches[0].clientX;
      current.y = e.clientY || e.touches[0].clientY;
      const tempCircleData = {
        x0: circleStart.x - canvasLeft,
        y0: circleStart.y - canvasTop,
        x1: current.x - canvasLeft,
        y1: current.y - canvasTop,
        color: current.color
      };
      drawCircle(
        ...Object.values({ ...tempCircleData, myContext: tempContext })
      );
      socket.emit("drawTempCircle", {
        ...tempCircleData,
        proportionX,
        proportionY
      });
      break;
    default:
      return;
  }
}

function cursorCheck(e) {
  if (
    e.clientX < cardLeft ||
    e.clientX > cardLeft + cardWidth ||
    e.clientY < cardTop ||
    e.clientY > cardTop + cardHeight
  ) {
    document.getElementsByClassName("cursor--small")[0].style.background =
      "none";
  } else {
    document.getElementsByClassName("cursor--small")[0].style.background =
      "black";
  }
}

// INPUT MANAGEMENT - BUTTON/WINDOWS
function colorBtnsDown(e) {
  current.color = e.target.id.split("-")[1];
  circleColor = current.color;
  // initCanvas();
}

function toolBtnsDown(e) {
  current.drawMode = e.target.id.split("-")[1];
  setLineMode();

  switch (current.drawMode) {
    case drawMode.ERASER:
      break;
    default:
  }

  for (let i = 0; i < toolBtns.length; i++) {
    toolBtns[i].style.backgroundColor = "white";
  }
  // e.target.style.backgroundColor = "red";
}

function clearBtnDown() {
  if (current.stateNum > 0) {
    if (actions[current.stateNum - 1].type === actionType.CLEAR) return;
    actions[current.stateNum] = new ClearAction();
    setCurrentState(1);
    socket.emit("clear");
  }
}

// Undo function
function undoBtnDown() {
  setCurrentState(-1);
  redrawActions(current.stateNum);
  socket.emit("undo");
}

// Redo function
function redoBtnDown() {
  setCurrentState(1);
  redrawActions(current.stateNum);
  socket.emit("redo");
}

// make the canvas fill its parent
function onResize() {
  canvas.width = card.offsetWidth;
  canvas.height = proportion * cardWidth;
  tempCanvas.width = card.offsetWidth;
  tempCanvas.height = proportion * cardWidth;
  redrawActions(current.stateNum);
}

// UTILITY FUNCTIONS
function setCurrentState(delta) {
  current.stateNum += delta;

  // by default, redo is off and undo is on
  redoBtn.style.pointerEvents = "none";
  redoBtn.style.backgroundColor = "grey";
  undoBtn.style.pointerEvents = "auto";
  undoBtn.style.backgroundColor = "white";

  // if no actions yet, undo should be off
  if (current.stateNum === 0) {
    // disable undo
    undoBtn.style.pointerEvents = "none";
    undoBtn.style.backgroundColor = "grey";
    if (actions.length > 0) {
      redoBtn.style.pointerEvents = "auto";
      redoBtn.style.backgroundColor = "white";
    }
  }
  // if actions.length > current state, redo is possible
  else if (actions.length > current.stateNum) {
    redoBtn.style.pointerEvents = "auto";
    redoBtn.style.backgroundColor = "white";
  }
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

// get offsetX,Y
function getOffset(el) {
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY
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
  // toolBtns[0].style.backgroundColor = "red";
  setLineMode();
}
