import type { PlatformConfig, ConversationRecord } from '../shared/types';

async function loadPlatforms(): Promise<void> {
  chrome.runtime.sendMessage({ type: 'GET_PLATFORMS' }, (response: { platforms: PlatformConfig[] }) => {
    const container = document.getElementById('custom-platforms')!;
    container.innerHTML = '';
    for (const p of response.platforms.filter((x) => !x.builtIn)) {
      const card = document.createElement('div');
      card.className = 'platform-card';
      card.innerHTML = `
        <strong>${p.name}</strong>
        <code>URL: ${p.urlMatch} | Msg: ${p.selectors.messages}</code>
        <br><button class="remove-btn" data-id="${p.id}">Remove</button>
      `;
      container.appendChild(card);
    }
    attachRemoveButtons();
  });
}

function attachRemoveButtons(): void {
  document.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id!;
      chrome.runtime.sendMessage({ type: 'REMOVE_PLATFORM', id }, () => loadPlatforms());
    });
  });
}

async function loadConversations(): Promise<void> {
  chrome.runtime.sendMessage({ type: 'GET_ALL_RECORDS' }, (response: { records: ConversationRecord[] }) => {
    const tbody = document.querySelector('#conversations-table tbody')!;
    tbody.innerHTML = '';
    for (const r of response.records.sort((a, b) => b.startedAt.localeCompare(a.startedAt))) {
      const row = document.createElement('tr');
      const displayMl = r.waterMl >= 1000
        ? `${(r.waterMl / 1000).toFixed(1)} L`
        : `${Math.round(r.waterMl)} mL`;
      row.innerHTML = `
        <td>${r.title || '(untitled)'}</td>
        <td>${r.platform}</td>
        <td>${displayMl}</td>
        <td>${r.tokenCount.toLocaleString()}</td>
        <td>${new Date(r.startedAt).toLocaleDateString()}</td>
      `;
      tbody.appendChild(row);
    }
  });
}

document.getElementById('add-platform-form')!.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const data = new FormData(form);
  const config: PlatformConfig = {
    id: `custom-${Date.now()}`,
    name: data.get('name') as string,
    urlMatch: data.get('urlMatch') as string,
    selectors: {
      messages: data.get('messages') as string,
      pageTitle: 'title',
      titleSelector: data.get('title') as string,
      input: data.get('input') as string,
    },
    builtIn: false,
  };
  chrome.runtime.sendMessage({ type: 'ADD_PLATFORM', config }, () => {
    form.reset();
    loadPlatforms();
  });
});

loadPlatforms();
loadConversations();
