/* global RTCPeerConnection */

//
// Camera and Microphone Authorization   
//

/*
cordova.plugins.diagnostic.requestMicrophoneAuthorization(function (status) {
    if(status === cordova.plugins.diagnostic.permissionStatus.GRANTED) {
        console.log('GRANTED');
    } else {
        console.log(new Error('AuthorizationDenied'));   
    }
}, function (err) {
    console.log(new Error('AuthorizationFailed: ' + err));   
});

cordova.plugins.diagnostic.requestCameraAuthorization(function (status) {
    if(status === cordova.plugins.diagnostic.permissionStatus.GRANTED) {
        console.log('GRANTED');
    } else {
        console.log(new Error('AuthorizationDenied'));   
    }
}, function (err) {
    console.log(new Error('AuthorizationFailed: ' + err));   
});
*/

var cordova = window.cordova;

// Expose WebRTC Globals
if (cordova && cordova.plugins && cordova.plugins.iosrtc) {
  cordova.plugins.iosrtc.registerGlobals();
  cordova.plugins.iosrtc.debug.enable('*', true);
}


//
// Container
//

document.body.innerHTML = "";
var appContainer = document.body;

//
// getUserMedia
//


var localStream;
var localVideoEl;
function TestGetUserMedia() {

  // Note: Support for Multiple TestRTCPeerConnection calls
  if (localStream) {

    // Close local Stream if already connected
    localStream.stop();

    // Clear local video element
    if (localVideoEl.srcObject) {       
      localVideoEl.srcObject = null;
      appContainer.removeChild(localVideoEl); 
    }
  }

  localVideoEl = document.createElement('video');
  localVideoEl.setAttribute('autoplay', 'autoplay');
  localVideoEl.setAttribute('playsinline', 'playsinline');

  // Note: Test CSS positioning
  localVideoEl.style.backgroundColor = 'purple'; // Cause zIndex - 1 failure
  localVideoEl.style.position = 'absolute';
  localVideoEl.style.top = 0;
  localVideoEl.style.left = 0;
  localVideoEl.style.width = "100px";
  localVideoEl.style.height = "100px";
  localVideoEl.style.transform = "scaleX(-1)";
  appContainer.appendChild(localVideoEl);

  navigator.mediaDevices.enumerateDevices().then(function (devices) {
      console.log('getMediaDevices.ok', devices);
      devices.forEach(function (device, idx) {
        console.log('getMediaDevices.devices', idx, device.label, device.kind, device.deviceId);
      });
  }, function (err) {
      console.log('getMediaDevices.err', err);
  });

  return navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
    /*
    video: {
      // Test Back Camera
      //deviceId: 'com.apple.avfoundation.avcapturedevice.built-in_video:0'
      //sourceId: 'com.apple.avfoundation.avcapturedevice.built-in_video:0'
      deviceId: {
        exact: 'com.apple.avfoundation.avcapturedevice.built-in_video:0'
      }
    }, 
    audio: {
      exact: 'Built-In Microphone'
    }*/
  }).then(function (stream) {

    console.log('getUserMedia.stream', stream);
    console.log('getUserMedia.stream.getTracks', stream.getTracks());

    // Note: Expose for debug
    localStream = stream;

    // Attach local stream to video element
    localVideoEl.srcObject = localStream;

    // Test HTML over Video element
    TestPluginMediaStreamRenderer(localVideoEl);

    return localStream;
   
  }).catch(function (err) {
    console.log('getUserMediaError', err, err.stack);
  });
}

