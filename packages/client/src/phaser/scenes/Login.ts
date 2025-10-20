import Phaser from 'phaser';

export class LoginScene extends Phaser.Scene {
  constructor() {
    super('Login');
  }

  create() {
    this.add.text(40, 40, 'Login Scene', { fontFamily: 'Roboto Mono', color: '#17e3ff' });
  }
}
