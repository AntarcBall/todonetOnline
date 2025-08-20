import { initTooltips } from './ui/tooltip.js';
import { 
    getNodes, 
    setNodes,
    getSelectedNodeId, 
    deselectNode,
    fetchNodes, 
    updateNodeContent, 
    updateNodeColor, 
    toggleNodeStar, 
    toggleNodeAcute, 
    deleteNode, 
    updateLink,
    fetchTracks
} from './app/state.js';
import { initUI, renderAll, showSnackbar, defineSvgDefs } from './ui/ui.js';
import { initBoard, getBoardState } from './ui/board.js';
import { initControls } from './ui/controls.js';
import { initEditor } from './ui/editor.js';
import { initAcutePanel } from './ui/acute.js';
import { initAuth } from './auth.js';
import { subscribe } from './utils/pubsub.js';
import { initTrackHistory } from './ui/trackHistory.js';

function getEditorCallbacks() {
    // These functions now only call the state update functions.
    // The re-rendering is handled by the 'stateChange' subscription.
    return {
        onClose: deselectNode,
        onSave: updateNodeContent,
        onColorUpdate: updateNodeColor,
        onStarUpdate: toggleNodeStar,
        onAcuteUpdate: toggleNodeAcute,
        onLinkUpdate: updateLink,
        onDelete: deleteNode
    };
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize UI Components
    initUI();
    initBoard();
    initControls();
    initAcutePanel();
    initEditor(getEditorCallbacks());
    initTheme();
    initTooltips();
    initTrackHistory();

    // 2. Setup Subscriptions
    subscribe('stateChange', rerender);
    subscribe('showError', (message) => showSnackbar(message));

    // 3. Initialize Authentication
    initAuth(onUserLoggedIn, onUserLoggedOut);
});

// --- Theme Management ---
function initTheme() {
    const themeSwitcher = document.getElementById('theme-switcher');
    const body = document.body;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.remove('dark');
    } else {
        body.classList.add('dark');
    }
    defineSvgDefs();

    themeSwitcher.addEventListener('click', () => {
        body.classList.toggle('dark');
        const newTheme = body.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        
        defineSvgDefs();
        rerender();
    });
}

// --- Auth State Change Callbacks ---

async function onUserLoggedIn(user) {
    const appElement = document.getElementById('app');
    if(appElement) appElement.style.filter = 'none';
    
    showSnackbar(`환영합니다, ${user.displayName}님!`);
    
    await fetchNodes(); // This will trigger a 'stateChange' event on success/failure
}

function onUserLoggedOut() {
    const appElement = document.getElementById('app');
    if(appElement) appElement.style.filter = 'blur(4px)';

    setNodes([]); // This triggers a 'stateChange' event
}

// --- Core Functions ---

function rerender() {
    // The single source of truth for re-rendering the entire application
    renderAll(getNodes(), getSelectedNodeId(), getBoardState());
}

// --- Debugging/Utility ---
window.exportNodes = () => {
    const dataStr = JSON.stringify(getNodes(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todonet_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSnackbar('Node data exported successfully.');
};

window.showTrack = async () => {
    try {
        const tracks = await fetchTracks();
        console.log('Track records:', tracks);
        
        // Create and display a simple modal or alert with track data
        let trackInfo = "Your Track Records:\n\n";
        if (tracks.length === 0) {
            trackInfo += "No records found.";
        } else {
            tracks.forEach(track => {
                trackInfo += `Date: ${track.date}\n`;
                Object.entries(track.levels).forEach(([nodeId, level]) => {
                    const node = getNodes().find(n => n.id === nodeId);
                    const nodeName = node ? node.name : 'Unknown Node';
                    trackInfo += `  - ${nodeName} (ID: ${nodeId}): Lv.${level}\n`;
                });
                trackInfo += "\n";
            });
        }
        
        alert(trackInfo);
    } catch (error) {
        console.error('Error showing track records:', error);
        alert('Failed to load track records. Please check the console for more details.');
    }
};

// Initialize track history functionality
initTrackHistory();

