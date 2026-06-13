export class Player {
  hp: number = 100;
  readonly maxHp: number = 100;
  score: number = 0;
  kills: number = 0;
  isDead: boolean = false;

  takeDamage(amount: number): void {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) this.isDead = true;
  }

  heal(amount: number): void {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addScore(points: number): void {
    this.score += points;
  }

  addKill(): void {
    this.kills++;
    this.addScore(100);
  }
}
