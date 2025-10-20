import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.setBaseURL('');
  }

  create() {
    this.scene.start('Table');
  }
}
