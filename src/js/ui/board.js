// board.js
import { getNodes, getSelectedNodeId, selectNode, deselectNode, updateNodePosition, updateLink, saveNodePositions } from '../app/state.js';
import { renderAll, updateTemporaryArrow, showSnackbar } from './ui.js';

const boardState = { panX: 0, panY: 0, zoom: 1, isPanning: false, lastMouseX: 0, lastMouseY: 0 };
const dragState = { isDraggingNode: false, draggedNodeId: null, offsetX: 0, offsetY: 0, lastMoveX: 0, lastMoveY: 0 };
const linkState = { isLinking: false, sourceNodeId: null };
const pinchState = { isPinching: false, initialPinchDistance: 0 };

let boardElement;

export function initBoard() {
    boardElement = document.getElementById('board');

    // Center the view on the content initially
    const boardRect = boardElement.getBoundingClientRect();
    const boardSize = 10000; // Must match the size set in ui.js
    boardState.panX = (boardRect.width / 2) - (boardSize / 2);
    boardState.panY = (boardRect.height / 2) - (boardSize / 2);

    addEventListeners();
}

function addEventListeners() {
    // Mouse Events
    boardElement.addEventListener('mousedown', handleInteractionStart);
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('mousemove', handleInteractionMove);
    boardElement.addEventListener('wheel', handleBoardWheel);
    boardElement.addEventListener('click', handleBoardClick);
    boardElement.addEventListener('contextmenu', handleNodeContextMenu);

    // Touch Events
    boardElement.addEventListener('touchstart', handleInteractionStart, { passive: false });
    window.addEventListener('touchend', handleInteractionEnd);
    window.addEventListener('touchmove', handleInteractionMove, { passive: false });
}

// --- Event Normalization ---
function normalizeEvent(e) {
    if (e.touches) {
        if (e.touches.length > 1) {
            return { isMultiTouch: true, touches: e.touches, preventDefault: () => e.preventDefault() };
        }
        const touch = e.touches[0] || e.changedTouches[0];
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: touch.target,
            button: 0, // Simulate left-click for touch
            isTouch: true,
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
        };
    }
    return {
        clientX: e.clientX,
        clientY: e.clientY,
        target: e.target,
        button: e.button,
        isTouch: false,
        movementX: e.movementX,
        movementY: e.movementY,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
    };
}


function handleInteractionStart(e) {
    const evt = normalizeEvent(e);

    if (evt.isMultiTouch && evt.touches.length === 2) {
        evt.preventDefault();
        pinchState.isPinching = true;
        pinchState.initialPinchDistance = getPinchDistance(evt.touches);
        boardState.isPanning = false;
        dragState.isDraggingNode = false;
        return;
    }
    
    const nodeEl = evt.target.closest('.node');

    if (nodeEl) {
        evt.stopPropagation();
        const nodeId = nodeEl.dataset.id;
        // Selecting a node will trigger a stateChange event, which handles the re-render.
        selectNode(nodeId); 

        dragState.isDraggingNode = true;
        dragState.draggedNodeId = nodeId;
        dragState.lastMoveX = evt.clientX;
        dragState.lastMoveY = evt.clientY;
        boardElement.classList.remove('grabbing');

    } else if (evt.target === boardElement || evt.target.id === 'node-container') {
        boardElement.classList.add('grabbing');
        boardState.isPanning = true;
        boardState.lastMouseX = evt.clientX;
        boardState.lastMouseY = evt.clientY;
    }
}


function handleInteractionEnd(e) {
    if (pinchState.isPinching) {
        pinchState.isPinching = false;
        pinchState.initialPinchDistance = 0;
    }

    const evt = normalizeEvent(e);
    if (linkState.isLinking) {
        const targetEl = evt.target.closest('.node');
        if (targetEl) {
            const targetNodeId = targetEl.dataset.id;
            const sourceNode = getNodes().find(n => n.id === linkState.sourceNodeId);
            if (sourceNode && targetNodeId !== linkState.sourceNodeId) {
                if (sourceNode.links[targetNodeId]) {
                    showSnackbar("Link already exists.");
                } else {
                    // updateLink will trigger a stateChange event.
                    updateLink(linkState.sourceNodeId, targetNodeId, 1);
                }
            }
        }
    }

    if (dragState.isDraggingNode) {
        saveNodePositions();
    }

    boardElement.classList.remove('grabbing');
    boardState.isPanning = false;
    dragState.isDraggingNode = false;
    dragState.draggedNodeId = null;
    linkState.isLinking = false;
    linkState.sourceNodeId = null;
    updateTemporaryArrow(null);
}