var useAnimateVideo = false;
function TestPluginMediaStreamRenderer(localVideoEl) {

  // Animate video position
  var currentPosition = {
    x: 0,
    y: 0
  };

  var animateTimer;
  function animateVideo() {
    
    currentPosition.x = currentPosition.x < (window.innerWidth - parseInt(localVideoEl.style.width, 10)) ? currentPosition.x + 1 : 0;
    currentPosition.y = currentPosition.y < (window.innerHeight - parseInt(localVideoEl.style.height, 10)) ? currentPosition.y + 1 : 0;

    localVideoEl.style.top = currentPosition.y + 'px';
    localVideoEl.style.left = currentPosition.x + 'px';

    if (cordova && cordova.plugins && cordova.plugins.iosrtc) {
      cordova.plugins.iosrtc.refreshVideos();
    }

    return (animateTimer = requestAnimationFrame(animateVideo));
  }

  if (useAnimateVideo) {
    animateTimer = animateVideo(); 
  }

  //
  // Test Video behind Element
  //

  // Note: Test HTML over video requiring Z-Index -1 and transparent <html> and <body>
  document.body.style.background = "transparent";
  document.documentElement.style.background = "transparent";
  localVideoEl.style.backgroundColor = '';
  localVideoEl.style.zIndex = -1;

  var overEl = document.createElement('button');
  overEl.style.backgroundColor = 'red';
  overEl.style.position = 'absolute';
  overEl.style.left = 0;
  overEl.style.top = 0;
  overEl.style.width = "100px";
  overEl.style.height = "100px";

  overEl.addEventListener('click', function () {
    overEl.style.backgroundColor = overEl.style.backgroundColor === 'red' ? 'green' : 'red';

    if (overEl.style.backgroundColor === 'red') {
      animateTimer = animateVideo();
    } else {
      cancelAnimationFrame(animateTimer);
    }
  });

  appContainer.appendChild(overEl);

  overEl.style.left = ((window.innerWidth / 2)  - parseInt(overEl.style.width, 10)) + 'px';
  overEl.style.top  = ((window.innerHeight / 2) - parseInt(overEl.style.height, 10)) + 'px';

}

/*
// Disabled to avoid confusion with remoteStream
var cloneStream;
var cloneVideoEl;
function TestPluginMediaStreamClone(mediaStream) {
  cloneVideoEl = document.createElement('video');
  cloneVideoEl.setAttribute('autoplay', 'autoplay');
  cloneVideoEl.setAttribute('playsinline', 'playsinline');
  cloneVideoEl.style.backgroundColor = 'purple';
  cloneVideoEl.style.position = 'absolute';
  cloneVideoEl.style.bottom = 0;
  cloneVideoEl.style.left = 0;
  cloneVideoEl.style.width = "100px";
  cloneVideoEl.style.height = "100px";
  cloneVideoEl.style.transform = "scaleX(-1)";

  cloneStream = mediaStream.clone();
  cloneVideoEl.srcObject = cloneStream;

  appContainer.appendChild(cloneVideoEl);
}
*/

//
// Test RTCPeerConnection
// 

var pc1 = new RTCPeerConnection(),
    pc2 = new RTCPeerConnection();

