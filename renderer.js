// State management
let state = {
  folders: [],
  prompts: [],
  activeFolderId: null,
  activePromptId: null,
  searchTermFolder: '',
  searchTermPrompt: '',
  selectedTagFilter: null,
  sortBy: 'newest'
};

// Confirmation modal callback
let onConfirmAction = null;

// Theme management (UI preference, stored outside the prompts DB)
const THEME_STORAGE_KEY = 'promptbox-theme';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (toggleBtn) {
    const isDark = theme === 'dark';
    toggleBtn.innerHTML = `<i data-feather="${isDark ? 'sun' : 'moon'}"></i>`;
    toggleBtn.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  }
}

// Apply saved theme immediately to avoid a flash of the wrong theme
applyTheme(localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark');

// DOM Elements
const elFolderList = document.getElementById('folder-list');
const elFolderSearch = document.getElementById('folder-search');
const elBtnAddFolder = document.getElementById('btn-add-folder');
const elActiveFolderName = document.getElementById('active-folder-name');
const elPromptsCount = document.getElementById('prompts-count');
const elBtnAddPrompt = document.getElementById('btn-add-prompt');
const elPromptSearch = document.getElementById('prompt-search');
const elPromptSort = document.getElementById('prompt-sort');
const elTagFiltersContainer = document.getElementById('tag-filters-container');
const elPromptList = document.getElementById('prompt-list');

const elDetailsEmptyState = document.getElementById('details-empty-state');
const elDetailsContent = document.getElementById('details-content');
const elDetailFolderBadge = document.getElementById('detail-folder-badge');
const elDetailUpdatedAt = document.getElementById('detail-updated-at');
const elDetailTitle = document.getElementById('detail-title');
const elDetailTagsList = document.getElementById('detail-tags-list');
const elDetailBodyText = document.getElementById('detail-body-text');
const elPromptCharCount = document.getElementById('prompt-char-count');

const elBtnCopyPrompt = document.getElementById('btn-copy-prompt');
const elBtnEditPrompt = document.getElementById('btn-edit-prompt');
const elBtnDeletePrompt = document.getElementById('btn-delete-prompt');
const elCopyBtnText = document.getElementById('copy-btn-text');

// Modals
const elFolderModal = document.getElementById('folder-modal');
const elFolderForm = document.getElementById('folder-form');
const elFolderModalTitle = document.getElementById('folder-modal-title');
const elFolderModalId = document.getElementById('folder-modal-id');
const elFolderNameInput = document.getElementById('folder-name-input');

const elPromptModal = document.getElementById('prompt-modal');
const elPromptForm = document.getElementById('prompt-form');
const elPromptModalTitle = document.getElementById('prompt-modal-title');
const elPromptModalId = document.getElementById('prompt-modal-id');
const elPromptModalFolderId = document.getElementById('prompt-modal-folder-id');
const elPromptTitleInput = document.getElementById('prompt-title-input');
const elPromptTagsInput = document.getElementById('prompt-tags-input');
const elPromptBodyInput = document.getElementById('prompt-body-input');

const elConfirmModal = document.getElementById('confirm-modal');
const elConfirmModalTitle = document.getElementById('confirm-modal-title');
const elConfirmModalMessage = document.getElementById('confirm-modal-message');
const elConfirmModalCancel = document.getElementById('confirm-modal-cancel');
const elConfirmModalSubmit = document.getElementById('confirm-modal-submit');

// App Initialization
async function init() {
  try {
    const data = await window.api.loadData();
    state.folders = data.folders || [];
    state.prompts = data.prompts || [];
    
    // Select first folder by default if available
    if (state.folders.length > 0) {
      state.activeFolderId = state.folders[0].id;
    }
    
    setupEventListeners();
    renderAll();
  } catch (error) {
    console.error('Failed to initialize app data:', error);
  }
}

// Save database changes helper
async function saveStateToDisk() {
  const data = {
    folders: state.folders,
    prompts: state.prompts
  };
  await window.api.saveData(data);
}

// Re-render everything
function renderAll() {
  renderFolders();
  renderPrompts();
  renderPromptDetails();
  feather.replace();
}

// --------------------------------------------------------------------------
// DOM Rendering Functions
// --------------------------------------------------------------------------

function renderFolders() {
  elFolderList.innerHTML = '';
  
  const filteredFolders = state.folders.filter(folder => 
    folder.name.toLowerCase().includes(state.searchTermFolder.toLowerCase())
  );
  
  if (filteredFolders.length === 0) {
    elFolderList.innerHTML = `<li class="empty-list-msg" style="padding: 12px; font-size: 0.85rem; color: var(--color-text-muted); text-align: center;">No folders found</li>`;
    return;
  }
  
  filteredFolders.forEach(folder => {
    const isSelected = folder.id === state.activeFolderId;
    const promptCount = state.prompts.filter(p => p.folderId === folder.id).length;
    
    const li = document.createElement('li');
    li.className = `folder-item ${isSelected ? 'active' : ''}`;
    li.dataset.id = folder.id;
    
    li.innerHTML = `
      <div class="folder-info">
        <i data-feather="${isSelected ? 'folder-open' : 'folder'}"></i>
        <span class="folder-name">${escapeHTML(folder.name)}</span>
      </div>
      <div class="folder-meta">
        <span class="folder-count-badge">${promptCount}</span>
        <div class="folder-actions">
          <button class="folder-action-btn btn-edit" title="Rename Folder">
            <i data-feather="edit-3"></i>
          </button>
          <button class="folder-action-btn btn-delete" title="Delete Folder">
            <i data-feather="trash-2"></i>
          </button>
        </div>
      </div>
    `;
    
    // Select folder click
    li.addEventListener('click', (e) => {
      // Check if button click was triggered instead
      if (e.target.closest('.folder-action-btn')) return;
      state.activeFolderId = folder.id;
      state.activePromptId = null; // Reset selected prompt
      state.selectedTagFilter = null; // Reset tag filter
      state.searchTermPrompt = ''; // Reset search prompt
      elPromptSearch.value = '';
      renderAll();
    });
    
    // Rename folder click
    li.querySelector('.btn-edit').addEventListener('click', () => {
      openFolderModal(folder);
    });
    
    // Delete folder click
    li.querySelector('.btn-delete').addEventListener('click', () => {
      showConfirmModal(
        'Delete Folder',
        `Are you sure you want to delete the folder "${escapeHTML(folder.name)}"? All prompts within this folder will also be permanently deleted.`,
        () => deleteFolder(folder.id)
      );
    });
    
    elFolderList.appendChild(li);
  });
}

function renderPrompts() {
  elPromptList.innerHTML = '';
  
  const activeFolder = state.folders.find(f => f.id === state.activeFolderId);
  
  if (!activeFolder) {
    elActiveFolderName.textContent = 'Select Folder';
    elPromptsCount.textContent = '0';
    elBtnAddPrompt.disabled = true;
    elPromptList.innerHTML = `<li class="empty-list-msg" style="padding: 40px 20px; font-size: 0.9rem; color: var(--color-text-muted); text-align: center;">No folder selected</li>`;
    renderTagFilters([]);
    return;
  }
  
  elActiveFolderName.textContent = activeFolder.name;
  elBtnAddPrompt.disabled = false;
  
  // Filter prompts belonging to active folder
  let folderPrompts = state.prompts.filter(p => p.folderId === state.activeFolderId);
  
  // Collect all unique tags from prompts in this folder (before filters are applied)
  const uniqueTags = [...new Set(folderPrompts.flatMap(p => p.tags || []))].sort();
  renderTagFilters(uniqueTags);
  
  // Apply Search Filter
  if (state.searchTermPrompt) {
    const term = state.searchTermPrompt.toLowerCase();
    folderPrompts = folderPrompts.filter(p => 
      p.title.toLowerCase().includes(term) ||
      p.content.toLowerCase().includes(term) ||
      (p.tags && p.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  }
  
  // Apply Tag Filter
  if (state.selectedTagFilter) {
    folderPrompts = folderPrompts.filter(p => p.tags && p.tags.includes(state.selectedTagFilter));
  }
  
  // Apply Sorting
  if (state.sortBy === 'newest') {
    folderPrompts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (state.sortBy === 'oldest') {
    folderPrompts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (state.sortBy === 'alphabetical') {
    folderPrompts.sort((a, b) => a.title.localeCompare(b.title));
  }
  
  elPromptsCount.textContent = folderPrompts.length;
  
  if (folderPrompts.length === 0) {
    elPromptList.innerHTML = `<li class="empty-list-msg" style="padding: 40px 20px; font-size: 0.9rem; color: var(--color-text-muted); text-align: center;">No prompts found</li>`;
    return;
  }
  
  // If active prompt is not in the filtered list anymore, reset it
  if (state.activePromptId && !folderPrompts.some(p => p.id === state.activePromptId)) {
    state.activePromptId = null;
    renderPromptDetails();
  }
  
  // Auto-select first prompt in the list if none is selected
  if (!state.activePromptId && folderPrompts.length > 0) {
    state.activePromptId = folderPrompts[0].id;
    setTimeout(() => renderPromptDetails(), 0);
  }
  
  folderPrompts.forEach(prompt => {
    const isSelected = prompt.id === state.activePromptId;
    
    const li = document.createElement('li');
    li.className = `prompt-item ${isSelected ? 'active' : ''}`;
    li.dataset.id = prompt.id;
    
    const timeString = formatTimeAgo(prompt.updatedAt || prompt.createdAt);
    
    let tagsHTML = '';
    if (prompt.tags && prompt.tags.length > 0) {
      tagsHTML = `
        <div class="prompt-item-tags">
          ${prompt.tags.map(tag => `<span class="tag-pill-sm">${escapeHTML(tag)}</span>`).join('')}
        </div>
      `;
    }
    
    // Create preview snippet
    const contentPreview = prompt.content.length > 90 
      ? prompt.content.substring(0, 90) + '...' 
      : prompt.content;
      
    li.innerHTML = `
      <div class="prompt-item-header">
        <h4 class="prompt-item-title">${escapeHTML(prompt.title)}</h4>
        <span class="prompt-item-time">${timeString}</span>
      </div>
      <p class="prompt-item-preview">${escapeHTML(contentPreview)}</p>
      ${tagsHTML}
    `;
    
    li.addEventListener('click', () => {
      state.activePromptId = prompt.id;
      renderAll();
    });
    
    elPromptList.appendChild(li);
  });
}

function renderTagFilters(tags) {
  elTagFiltersContainer.innerHTML = '';
  
  if (tags.length === 0) {
    elTagFiltersContainer.classList.add('hidden');
    return;
  }
  
  elTagFiltersContainer.classList.remove('hidden');
  
  // All option
  const allPill = document.createElement('div');
  allPill.className = `tag-filter-pill ${!state.selectedTagFilter ? 'active' : ''}`;
  allPill.textContent = 'All';
  allPill.addEventListener('click', () => {
    state.selectedTagFilter = null;
    renderPrompts();
    // Re-highlight filters
    Array.from(elTagFiltersContainer.children).forEach(child => child.classList.remove('active'));
    allPill.classList.add('active');
  });
  elTagFiltersContainer.appendChild(allPill);
  
  // Individual tags
  tags.forEach(tag => {
    const isSelected = tag === state.selectedTagFilter;
    const pill = document.createElement('div');
    pill.className = `tag-filter-pill ${isSelected ? 'active' : ''}`;
    pill.textContent = `#${tag}`;
    
    pill.addEventListener('click', () => {
      if (state.selectedTagFilter === tag) {
        state.selectedTagFilter = null; // Toggle off
      } else {
        state.selectedTagFilter = tag;
      }
      renderPrompts();
      
      // Update pills highlighting
      Array.from(elTagFiltersContainer.children).forEach(child => child.classList.remove('active'));
      if (state.selectedTagFilter) {
        pill.classList.add('active');
      } else {
        allPill.classList.add('active');
      }
    });
    
    elTagFiltersContainer.appendChild(pill);
  });
}

function renderPromptDetails() {
  const activePrompt = state.prompts.find(p => p.id === state.activePromptId);
  
  if (!activePrompt) {
    elDetailsEmptyState.classList.remove('hidden');
    elDetailsContent.classList.add('hidden');
    return;
  }
  
  elDetailsEmptyState.classList.add('hidden');
  elDetailsContent.classList.remove('hidden');
  
  // Set meta & title
  const activeFolder = state.folders.find(f => f.id === activePrompt.folderId);
  elDetailFolderBadge.textContent = activeFolder ? activeFolder.name : 'Unknown Folder';
  
  const timeOpts = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formattedTime = new Date(activePrompt.updatedAt || activePrompt.createdAt).toLocaleString(undefined, timeOpts);
  elDetailUpdatedAt.textContent = `Last modified: ${formattedTime}`;
  
  elDetailTitle.textContent = activePrompt.title;
  
  // Render tags
  elDetailTagsList.innerHTML = '';
  if (activePrompt.tags && activePrompt.tags.length > 0) {
    activePrompt.tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag-pill-md';
      span.textContent = `#${tag}`;
      elDetailTagsList.appendChild(span);
    });
  } else {
    elDetailTagsList.innerHTML = `<span style="font-size: 0.85rem; color: var(--color-text-muted); font-style: italic;">No tags added</span>`;
  }
  
  // Render body & char count
  elDetailBodyText.textContent = activePrompt.content;
  elPromptCharCount.textContent = `${activePrompt.content.length} characters`;
}

// --------------------------------------------------------------------------
// Core Actions & Operations
// --------------------------------------------------------------------------

// Folder CRUD Operations
async function saveFolder(id, name) {
  if (id) {
    // Update existing folder
    const folder = state.folders.find(f => f.id === id);
    if (folder) folder.name = name;
  } else {
    // Create new folder
    const newFolder = {
      id: 'folder-' + Date.now(),
      name: name,
      createdAt: new Date().toISOString()
    };
    state.folders.push(newFolder);
    state.activeFolderId = newFolder.id; // Switch to the newly created folder
    state.activePromptId = null;
  }
  
  await saveStateToDisk();
  closeModal(elFolderModal);
  renderAll();
}

async function deleteFolder(folderId) {
  // Remove folder
  state.folders = state.folders.filter(f => f.id !== folderId);
  
  // Remove prompts associated with folder
  state.prompts = state.prompts.filter(p => p.folderId !== folderId);
  
  // If active folder was deleted, select another one or reset
  if (state.activeFolderId === folderId) {
    state.activeFolderId = state.folders.length > 0 ? state.folders[0].id : null;
    state.activePromptId = null;
  }
  
  await saveStateToDisk();
  closeConfirmModal();
  renderAll();
}

// Prompt CRUD Operations
async function savePrompt(id, folderId, title, content, tagsString) {
  // Process tags
  const tags = tagsString
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0);
    
  if (id) {
    // Update existing prompt
    const prompt = state.prompts.find(p => p.id === id);
    if (prompt) {
      prompt.title = title;
      prompt.content = content;
      prompt.tags = tags;
      prompt.updatedAt = new Date().toISOString();
    }
  } else {
    // Create new prompt
    const newPrompt = {
      id: 'prompt-' + Date.now(),
      folderId: folderId,
      title: title,
      content: content,
      tags: tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.prompts.push(newPrompt);
    state.activePromptId = newPrompt.id; // Auto select the new prompt
  }
  
  await saveStateToDisk();
  closeModal(elPromptModal);
  renderAll();
}

async function deletePrompt(promptId) {
  state.prompts = state.prompts.filter(p => p.id !== promptId);
  
  if (state.activePromptId === promptId) {
    state.activePromptId = null;
  }
  
  await saveStateToDisk();
  closeConfirmModal();
  renderAll();
}

// Copy prompt text clipboard function
async function copyActivePrompt() {
  const activePrompt = state.prompts.find(p => p.id === state.activePromptId);
  if (!activePrompt) return;
  
  try {
    await window.api.copyToClipboard(activePrompt.content);
    
    // Copy feedback UI animation
    elBtnCopyPrompt.classList.add('copied');
    elCopyBtnText.textContent = 'Copied!';
    const icon = elBtnCopyPrompt.querySelector('svg');
    if (icon) {
      icon.innerHTML = `<path d="M20 6L9 17l-5-5"></path>`; // checkmark path
    }
    
    setTimeout(() => {
      elBtnCopyPrompt.classList.remove('copied');
      elCopyBtnText.textContent = 'Copy';
      if (icon) {
        icon.innerHTML = `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>`; // copy icon path
      }
    }, 2000);
  } catch (err) {
    console.error('Could not copy prompt text: ', err);
  }
}

// --------------------------------------------------------------------------
// Modal UI Controls
// --------------------------------------------------------------------------

function openModal(modalEl) {
  modalEl.classList.remove('hidden');
}

function closeModal(modalEl) {
  modalEl.classList.add('hidden');
}

function openFolderModal(folder = null) {
  if (folder) {
    elFolderModalTitle.textContent = 'Rename Folder';
    elFolderModalId.value = folder.id;
    elFolderNameInput.value = folder.name;
  } else {
    elFolderModalTitle.textContent = 'Create Folder';
    elFolderModalId.value = '';
    elFolderNameInput.value = '';
  }
  openModal(elFolderModal);
  elFolderNameInput.focus();
}

function openPromptModal(prompt = null) {
  if (prompt) {
    elPromptModalTitle.textContent = 'Edit Prompt';
    elPromptModalId.value = prompt.id;
    elPromptModalFolderId.value = prompt.folderId;
    elPromptTitleInput.value = prompt.title;
    elPromptTagsInput.value = prompt.tags ? prompt.tags.join(', ') : '';
    elPromptBodyInput.value = prompt.content;
  } else {
    elPromptModalTitle.textContent = 'New Prompt';
    elPromptModalId.value = '';
    elPromptModalFolderId.value = state.activeFolderId;
    elPromptTitleInput.value = '';
    elPromptTagsInput.value = '';
    elPromptBodyInput.value = '';
  }
  openModal(elPromptModal);
  elPromptTitleInput.focus();
}

function showConfirmModal(title, message, onConfirm) {
  elConfirmModalTitle.textContent = title;
  elConfirmModalMessage.textContent = message;
  onConfirmAction = onConfirm;
  openModal(elConfirmModal);
}

function closeConfirmModal() {
  closeModal(elConfirmModal);
  onConfirmAction = null;
}

// --------------------------------------------------------------------------
// Event Listeners & Event Mapping
// --------------------------------------------------------------------------

function setupEventListeners() {
  // Theme toggle
  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    feather.replace();
  });

  // Folder actions
  elBtnAddFolder.addEventListener('click', () => openFolderModal());
  
  elFolderSearch.addEventListener('input', (e) => {
    state.searchTermFolder = e.target.value;
    renderFolders();
    feather.replace();
  });
  
  elFolderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = elFolderModalId.value;
    const name = elFolderNameInput.value.trim();
    if (name) saveFolder(id, name);
  });
  
  // Prompt list controls
  elBtnAddPrompt.addEventListener('click', () => {
    if (state.activeFolderId) openPromptModal();
  });
  
  elPromptSearch.addEventListener('input', (e) => {
    state.searchTermPrompt = e.target.value;
    renderPrompts();
  });
  
  elPromptSort.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderPrompts();
  });
  
  // Prompt details controls
  elBtnCopyPrompt.addEventListener('click', copyActivePrompt);
  
  elBtnEditPrompt.addEventListener('click', () => {
    const prompt = state.prompts.find(p => p.id === state.activePromptId);
    if (prompt) openPromptModal(prompt);
  });
  
  elBtnDeletePrompt.addEventListener('click', () => {
    const prompt = state.prompts.find(p => p.id === state.activePromptId);
    if (prompt) {
      showConfirmModal(
        'Delete Prompt',
        `Are you sure you want to delete the prompt "${escapeHTML(prompt.title)}"?`,
        () => deletePrompt(prompt.id)
      );
    }
  });
  
  elPromptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = elPromptModalId.value;
    const folderId = elPromptModalFolderId.value;
    const title = elPromptTitleInput.value.trim();
    const content = elPromptBodyInput.value;
    const tagsString = elPromptTagsInput.value;
    
    if (title && content) {
      savePrompt(id, folderId, title, content, tagsString);
    }
  });
  
  // Modal Close triggers
  document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) closeModal(modal);
    });
  });
  
  // Confirm modal triggers
  elConfirmModalCancel.addEventListener('click', closeConfirmModal);
  elConfirmModalSubmit.addEventListener('click', () => {
    if (typeof onConfirmAction === 'function') {
      onConfirmAction();
    }
  });
  
  // Click outside modal to close
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeModal(e.target);
    }
  });
}

// --------------------------------------------------------------------------
// Helper Utilities
// --------------------------------------------------------------------------

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Start application
window.addEventListener('DOMContentLoaded', init);
