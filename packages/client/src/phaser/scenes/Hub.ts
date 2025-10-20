import Phaser from 'phaser';

export class HubScene extends Phaser.Scene {
  constructor() {
    super('Hub');
  }

  create() {
    this.add.text(40, 40, 'Hub Scene', { fontFamily: 'Roboto Mono', color: '#17e3ff' });
  }
}
