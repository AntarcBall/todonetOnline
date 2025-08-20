// src/js/app/state.js
import { trackCommitChange } from '../ui/acute.js';
import { debounce } from '../utils/helpers.js';
import { publish } from '../utils/pubsub.js';

// --- App State ---
let nodes = [];
let selectedNodeId = null;

// --- Helper Functions ---
async function getAuthHeader() {
    const user = firebase.auth().currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    const token = await user.getIdToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

async function apiRequest(method, path, body = null) {
    try {
        const headers = await getAuthHeader();
        const options = { method, headers };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(path, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }
        return response.status === 204 ? null : response.json();
    } catch (error) {
        console.error(`${method} request to ${path} failed:`, error);
        throw error;
    }
}


// --- State Getters/Setters ---

export function getNodes() {
    return nodes;
}

export function setNodes(newNodes) {
    nodes = newNodes;
    nodes.forEach(node => {
        if (node.color === undefined) node.color = '#000000';
        if (node.starred === undefined) node.starred = false;
        if (node.acute === undefined) node.acute = false;
        if (node.activation === undefined) node.activation = 0;
    });
    publish('stateChange');
}

export function getSelectedNodeId() {
    return selectedNodeId;
}

// --- Data Fetching ---

export async function fetchNodes() {
    try {
        const serverNodes = await apiRequest('GET', '/api/nodes');
        setNodes(serverNodes);
        return serverNodes;
    } catch (error) {
        publish('showError', 'Failed to load data. Please check your connection.');
        setNodes([]); // Clear nodes on failure
    }
}

export async function fetchTracks() {
    try {
        const tracks = await apiRequest('GET', '/api/track');
        return tracks;
    } catch (error) {
        publish('showError', 'Failed to load track data. Please check your connection.');
        return [];
    }
}


// --- API-interfacing Functions (Optimistic) ---

export function addNode(x, y) {
    const tempId = `temp_${Date.now()}`;
    const newNode = {
        id: tempId,
        name: '새로운 목표',
        commit: 0,
        x,
        y,
        links: {},
        activation: 0,
        color: '#000000',
        starred: false,
        acute: false,
    };

    nodes.push(newNode);
    selectNode(newNode.id);
    publish('stateChange');

    (async () => {
        try {
            const savedNode = await apiRequest('POST', '/api/nodes', {
                name: newNode.name,
                commit: newNode.commit,
                x: newNode.x,
                y: newNode.y,
                links: newNode.links,
                activation: newNode.activation,
                color: newNode.color,
                starred: newNode.starred,
                acute: newNode.acute,
            });
            const nodeInState = nodes.find(n => n.id === tempId);
            if (nodeInState) {
                Object.assign(nodeInState, savedNode);
                if (getSelectedNodeId() === tempId) {
                    selectNode(savedNode.id);
                }
                publish('stateChange');
            }
        } catch (error) {
            nodes = nodes.filter(n => n.id !== tempId);
            if (getSelectedNodeId() === tempId) {
                deselectNode();
            }
            publish('showError', "Failed to add node. Reverting.");
            publish('stateChange');
        }
    })();

    return newNode;
}

export function deleteNode(id) {
    if (!confirm('정말로 이 노드를 삭제하시겠습니까?')) {
        return;
    }

    const nodeIndex = nodes.findIndex(n => n.id === id);
    if (nodeIndex === -1) return;

    const deletedNode = { ...nodes[nodeIndex] };
    const originalIndex = nodeIndex;
    const relatedLinks = [];
    nodes.forEach(node => {
        if (node.links && node.links[id]) {
            relatedLinks.push({ sourceId: node.id, targetId: id, weight: node.links[id] });
        }
    });

    nodes.splice(nodeIndex, 1);
    nodes.forEach(node => {
        if (node.links && node.links[id]) {
            delete node.links[id];
        }
    });
    deselectNode();
    publish('stateChange');

    (async () => {
        try {
            await apiRequest('DELETE', `/api/nodes/${id}`);
        } catch (error) {
            nodes.splice(originalIndex, 0, deletedNode);
            relatedLinks.forEach(link => {
                const sourceNode = nodes.find(n => n.id === link.sourceId);
                if (sourceNode && sourceNode.links) {
                    sourceNode.links[link.targetId] = link.weight;
                }
            });
            publish('showError', "Failed to delete node. Reverting.");
            publish('stateChange');
        }
    })();
}

export function selectNode(id) {
    selectedNodeId = id;
    publish('stateChange');
}

export function deselectNode() {
    selectedNodeId = null;
    publish('stateChange');
}

async function sendNodeUpdate(id, updateData) {
    return apiRequest('PUT', `/api/nodes/${id}`, updateData);
}

export function updateNodeContent(id, newName, newCommit) {
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    const oldName = node.name;
    const oldCommit = node.commit;

    node.name = newName;
    node.commit = newCommit;
    trackCommitChange(id, oldCommit, newCommit);
    publish('stateChange');

    (async () => {
        try {
            await sendNodeUpdate(id, { name: newName, commit: newCommit });
        } catch (error) {
            node.name = oldName;
            node.commit = oldCommit;
            trackCommitChange(id, newCommit, oldCommit);
            publish('showError', "Failed to update content. Reverting.");
            publish('stateChange');
        }
    })();
}

export function updateNodePosition(id, x, y) {
    const node = nodes.find(n => n.id === id);
    if (node) {
        node.x = x;
        node.y = y;
        publish('stateChange');
        saveNodePositions();
    }
}

const debouncedSave = debounce(async () => {
    const positions = nodes.map(node => ({ id: node.id, x: node.x, y: node.y }));
    try {
        await apiRequest('POST', '/api/nodes/positions', { positions });
    } catch (error) {
        publish('showError', "Failed to save node positions.");
    }
}, 500);

export function saveNodePositions() {
    debouncedSave();
}

export function updateNodeColor(id, newColor) {
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    const originalColor = node.color;
    node.color = newColor;
    publish('stateChange');

    (async () => {
        try {
            await sendNodeUpdate(id, { color: newColor });
        } catch (error) {
            node.color = originalColor;
            publish('showError', "Failed to update color. Reverting.");
            publish('stateChange');
        }
    })();
}

export function toggleNodeStar(id) {
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    const originalStarred = node.starred;
    node.starred = !originalStarred;
    publish('stateChange');

    (async () => {
        try {
            await sendNodeUpdate(id, { starred: node.starred });
        } catch (error) {
            node.starred = originalStarred;
            publish('showError', "Failed to toggle star. Reverting.");
            publish('stateChange');
        }
    })();
}

export function toggleNodeAcute(id) {
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    const originalAcute = node.acute;
    node.acute = !originalAcute;
    publish('stateChange');

    (async () => {
        try {
            await sendNodeUpdate(id, { acute: node.acute });
        } catch (error) {
            node.acute = originalAcute;
            publish('showError', "Failed to toggle acute. Reverting.");
            publish('stateChange');
        }
    })();
}

export function updateLink(sourceId, targetId, weight) {
    const node = nodes.find(n => n.id === sourceId);
    if (!node) return;

    const originalLinks = { ...node.links };
    const newLinks = { ...node.links };

    if (weight === null || weight === undefined) {
        delete newLinks[targetId];
    } else {
        newLinks[targetId] = weight;
    }

    node.links = newLinks;
    publish('stateChange');

    (async () => {
        try {
            await sendNodeUpdate(sourceId, { links: newLinks });
        } catch (error) {
            node.links = originalLinks;
            publish('showError', "Failed to update link. Reverting.");
            publish('stateChange');
        }
    })();
}
