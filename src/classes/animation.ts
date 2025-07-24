import chalk from 'chalk';

/**
 * Loading animation utility for providing visual feedback during operations
 */
export class LoadingAnimation {
  private interval: NodeJS.Timeout | null = null;
  private frame = 0;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private message = '';

  /**
   * Start the loading animation with a message
   * @param message - The message to display alongside the animation
   */
  start(message: string = 'Thinking'): void {
    this.message = message;
    this.frame = 0;

    process.stdout.write('\n');
    this.interval = setInterval(() => {
      process.stdout.write(
        `\r${chalk.cyan(this.frames[this.frame])} ${chalk.gray(this.message)}...`
      );
      this.frame = (this.frame + 1) % this.frames.length;
    }, 100);
  }

  /**
   * Stop the loading animation and clear the line
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the line
    }
  }

  /**
   * Check if the animation is currently running
   */
  isRunning(): boolean {
    return this.interval !== null;
  }

  /**
   * Update the message while the animation is running
   * @param message - New message to display
   */
  updateMessage(message: string): void {
    this.message = message;
  }
} 