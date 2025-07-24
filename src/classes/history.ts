import type { ChatMessage } from '../types';

/**
 * History Manager class that handles conversation history storage and retrieval
 */
export class HistoryManager {
  private conversationHistory: ChatMessage[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 10) {
    this.maxHistory = maxHistory;
  }

  /**
   * Clear all conversation history
   */
  clear(): void {
    this.conversationHistory = [];
  }

  /**
   * Add a message to the conversation history
   */
  add(role: 'user' | 'assistant', content: string): void {
    this.conversationHistory.push({ role, content });
  }

  /**
   * Get recent conversation history based on max history limit
   */
  getRecent(): ChatMessage[] {
    return this.conversationHistory.slice(-this.maxHistory);
  }

  /**
   * Get all conversation history
   */
  getAll(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Update the maximum number of messages to keep in recent history
   */
  setMaxHistory(maxHistory: number): void {
    this.maxHistory = maxHistory;
  }

  /**
   * Get the current conversation history length
   */
  getLength(): number {
    return this.conversationHistory.length;
  }
}
