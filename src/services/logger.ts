/**
 * Unified logger service using VSCode OutputChannel.
 * Replaces scattered console.log('[@yt]...') calls throughout the codebase.
 */

import * as vscode from 'vscode';

class Logger {
  private channel: vscode.OutputChannel | undefined;

  /**
   * Initialize the output channel lazily on first use.
   * This avoids issues if the module is imported before extension activation.
   */
  private getChannel(): vscode.OutputChannel {
    if (!this.channel) {
      this.channel = vscode.window.createOutputChannel('LingoTube');
    }
    return this.channel;
  }

  info(message: string, ...args: unknown[]): void {
    this.write('INFO', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.write('WARN', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.write('ERROR', message, ...args);
  }

  private write(level: string, message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString().slice(11, 23);
    const suffix = args.length > 0
      ? ' ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
      : '';
    const line = `[${timestamp}] [${level}] ${message}${suffix}`;

    this.getChannel().appendLine(line);

    // Mirror to dev console for debugging during development
    if (level === 'ERROR') {
      console.error(line);
    }
  }

  dispose(): void {
    this.channel?.dispose();
    this.channel = undefined;
  }
}

/** Singleton logger instance */
export const logger = new Logger();