function handleInteractionMove(e) {
    const evt = normalizeEvent(e);

    // For high-frequency events like pinch, drag, and pan, we render directly
    // to ensure smooth animations, bypassing the pub/sub model for performance.
    if (evt.isMultiTouch && evt.touches.length === 2) {
        evt.preventDefault();
        handlePinch(evt.touches);
        return;
    }

    if (linkState.isLinking) {
        evt.preventDefault();
        const boardRect = boardElement.getBoundingClientRect();
        const mouseX = (evt.clientX - boardRect.left - boardState.panX) / boardState.zoom;
        const mouseY = (evt.clientY - boardRect.top - boardState.panY) / boardState.zoom;
        const sourceNode = getNodes().find(n => n.id === linkState.sourceNodeId);
        updateTemporaryArrow(sourceNode, mouseX, mouseY);

    } else if (dragState.isDraggingNode) {
        evt.preventDefault();
        const node = getNodes().find(n => n.id === dragState.draggedNodeId);
        if (node) {
            const movementX = evt.isTouch ? evt.clientX - dragState.lastMoveX : evt.movementX;
            const movementY = evt.isTouch ? evt.clientY - dragState.lastMoveY : evt.movementY;
            
            const newX = node.x + movementX / boardState.zoom;
            const newY = node.y + movementY / boardState.zoom;
            // updateNodePosition does not save, just updates state locally.
            // It also does not publish a stateChange to avoid flooding, we render manually here.
            node.x = newX;
            node.y = newY;

            dragState.lastMoveX = evt.clientX;
            dragState.lastMoveY = evt.clientY;
            
            renderAll(getNodes(), getSelectedNodeId(), boardState);
        }
    } else if (boardState.isPanning) {
        evt.preventDefault();
        boardState.panX += evt.clientX - boardState.lastMouseX;
        boardState.panY += evt.clientY - boardState.lastMouseY;
        boardState.lastMouseX = evt.clientX;
        boardState.lastMouseY = evt.clientY;
        renderAll(getNodes(), getSelectedNodeId(), boardState);
    }
}

function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function handlePinch(touches) {
    const newDistance = getPinchDistance(touches);
    const oldZoom = boardState.zoom;
    const zoomFactor = newDistance / pinchState.initialPinchDistance;

    const newZoom = oldZoom * zoomFactor;
    boardState.zoom = Math.max(0.2, Math.min(2, newZoom));

    const rect = boardElement.getBoundingClientRect();
    const pinchCenterX = (touches[0].clientX + touches[1].clientX) / 2 - rect.left;
    const pinchCenterY = (touches[0].clientY + touches[1].clientY) / 2 - rect.top;

    boardState.panX = pinchCenterX - (pinchCenterX - boardState.panX) * (boardState.zoom / oldZoom);
    boardState.panY = pinchCenterY - (pinchCenterY - boardState.panY) * (boardState.zoom / oldZoom);
    
    pinchState.initialPinchDistance = newDistance;

    renderAll(getNodes(), getSelectedNodeId(), boardState);
}


function handleBoardWheel(e) {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const oldZoom = boardState.zoom;
    
    const mouseX = e.clientX - boardElement.getBoundingClientRect().left;
    const mouseY = e.clientY - boardElement.getBoundingClientRect().top;

    const newZoom = oldZoom - e.deltaY * (zoomSpeed / 100);
    boardState.zoom = Math.max(0.2, Math.min(2, newZoom));

    boardState.panX = mouseX - (mouseX - boardState.panX) * (boardState.zoom / oldZoom);
    boardState.panY = mouseY - (mouseY - boardState.panY) * (boardState.zoom / oldZoom);

    renderAll(getNodes(), getSelectedNodeId(), boardState);
}

function handleBoardClick(e) {
    if (e.target === boardElement || e.target.id === 'node-container') {
        // deselectNode will trigger a stateChange event.
        deselectNode();
    }
}

function handleNodeContextMenu(e) {
    const nodeEl = e.target.closest('.node');
    if (!nodeEl) return;

    e.preventDefault();
    e.stopPropagation();
    const nodeId = nodeEl.dataset.id;
    linkState.isLinking = true;
    linkState.sourceNodeId = nodeId;
}

export function getBoardState() {
    return boardState;
}
