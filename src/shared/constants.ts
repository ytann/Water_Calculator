import type { PlatformConfig } from './types';

export const WATER_ML_PER_TOKEN = 0.003;

export const WATER_CITATION =
  'Water usage estimate based on: Li et al. (2023) "Making AI Less Thirsty" and Patterson et al. (2022) data center water efficiency benchmarks. Ratio: 3 ml per 1,000 tokens (inference only).';

export const DEFAULT_PLATFORMS: PlatformConfig[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    urlMatch: 'chatgpt.com',
    selectors: {
      messages: '[data-message-author-role], article[data-testid*="turn"]',
      title: 'title',
      input: '#prompt-textarea, [contenteditable]',
    },
    builtIn: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    urlMatch: 'gemini.google.com',
    selectors: {
      messages: 'message-content, .message-content, [data-message-content]',
      title: 'title',
      input: 'rich-textarea, [contenteditable]',
    },
    builtIn: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    urlMatch: 'claude.ai',
    selectors: {
      messages: '[data-start], .message-content, .font-claude-message',
      title: 'title',
      input: '.ProseMirror, [contenteditable]',
    },
    builtIn: true,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    urlMatch: 'perplexity.ai',
    selectors: {
      messages: '.prose, .message',
      title: 'title',
      input: 'textarea',
    },
    builtIn: true,
  },
];
