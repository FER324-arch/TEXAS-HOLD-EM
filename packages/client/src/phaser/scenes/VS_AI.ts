import Phaser from 'phaser';

export class VSAIScene extends Phaser.Scene {
  constructor() {
    super('VS_AI');
  }

  create() {
    this.add.text(40, 40, 'VS AI Scene', { fontFamily: 'Roboto Mono', color: '#17e3ff' });
  }
}
