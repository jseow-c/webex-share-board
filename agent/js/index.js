const Webex = require("webex");

var webex;

const cursorModule = require("./cursor.js");
const annotationModule = require("./main.js");

annotationModule.socketConnect();
annotationModule.startAnnotation();

function connect() {
  return new Promise(resolve => {
    if (!webex) {
      // eslint-disable-next-line no-multi-assign
      webex = window.webex = Webex.init({
        config: {
          meetings: {
            deviceType: "WEB"
          }
          // Any other sdk config we need
        },
        credentials: {
          access_token: document.getElementById("access-token").value
        }
      });
    }

    // Listen for added meetings
    webex.meetings.on("meeting:added", addedMeetingEvent => {
      if (addedMeetingEvent.type === "INCOMING") {
        const addedMeeting = addedMeetingEvent.meeting;

        // Acknowledge to the server that we received the call on our device
        addedMeeting.acknowledge(addedMeetingEvent.type).then(() => {
          if (confirm("Answer incoming call")) {
            joinMeeting(addedMeeting);
          } else {
            addedMeeting.decline();
          }
        });
      }
    });

    // Register our device with Webex cloud
    if (!webex.internal.device.registered) {
      webex.internal.device
        .register()
        // Connect to websockets after registering device
        .then(() => webex.internal.mercury.connect())
        // Sync our meetings with existing meetings on the server
        .then(() => webex.meetings.syncMeetings())
        .then(() => {
          // This is just a little helper for our selenium tests and doesn't
          // really matter for the example
          document.body.classList.add("listening");
          document.getElementById("connection-status").innerHTML = "Connected";
          // Our device is now connected
          document.getElementById("loginContainer").style.display = "none";
          document.getElementById("awaitingCall").style.display = "initial";
          resolve();
        })
        // This is a terrible way to handle errors, but anything more specific is
        // going to depend a lot on your app
        .catch(err => {
          console.error(err);
          // we'll rethrow here since we didn't really *handle* the error, we just
          // reported it
          throw err;
        });
    } else {
      // Device was already connected
      resolve();
    }
  });
}

// Similarly, there are a few different ways we'll get a meeting Object, so let's
// put meeting handling inside its own function.
function bindMeetingEvents(meeting) {
  // meeting is a meeting instance, not a promise, so to know if things break,
  // we'll need to listen for the error event. Again, this is a rather naive
  // handler.
  meeting.on("error", err => {
    console.error(err);
  });

  // Handle media streams changes to ready state
  meeting.on("media:ready", media => {
    if (!media) {
      return;
    }
    console.log(`MEDIA:READY type:${media.type}`);
    if (media.type === "local") {
      document.getElementById("self-view").srcObject = media.stream;
    }
    if (media.type === "remoteVideo") {
      document.getElementById("remote-view-video").srcObject = media.stream;
    }
    if (media.type === "remoteAudio") {
      document.getElementById("remote-view-audio").srcObject = media.stream;
    }
    if (media.type === "remoteShare") {
      // Remote share streams become active immediately on join, even if nothing is being shared
      document.getElementById("remote-screen").srcObject = media.stream;
    }
    if (media.type === "localShare") {
      document.getElementById("self-screen").srcObject = media.stream;
    }
  });

  // Handle media streams stopping
  meeting.on("media:stopped", media => {
    // Remove media streams
    if (media.type === "local") {
      document.getElementById("self-view").srcObject = null;
    }
    if (media.type === "remoteVideo") {
      document.getElementById("remote-view-video").srcObject = null;
    }
    if (media.type === "remoteAudio") {
      document.getElementById("remote-view-audio").srcObject = null;
    }
    if (media.type === "remoteShare") {
      document.getElementById("remote-screen").srcObject = null;
    }
    if (media.type === "localShare") {
      document.getElementById("self-screen").srcObject = null;
    }
    document.getElementById("callInterface").style.display = "none";
    document.getElementById("awaitingCall").style.display = "initial";
  });

  // Handle share specific events
  meeting.on("meeting:startedSharingLocal", () => {
    document.getElementById("screenshare-tracks").innerHTML = "SHARING";
  });
  meeting.on("meeting:stoppedSharingLocal", () => {
    document.getElementById("screenshare-tracks").innerHTML = "STOPPED";
  });

  // Update participant info
  meeting.members.on("members:update", delta => {
    const { full: membersData } = delta;
    const memberIDs = Object.keys(membersData);

    memberIDs.forEach(memberID => {
      const memberObject = membersData[memberID];

      // Devices are listed in the memberships object.
      // We are not concerned with them in this demo
      if (memberObject.isUser) {
        if (memberObject.isSelf) {
          document.getElementById("call-status-local").innerHTML =
            memberObject.status;
        } else {
          document.getElementById("call-status-remote").innerHTML =
            memberObject.status;
        }
      }
    });
  });

  document.getElementById("callInterface").style.display = "initial";
  document.getElementById("awaitingCall").style.display = "none";
  annotationModule.startAnnotation();

  // Of course, we'd also like to be able to end the meeting:
  document.getElementById("hangup").addEventListener("click", () => {
    annotationModule.endAnnotation();
    meeting.leave();
  });

  meeting.on("all", event => {
    console.log(event);
  });
}

