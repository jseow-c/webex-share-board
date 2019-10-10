# SIA-WebexBoard

SIA Whiteboard is a Javascript library to create a whiteboard canvas over a Webex Teams collaboration.

## Installation

Use the package manager [npm](https://nodejs.org/en/) to install the nodejs packages.

```bash
npm install
```

## Usage

### Socket Server Startup

Start the socket server at port 8118

```bash
node server.js
```

### Agent Startup

Ensure you are pointing to the correct socket server as above.

> Note: Please check the **IP** and **port** of your socket server to key in the correct variables.

```javascript
// agent/js/main.js

...
...

// SOCKET CONNECT
export function socketConnect() {
  socket = io.connect("http://10.68.46.144:8118");

...
...

```

Bundle and startup the agent **html**

```bash
cd  ./agent
../node_modules/.bin/parcel index.html --port 1234
```

Launch [website](http://localhost:1234) using **Firefox**

> Note: Only Firefox is supported for screensharing function in Webex

Go to [Webex Developer](https://developer.webex.com/docs/api/getting-started) to obtain your Personal Access Token

> Note: You are required to login to Webex to obtain the token.

Use the Access Token to login in [website](http://localhost:1234).

### Client Startup

Ensure you are pointing to the correct socket server as above.

> Note: Please check the **IP** and **port** of your socket server to key in the correct variables.

```javascript
// client/js/main.js

...
...

// VARIABLE DECLARATION
const socket = io.connect("10.68.46.144:8118");

...
...

```

Bundle and startup the client html

```bash
cd ./client
../node_modules/.bin/parcel index.html --port 2345
```

Bundle and startup the whiteboard html

```bash
cd ./client/webex
../../node_modules/.bin/parcel index.html --port 3456
```

Launch both the [sharing website](http://localhost:2345) and [webex-video](http://localhost:3456) using **Firefox**

> Note: Again, only Firefox is supported for screensharing function in Webex

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
