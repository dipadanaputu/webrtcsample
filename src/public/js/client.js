var divSelectRoom = document.getElementById("select-room");
var divConsultingRoom = document.getElementById("consulting-room");
var inputRoomNumber = document.getElementById("room-number");
var btnGoRoom = document.getElementById("go-room");
var localVideo = document.getElementById("local-video");
var remoteVideo = document.getElementById("remote-video");

var roomNumber;
var localStream;
var remoteStream;
var rtcPeerConnection;

var iceServers = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    },
    {
      urls: "turn:192.158.29.39:3478?transport=udp",
      credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
      username: "28224511:1379330808"
    },
    {
      urls: "turn:192.158.29.39:3478?transport=tcp",
      credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
      username: "28224511:1379330808"
    }
  ]
};

var streamConstraints = { audio: false, video: true };
var isCaller;

var socket = io();

btnGoRoom.onclick = function() {
  if (inputRoomNumber.value === "") {
    alert("Please enter a room number");
  } else {
    roomNumber = inputRoomNumber.value;

    socket.emit("create or join", roomNumber);

    divSelectRoom.style = "display: none";
    divConsultingRoom.style = "display: block";
  }
};

socket.on("created", function(room) {
  navigator.getUserMedia(
    streamConstraints,
    function(stream) {
      localStream = stream;
      localVideo.srcObject = stream;
      isCaller = true;
    },
    function(error) {
      console.log(`An error occured when accessing media devices`);
    }
  );
});

socket.on("joined", function(room) {
  navigator.getUserMedia(
    streamConstraints,
    function(stream) {
      localStream = stream;
      localVideo.srcObject = stream;

      socket.emit("ready", roomNumber);
    },
    function(error) {
      console.log(`An error occured when accessing media devices`);
    }
  );
});

socket.on("ready", function() {
  if (isCaller) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);

    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.onaddstream = onAddStream;

    rtcPeerConnection.addStream(localStream);

    rtcPeerConnection.createOffer(setLocalOffer, function(e) {
      console.log(e);
    });
  }
});

socket.on("offer", function(event) {
  if (!isCaller) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);

    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.onaddstream = onAddStream;

    rtcPeerConnection.addStream(localStream);

    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));

    rtcPeerConnection.createAnswer(setLocalAnswer, function(e) {
      console.log(e);
    });
  }
});

socket.on("answer", function(event) {
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

socket.on("candidate", function(event) {
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate
  });

  rtcPeerConnection.addIceCandidate(candidate);
});

function onAddStream(event) {
  remoteVideo.srcObject = event.stream;
  remoteStream = event.stream;
}

function onIceCandidate(event) {
  if (event.candidate) {
    console.log("sending ice candidate");

    socket.emit("candidate", {
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
      room: roomNumber
    });
  }
}

function setLocalOffer(sessionDescription) {
  rtcPeerConnection.setLocalDescription(sessionDescription);

  socket.emit("offer", {
    type: "offer",
    sdp: sessionDescription,
    room: roomNumber
  });
}

function setLocalAnswer(sessionDescription) {
  rtcPeerConnection.setLocalDescription(sessionDescription);

  socket.emit("answer", {
    type: "answer",
    sdp: sessionDescription,
    room: roomNumber
  });
}
