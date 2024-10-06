// 로컬 스트림을 표시할 HTML 요소를 선택합니다.
let localStreamElement = document.querySelector('#localStream');
// 랜덤한 키를 생성하여 현재 사용자를 식별합니다.
const myKey = Math.random().toString(36).substring(2, 11);
// 피어 연결을 저장할 맵을 초기화합니다.
let pcListMap = new Map();
let roomId; // 방 ID를 저장할 변수
let otherKeyList = []; // 다른 사용자 키를 저장할 배열
let localStream = undefined; // 로컬 스트림을 저장할 변수

// 카메라 및 마이크를 시작하는 함수
const startCam = async () => {
    // mediaDevices API가 지원되는지 확인합니다.
    if (navigator.mediaDevices !== undefined) {
        // 사용자 미디어(오디오 및 비디오 스트림)를 요청합니다.
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            .then(async (stream) => {
                console.log('Stream found');
                localStream = stream; // 로컬 스트림을 저장합니다.
                // 기본적으로 마이크를 비활성화합니다.
                stream.getAudioTracks()[0].enabled = true;
                localStreamElement.srcObject = localStream; // 로컬 스트림을 HTML 요소에 연결합니다.
                // 로컬 스트림이 준비된 후 연결을 시작합니다.
            }).catch(error => {
                console.error("Error accessing media devices:", error); // 오류 처리
            });
    }
}

// 소켓에 연결하는 함수
const connectSocket = async () => {
    const socket = new SockJS('/signaling'); // SockJS를 사용하여 signaling 서버에 연결합니다.
    stompClient = Stomp.over(socket); // STOMP 프로토콜을 사용하여 클라이언트를 설정합니다.
    stompClient.debug = null; // 디버그 로그 비활성화

    stompClient.connect({}, function () {
        console.log('Connected to WebRTC server'); // 서버에 연결 성공 메시지

        // ICE 후보 수신을 위한 구독
        stompClient.subscribe(`/topic/peer/iceCandidate/${myKey}/${roomId}`, candidate => {
            const key = JSON.parse(candidate.body).key // 후보를 보낸 사용자 키
            const message = JSON.parse(candidate.body).body; // ICE 후보 메시지

            // 해당 키의 피어 연결에서 ICE 후보를 추가합니다.
            pcListMap.get(key).addIceCandidate(new RTCIceCandidate({
                candidate: message.candidate,
                sdpMLineIndex: message.sdpMLineIndex,
                sdpMid: message.sdpMid
            }));
        });

        // 오퍼 수신을 위한 구독
        stompClient.subscribe(`/topic/peer/offer/${myKey}/${roomId}`, offer => {
            const key = JSON.parse(offer.body).key; // 오퍼를 보낸 사용자 키
            const message = JSON.parse(offer.body).body; // 오퍼 메시지

            // 새 피어 연결을 생성하고 원격 설명을 설정합니다.
            pcListMap.set(key, createPeerConnection(key));
            pcListMap.get(key).setRemoteDescription(new RTCSessionDescription({
                type: message.type,
                sdp: message.sdp
            }));
            sendAnswer(pcListMap.get(key), key); // 응답을 전송합니다.
        });

        // 응답 수신을 위한 구독
        stompClient.subscribe(`/topic/peer/answer/${myKey}/${roomId}`, answer => {
            const key = JSON.parse(answer.body).key; // 응답을 보낸 사용자 키
            const message = JSON.parse(answer.body).body; // 응답 메시지

            // 해당 키의 피어 연결에 원격 설명을 설정합니다.
            pcListMap.get(key).setRemoteDescription(new RTCSessionDescription(message));
        });

        // 호출 키 수신을 위한 구독
        stompClient.subscribe(`/topic/call/key`, message => {
            // 다른 사용자에게 자신의 키를 전송합니다.
            stompClient.send(`/app/send/key`, {}, JSON.stringify(myKey));
        });

        // 전송 키 수신을 위한 구독
        stompClient.subscribe(`/topic/send/key`, message => {
            const key = JSON.parse(message.body); // 수신한 키

            // 자신의 키와 다르면 otherKeyList에 추가합니다.
            if (myKey !== key && otherKeyList.find((mapKey) => mapKey === myKey) === undefined) {
                otherKeyList.push(key);
            }
        });
    });
}

