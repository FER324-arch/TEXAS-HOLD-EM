import { io, Socket } from 'socket.io-client';

export interface PeerConnectionConfig {
  roomId: string;
  stunServers: string[];
}

export class PeerMesh {
  private socket: Socket;
  private peers = new Map<string, RTCPeerConnection>();

  constructor(private config: PeerConnectionConfig) {
    this.socket = io('/', { path: '/signal' });
    this.socket.emit('join', config.roomId);
    this.socket.on('signal', (payload) => this.handleSignal(payload));
  }

  private createPeer(id: string) {
    const rtc = new RTCPeerConnection({ iceServers: [{ urls: this.config.stunServers }] });
    rtc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal', { roomId: this.config.roomId, data: { target: id, candidate: event.candidate } });
      }
    };
    rtc.ondatachannel = (event) => {
      console.log('Data channel opened', event.channel.label);
    };
    this.peers.set(id, rtc);
    return rtc;
  }

  async createOffer(targetId: string, channelLabel: string) {
    const peer = this.createPeer(targetId);
    const channel = peer.createDataChannel(channelLabel, { ordered: true });
    channel.onopen = () => console.log('Channel open with', targetId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    this.socket.emit('signal', { roomId: this.config.roomId, data: { target: targetId, offer } });
  }

  private async handleSignal(payload: any) {
    if (!payload) return;
    const { from, offer, answer, candidate } = payload;
    let peer = this.peers.get(from);
    if (!peer) {
      peer = this.createPeer(from);
    }
    if (offer) {
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answerDesc = await peer.createAnswer();
      await peer.setLocalDescription(answerDesc);
      this.socket.emit('signal', { roomId: this.config.roomId, data: { target: from, answer: answerDesc } });
    } else if (answer) {
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
    } else if (candidate) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }
}
