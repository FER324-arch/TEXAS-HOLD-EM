import Phaser from 'phaser';

export class TableScene extends Phaser.Scene {
  private tableGraphics?: Phaser.GameObjects.Graphics;
  private cards: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super('Table');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.tableGraphics = this.add.graphics();
    this.tableGraphics.fillStyle(0x0f192d, 0.95);
    this.tableGraphics.fillRoundedRect(centerX - 300, centerY - 180, 600, 360, 180);
    this.tableGraphics.lineStyle(6, 0x17e3ff, 0.6);
    this.tableGraphics.strokeRoundedRect(centerX - 300, centerY - 180, 600, 360, 180);

    this.createCards();
  }

  private createCards() {
    const startX = this.cameras.main.centerX - 140;
    const y = this.cameras.main.centerY;
    for (let i = 0; i < 5; i++) {
      const card = this.add.rectangle(startX + i * 70, y, 60, 90, 0xffffff, 0.9);
      card.setStrokeStyle(2, i % 2 === 0 ? 0x17e3ff : 0xff2e8a, 0.8);
      this.tweens.add({
        targets: card,
        scaleX: { from: 0, to: 1 },
        scaleY: { from: 0, to: 1 },
        angle: { from: -15, to: 0 },
        ease: 'Cubic.easeOut',
        delay: i * 120,
        duration: 320
      });
      this.cards.push(card);
    }
  }
}