// 다른 사용자로부터의 트랙 이벤트를 처리하는 함수
let onTrack = (event, otherKey) => {
    // 해당 키에 대한 비디오 요소가 존재하지 않으면 새 비디오 요소를 생성합니다.
    if (document.getElementById(`${otherKey}`) === null) {
        const video = document.createElement('video');

        video.autoplay = true; // 자동 재생 설정
        video.controls = true; // 컨트롤 표시
        video.id = otherKey; // ID를 다른 사용자 키로 설정
        video.srcObject = event.streams[0]; // 원격 스트림을 연결합니다.

        // 원격 비디오 요소를 DOM에 추가합니다.
        document.getElementById('remoteStreamDiv').appendChild(video);
    }
};

// 피어 연결을 생성하는 함수
const createPeerConnection = (otherKey) => {
    const pc = new RTCPeerConnection(); // 새로운 RTCPeerConnection 생성
    try {
        // ICE 후보 이벤트 리스너 추가
        pc.addEventListener('icecandidate', (event) => {
            onIceCandidate(event, otherKey); // ICE 후보가 생성되면 처리
        });
        // 트랙 이벤트 리스너 추가
        pc.addEventListener('track', (event) => {
            onTrack(event, otherKey); // 트랙이 추가되면 처리
        });
        // 로컬 스트림이 존재하면 모든 트랙을 피어 연결에 추가합니다.
        if (localStream !== undefined) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }

        console.log('PeerConnection created'); // 피어 연결 생성 성공 메시지
    } catch (error) {
        console.error('PeerConnection failed: ', error); // 오류 처리
    }
    return pc; // 생성된 피어 연결 반환
}

// ICE 후보를 처리하는 함수
let onIceCandidate = (event, otherKey) => {
    // 새로운 ICE 후보가 생성되면
    if (event.candidate) {
        console.log('ICE candidate');
        // ICE 후보를 다른 사용자에게 전송합니다.
        stompClient.send(`/app/peer/iceCandidate/${otherKey}/${roomId}`, {}, JSON.stringify({
            key: myKey,
            body: event.candidate
        }));
    }
};

// 오퍼를 전송하는 함수
let sendOffer = (pc, otherKey) => {
    // 피어 연결에서 오퍼를 생성합니다.
    pc.createOffer().then(offer => {
        setLocalAndSendMessage(pc, offer); // 로컬 설명 설정 및 메시지 전송
        stompClient.send(`/app/peer/offer/${otherKey}/${roomId}`, {}, JSON.stringify({
            key: myKey,
            body: offer
        }));
        console.log('Send offer'); // 오퍼 전송 성공 메시지
    });
};

// 응답을 전송하는 함수
let sendAnswer = (pc, otherKey) => {
    // 피어 연결에서 응답을 생성합니다.
    pc.createAnswer().then(answer => {
        setLocalAndSendMessage(pc, answer); // 로컬 설명 설정 및 메시지 전송
        stompClient.send(`/app/peer/answer/${otherKey}/${roomId}`, {}, JSON.stringify({
            key: myKey,
            body: answer
        }));
        console.log('Send answer'); // 응답 전송 성공 메시지
    });
};

// 로컬 설명을 설정하고 메시지를 전송하는 함수
const setLocalAndSendMessage = (pc, sessionDescription) => {
    pc.setLocalDescription(sessionDescription); // 로컬 설명 설정
}

// 방 번호 입력 후 캠 및 웹소켓 실행
document.querySelector('#enterRoomBtn').addEventListener('click', async () => {
    await startCam(); // 카메라 시작

    // 로컬 스트림이 준비되면
    if (localStream !== undefined) {
        document.querySelector('#localStream').style.display = 'block'; // 로컬 스트림 표시
        document.querySelector('#startSteamBtn').style.display = ''; // 스트림 시작 버튼 표시
    }
    roomId = document.querySelector('#roomIdInput').value; // 입력된 방 ID를 저장
    document.querySelector('#roomIdInput').disabled = true; // 방 ID 입력 필드 비활성화
    document.querySelector('#enterRoomBtn').disabled = true; // 방 입장 버튼 비활성화

    await connectSocket(); // 소켓 연결 시작
});

// 스트림 시작 버튼 클릭 시, 다른 웹 키들 웹소켓을 가져온 뒤에 offer -> answer -> iceCandidate 통신
// 피어 커넥션은 pcListMap으로 저장합니다.
document.querySelector('#startSteamBtn').add
