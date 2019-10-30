# SIA-WebexBoard

SIA Whiteboard is a Javascript library to create a whiteboard canvas over a Webex Teams collaboration.

## Installation

Use the package manager [npm](https://nodejs.org/en/) to install the nodejs packages.

```bash
npm install
```

## Usage

### Socket Server Startup

Create/Import SSL Certificate/Key into ssl folder. Use OpenSSL to create the Cert for Self-Signed Certificate. Below is an example.

```bash
openssl req -newkey rsa:2048 -nodes -keyout privatekey.key -x509 -days 36500 -out certificate.crt
mv certificate.crt /ssl/certificate.crt
mv privatekey.key /ssl/privatekey.key
```

Start the socket server at port 8118

```bash
node server.js
```

> For **Self-Signed Certificates** - Please note that you need to try to access https://localhost:8118 on the browser or else it will not be authorized for your other sessions.

### Agent Startup

Ensure you are pointing to the correct socket server as above.

> Note: Please check the **IP** and **port** of your socket server to key in the correct variables.

```javascript
// agent/js/main.js

...
...

// SOCKET CONNECT
export function socketConnect() {
  socket = io.connect("https://10.138.224.224:8118", {
    rejectUnauthorized: false
  });

...
...

```

Bundle and startup the agent **html**

```bash
cd  ./agent
../node_modules/.bin/parcel index.html --port 1234 --https
```

Launch [website](https://localhost:1234) using **Firefox**

> Note: Only Firefox is supported for screensharing function in Webex

Go to [Webex Developer](https://developer.webex.com/docs/api/getting-started) to obtain your Personal Access Token

> Note: You are required to login to Webex to obtain the token.

Use the Access Token to login in [website](https://localhost:1234).

### Client Startup

Ensure you are pointing to the correct socket server as above.

> Note: Please check the **IP** and **port** of your socket server to key in the correct variables.

```javascript
// client/js/main.js

...
...

// VARIABLE DECLARATION
const socket = io.connect("https://10.138.224.224:8118", {
  rejectUnauthorized: false
});

...
...

```

Ensure that you have put in the correct [Guest Issuer](https://developer.webex.com/docs/guest-issuer) for your Client Browser. Create one for your application if you do not have.

```javascript
// client/webex/js/index.js

...
...

var payload = {
  sub: "client",
  name: "KrisLab Client",
  iss:
    "Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi8zZTFhZTkxZC1kNGRlLTQyZWQtOTU2My03ZmZkMWZjYmM5OWM"
};

var token = jwt.sign(
  payload,
  Buffer.from("KdmKQ1lIvUhHFA0Bp6ny9sj14hJzD5S0R1q5rLb4tfE=", "base64"),
  { expiresIn: "1h" }
);

...
...

```

Bundle and startup the client html

```bash
cd ./client
../node_modules/.bin/parcel index.html --port 2345 --https
```

Bundle and startup the whiteboard html

```bash
cd ./client/webex
../../node_modules/.bin/parcel index.html --port 3456 --https
```

Launch both the [sharing website](https://localhost:2345) and [webex-video](https://localhost:3456) using **Firefox**

> Note: Again, only Firefox is supported for screensharing function in Webex

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
