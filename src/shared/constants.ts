import type { PlatformConfig } from './types';

export const WATER_ML_PER_TOKEN = 0.003;

export const DEFAULT_PLATFORMS: PlatformConfig[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    urlMatch: 'chatgpt.com',
    selectors: {
      messages: '[data-message-author-role="assistant"]',
      pageTitle: 'title',
      titleSelector: 'title',
      input: '#prompt-textarea, [contenteditable="true"]',
    },
    builtIn: true,
    tokenMultiplier: 1.3,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    urlMatch: 'gemini.google.com',
    selectors: {
      messages: 'message-content, .message-content, [data-message-content]',
      pageTitle: 'title',
      titleSelector: 'title',
      input: 'rich-textarea, [contenteditable]',
    },
    builtIn: true,
    tokenMultiplier: 1.5,
  },
  {
    id: 'claude',
    name: 'Claude',
    urlMatch: 'claude.ai',
    selectors: {
      messages: '[class*="font-claude-response-body"], [class*="progressive-markdown"]',
      pageTitle: 'title',
      titleSelector: 'title',
      input: '.ProseMirror, [contenteditable]',
    },
    builtIn: true,
    tokenMultiplier: 1.4,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    urlMatch: 'perplexity.ai',
    selectors: {
      messages: '.prose, .message',
      pageTitle: 'title',
      titleSelector: 'h1, .chat-title',
      input: 'textarea',
    },
    builtIn: true,
    tokenMultiplier: 1.5,
  },
];
