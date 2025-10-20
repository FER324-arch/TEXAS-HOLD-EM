import Phaser from 'phaser';

export class JoinScene extends Phaser.Scene {
  constructor() {
    super('Join');
  }

  create() {
    this.add.text(40, 40, 'Join Scene', { fontFamily: 'Roboto Mono', color: '#17e3ff' });
  }
}