var peerVideoEl;
var peerStream;
function TestRTCPeerConnection(localStream) {

  // Note: Support for Multiple TestRTCPeerConnection calls
  if (peerStream) {
    
    // Close peer Stream if already connected
    peerStream.stop();

    // Clear peer video element
    if (peerVideoEl.srcObject) {
      peerVideoEl.srcObject = null;
      appContainer.removeChild(peerVideoEl); 
    }

    // Disconnect peer
    if (pc1.iceConnectionState === 'completed') {  
      pc1.close();

      // Current you cannot reuse previous RTCPeerConnection
      pc1 = new RTCPeerConnection();
      pc2 = new RTCPeerConnection();
    }
  }

  // Note: Deprecated but supported
  //pc1.addStream(localStream);

  // Note: Deprecated Test removeStream
  // pc1.removeStream(pc1.getLocalStreams()[0])

  // Note: Chrome Version 77.0.3865.90 (Official Build) still 
  // require to use addStream without webrtc-adapter.
  localStream.getTracks().forEach(function (track) {
    console.log('addTrack', track);
    pc1.addTrack(track);
  });
  
  function onAddIceCandidate(pc, can) {
    console.log('addIceCandidate', pc, can);
    return can && pc.addIceCandidate(can).catch(function (err) {
      console.log('addIceCandidateError', err);
    });
  }

  pc1.onicecandidate = function (e) {
    onAddIceCandidate(pc2, e.candidate);
  };
  
  pc2.onicecandidate = function (e) {
    onAddIceCandidate(pc1, e.candidate);
  };

  pc2.onaddstream = function (e) {
    console.log('pc2.addStream', e);
    peerVideoEl = document.createElement('video');
    peerVideoEl.setAttribute('autoplay', 'autoplay');
    peerVideoEl.setAttribute('playsinline', 'playsinline');

    // Note: Test Object-fix
    peerVideoEl.style.objectFit = "cover";

    // Note: Test CSS positioning
    peerVideoEl.style.backgroundColor = 'blue';
    peerVideoEl.style.position = 'fixed';
    peerVideoEl.style.width = "100px";
    peerVideoEl.style.height = "100px";
    peerVideoEl.style.top = 0;
    peerVideoEl.style.left = (window.innerWidth - parseInt(peerVideoEl.style.width, 10)) + 'px';
    appContainer.appendChild(peerVideoEl);

    // Note: Expose for debug
    peerStream = e.stream;

    // Attach peer stream to video element
    peerVideoEl.srcObject = peerStream;
  };

  pc1.oniceconnectionstatechange = function (e) {
    console.log('pc1.iceConnectionState', e, pc1.iceConnectionState);

    if (pc1.iceConnectionState === 'completed') {      
      console.log('pc1.getSenders', pc1.getSenders());
      console.log('pc2.getReceivers', pc2.getReceivers());
    }
  };

  pc1.onicegatheringstatechange = function (e) {
    console.log('pc1.iceGatheringStateChange', e);
  };

  pc1.onnegotiationneeded = function (e) {
    console.log('pc1.negotiatioNeeded', e);

    return pc1.createOffer().then(function (d) {
      var desc = {
        type: d.type,
        sdp: d.sdp
      };
      console.log('pc1.setLocalDescription', desc);
      return pc1.setLocalDescription(desc);
    }).then(function () {
      var desc = {
        type: pc1.localDescription.type,
        sdp: pc1.localDescription.sdp
      };
      console.log('pc2.setLocalDescription', desc);
      return pc2.setRemoteDescription(desc);
    }).then(function () {
      console.log('pc2.createAnswer');
      return pc2.createAnswer();
    }).then(function (d) {
      var desc = {
        type: d.type,
        sdp: d.sdp
      };
      console.log('pc2.setLocalDescription', desc);
      return pc2.setLocalDescription(d);
    }).then(function () {
      var desc = {
        type: pc2.localDescription.type,
        sdp: pc2.localDescription.sdp
      };
      console.log('pc1.setRemoteDescription', desc);
      return pc1.setRemoteDescription(desc);
    }).catch(function (err) {
      console.log('pc1.createOfferError', err);
    });
  };
}

var useWebRTCAdapter = false;

// Expose webrtc-adapter
if (useWebRTCAdapter && typeof window.adapter === 'undefined') {

    // load adapter.js
    var version = 'latest';
    var script = document.createElement("script");
    script.type = "text/javascript";
    //script.src = "adapter-latest.js";
    script.src = "https://webrtc.github.io/adapter/adapter-" + version + ".js";
    script.async = false;
    document.getElementsByTagName("head")[0].appendChild(script);
    script.onload = function () {
      console.log('useWebRTCAdapter.loaded', script.src);
      TestGetUserMedia().then(function (localStream) {
        TestRTCPeerConnection(localStream); 
      });
    };
} else {
  TestGetUserMedia().then(function (localStream) {
    TestRTCPeerConnection(localStream); 
  });
}


