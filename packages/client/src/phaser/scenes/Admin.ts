import Phaser from 'phaser';

export class AdminScene extends Phaser.Scene {
  constructor() {
    super('Admin');
  }

  create() {
    this.add.text(40, 40, 'Admin Scene', { fontFamily: 'Roboto Mono', color: '#17e3ff' });
  }
}
