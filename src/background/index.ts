import { IndexedDBStore } from '../shared/db';
import { DEFAULT_PLATFORMS } from '../shared/constants';
import type { PlatformConfig } from '../shared/types';

const store = new IndexedDBStore();
let platformConfigs: PlatformConfig[] = [...DEFAULT_PLATFORMS];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ platforms: platformConfigs });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'GET_PLATFORMS':
      sendResponse({ platforms: platformConfigs });
      break;

    case 'ADD_PLATFORM':
      platformConfigs.push(message.config);
      chrome.storage.local.set({ platforms: platformConfigs });
      sendResponse({ success: true });
      break;

    case 'REMOVE_PLATFORM':
      platformConfigs = platformConfigs.filter((p) => p.id !== message.id);
      chrome.storage.local.set({ platforms: platformConfigs });
      sendResponse({ success: true });
      break;

    case 'FIND_CONVERSATION':
      store.findByUrl(message.url).then((record) => sendResponse({ record }));
      return true;

    case 'SAVE_RECORD':
      store.create(message.record).then(() => sendResponse({ success: true }));
      return true;

    case 'UPDATE_RECORD':
      store.update(message.id, message.fields).then(() => sendResponse({ success: true }));
      return true;

    case 'GET_ALL_RECORDS':
      store.findAll().then((records) => sendResponse({ records }));
      return true;

    case 'DELETE_RECORD':
      store.delete(message.id).then(() => sendResponse({ success: true }));
      return true;

    case 'OPEN_DASHBOARD':
      chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') });
      // ponytail: hardcoded path - update if Vite output dir changes
      break;
  }
});
