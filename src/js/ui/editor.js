// editor.js
import { config } from '../utils/config.js';

let editorPanel, closePanelBtn, editorForm, linksTableBody, deleteNodeBtn, colorPaletteContainer, starNodeBtn, acuteNodeBtn;
let onSaveCallback, onCloseCallback, onLinkUpdateCallback, onDeleteCallback, onColorUpdateCallback, onStarUpdateCallback, onAcuteUpdateCallback;
let currentNodes = [];
let selectedNodeId = null;

const availableColors = ['#FFFFFF', '#fef08a', '#a7f3d0', '#fecdd3', '#d8b4fe', '#a5f3fc', '#fdba74'];

export function initEditor(callbacks) {
    // Cache DOM elements
    editorPanel = document.getElementById('editor-panel');
    closePanelBtn = document.getElementById('close-panel-btn');
    deleteNodeBtn = document.getElementById('delete-node-btn');
    starNodeBtn = document.getElementById('star-node-btn');
    acuteNodeBtn = document.getElementById('acute-node-btn');
    editorForm = document.getElementById('node-editor-form');
    linksTableBody = document.getElementById('links-table-body');
    colorPaletteContainer = document.getElementById('color-palette');

    // Set up callbacks
    onSaveCallback = callbacks.onSave;
    onCloseCallback = callbacks.onClose;
    onLinkUpdateCallback = callbacks.onLinkUpdate;
    onDeleteCallback = callbacks.onDelete;
    onColorUpdateCallback = callbacks.onColorUpdate;
    onStarUpdateCallback = callbacks.onStarUpdate;
    onAcuteUpdateCallback = callbacks.onAcuteUpdate;

    // Add event listeners
    closePanelBtn.addEventListener('click', () => onCloseCallback());
    deleteNodeBtn.addEventListener('click', () => {
        if (selectedNodeId) onDeleteCallback(selectedNodeId);
    });
    starNodeBtn.addEventListener('click', () => {
        if (selectedNodeId) onStarUpdateCallback(selectedNodeId);
    });
    acuteNodeBtn.addEventListener('click', () => {
        if (selectedNodeId) onAcuteUpdateCallback(selectedNodeId);
    });
    editorForm.addEventListener('submit', handleFormSubmit);
    linksTableBody.addEventListener('click', handleLinksTableClick);
    colorPaletteContainer.addEventListener('click', handleColorPaletteClick);
    editorPanel.addEventListener('keydown', handlePanelKeyDown);

    document.getElementById('commit-plus-1').addEventListener('click', () => handleCommitButtonClick(1));
    document.getElementById('commit-plus-5').addEventListener('click', () => handleCommitButtonClick(5));
}

function handleCommitButtonClick(amount) {
    const commitInput = document.getElementById('node-commit-input');
    const currentCommit = parseInt(commitInput.value, 10) || 0;
    commitInput.value = currentCommit + amount;
    // Programmatically trigger the form submission to save the change
    editorForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('node-id-input').value;
    const name = document.getElementById('node-name-input').value;
    const commit = parseInt(document.getElementById('node-commit-input').value, 10) || 0;
    console.log(`Editor Save: Node Name - "${name}", Commit - ${commit}`);
    onSaveCallback(id, name, commit);
}

function handleLinksTableClick(e) {
    const sourceNode = currentNodes.find(n => n.id === selectedNodeId);
    if (!sourceNode) return;

    const weightBtn = e.target.closest('.link-weight-btn');
    const deleteBtn = e.target.closest('.link-delete-btn');

    if (weightBtn) {
        const targetId = weightBtn.dataset.targetId;
        const currentWeight = sourceNode.links[targetId] || 0;
        const direction = weightBtn.dataset.direction;
        // Cycle through weights 1, 2, 3
        const newWeight = direction === 'up' ? (currentWeight % 3) + 1 : ((currentWeight - 2 + 3) % 3) + 1;
        onLinkUpdateCallback(sourceNode.id, targetId, newWeight);
    }

    if (deleteBtn) {
        const targetId = deleteBtn.dataset.targetId;
        onLinkUpdateCallback(sourceNode.id, targetId, null); // Pass null to signify deletion
    }
}

function handleColorPaletteClick(e) {
    const swatch = e.target.closest('.color-swatch');
    if (swatch && selectedNodeId) {
        const newColor = swatch.dataset.color;
        onColorUpdateCallback(selectedNodeId, newColor);
    }
}

function handlePanelKeyDown(e) {
    // Shortcut for increasing commit value
    if (config.debug.easy_commit && e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const commitInput = document.getElementById('node-commit-input');
        const currentCommit = parseInt(commitInput.value, 10) || 0;
        commitInput.value = currentCommit + 20;
    }
}

export function renderEditorPanel(nodes, sId) {
    currentNodes = nodes;
    selectedNodeId = sId;
    const node = currentNodes.find(n => n.id === selectedNodeId);

    if (node) {
        editorPanel.classList.add('show');
        document.getElementById('node-id-input').value = node.id;
        document.getElementById('node-name-input').value = node.name;
        document.getElementById('node-commit-input').value = node.commit;

        // Update button states
        starNodeBtn.classList.toggle('starred', node.starred);
        acuteNodeBtn.classList.toggle('acute', node.acute);

        renderLinks(node);
        renderColorPalette(node);
    } else {
        editorPanel.classList.remove('show');
    }
}

function renderLinks(node) {
    linksTableBody.innerHTML = '';
    for (const targetNodeId in node.links) {
        const targetNode = currentNodes.find(n => n.id === targetNodeId);
        if (!targetNode) continue;

        const weight = node.links[targetNodeId];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td title="${targetNode.name}">${targetNode.name}</td>
            <td>
                <div class="link-weight-controls">
                    <span class="weight-value">${weight}</span>
                    <div class="weight-buttons">
                        <button class="link-weight-btn" data-target-id="${targetNodeId}" data-direction="up">
                            <svg class="pointer-events-none" width="12" height="12" viewBox="0 0 24 24"><path d="M12 4l-8 8h16z" fill="currentColor"/></svg>
                        </button>
                        <button class="link-weight-btn" data-target-id="${targetNodeId}" data-direction="down">
                            <svg class="pointer-events-none" width="12" height="12" viewBox="0 0 24 24"><path d="M12 20l8-8H4z" fill="currentColor"/></svg>
                        </button>
                    </div>
                </div>
            </td>
            <td style="text-align: center;">
                <button class="link-delete-btn" data-target-id="${targetNodeId}">
                    <svg class="pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </td>
        `;
        linksTableBody.appendChild(row);
    }
}

function renderColorPalette(node) {
    colorPaletteContainer.innerHTML = '';
    availableColors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.dataset.color = color;
        swatch.style.backgroundColor = color;
        swatch.classList.toggle('selected', node.color === color);
        colorPaletteContainer.appendChild(swatch);
    });
}