// Join the meeting and add media
function joinMeeting(meeting) {
  // Save meeting to global object
  activeMeeting = meeting;

  // Call our helper function for binding events to meetings
  bindMeetingEvents(meeting);

  return meeting.join().then(() => {
    const mediaSettings = {
      receiveVideo: true,
      receiveAudio: true,
      receiveShare: true,
      sendVideo: true,
      sendAudio: true,
      sendShare: false
    };

    return meeting.getMediaStreams(mediaSettings).then(mediaStreams => {
      const [localStream, localShare] = mediaStreams;

      meeting.addMedia({
        localShare,
        localStream,
        mediaSettings
      });
    });
  });
}

// In order to simplify the state management needed to keep track of our button
// handlers, we'll rely on the current meeting global object and only hook up event
// handlers once.

document.getElementById("share-screen").addEventListener("click", () => {
  if (activeMeeting) {
    const mediaSettings = {
      receiveShare: true,
      sendShare: true
    };

    console.info(
      "SHARE-SCREEN: Preparing to share screen via `getMediaStreams`"
    );
    activeMeeting
      .getMediaStreams(mediaSettings)
      // `[, localShare]` is grabbing index 1 from the mediaSettingsResultsArray
      // and storing it in a variable called localShare.
      .then(mediaSettingsResultsArray => {
        const [, localShare] = mediaSettingsResultsArray;

        console.info("SHARE-SCREEN: Add local share via `updateShare`");

        return activeMeeting.updateShare({
          sendShare: true,
          receiveShare: true,
          stream: localShare
        });
      })
      .then(() => {
        console.info("SHARE-SCREEN: Screen successfully added to meeting.");
      })
      .catch(e => {
        console.error("SHARE-SCREEN: Unable to share screen, error:");
        console.error(e);
      });
  } else {
    console.error("No active meeting available to share screen.");
  }
});

document.getElementById("stop-screen-share").addEventListener("click", () => {
  if (activeMeeting) {
    activeMeeting.updateShare({
      sendShare: false,
      receiveShare: true
    });
  }
});

document.getElementById("hangup").addEventListener("click", () => {
  document.getElementsByTagName("BODY")[0].className = "";
  document.getElementById("cursor").style.display = "none";
  document.getElementById("callInterface").style.display = "none";
  document.getElementById("awaitingCall").style.display = "initial";
  if (activeMeeting) {
    activeMeeting.leave();
  }
});

// Now, let's set up connection handling
document.getElementById("credentials").addEventListener("submit", event => {
  // let's make sure we don't reload the page when we submit the form
  event.preventDefault();
  // The rest of the connection setup happens in connect();
  connect();
});

// And finally, let's wire up dialing

document.getElementById("dialer").addEventListener("submit", event => {
  // again, we don't want to reload when we try to dial
  event.preventDefault();

  const destination = document.getElementById("invitee").value;

  // we'll use `connect()` (even though we might already be connected or
  // connecting) to make sure we've got a functional webex instance.
  connect()
    .then(() => {
      // Create the meeting
      return webex.meetings.create(destination).then(meeting => {
        // Pass the meeting to our join meeting helper
        return joinMeeting(meeting);
      });
    })
    .catch(error => {
      // Report the error
      console.error(error);

      // Implement error handling here
    });
});
