import Phaser from 'phaser';

export class HostScene extends Phaser.Scene {
  constructor() {
    super('Host');
  }

  create() {
    this.add.text(40, 40, 'Host Scene', { fontFamily: 'Roboto Mono', color: '#17e3ff' });
  }
}
