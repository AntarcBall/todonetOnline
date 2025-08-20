import { fetchTracks, getNodes } from '../app/state.js';
import { showSnackbar } from './ui.js';

let isTrackHistoryInitialized = false;

export function initTrackHistory() {
    if (isTrackHistoryInitialized) return;
    
    const trackHistoryBtn = document.getElementById('track-history-btn');
    const trackHistoryModal = document.getElementById('track-history-modal');
    const closeTrackHistoryBtn = document.getElementById('close-track-history');
    const trackHistoryList = document.getElementById('track-history-list');
    
    if (!trackHistoryBtn || !trackHistoryModal || !closeTrackHistoryBtn || !trackHistoryList) {
        console.warn('Track history elements not found in DOM');
        return;
    }
    
    // Open modal
    trackHistoryBtn.addEventListener('click', async () => {
        // On mobile, hide panels first
        if (window.innerWidth <= 640) {
            const togglePanelsBtn = document.getElementById('toggle-panels-btn');
            if (togglePanelsBtn && !togglePanelsBtn.classList.contains('disabled')) {
                togglePanelsBtn.click();
            }
        }
        
        // Show loading state
        trackHistoryList.innerHTML = '<li class="track-history-item">Loading...</li>';
        trackHistoryModal.classList.add('show');
        
        try {
            const tracks = await fetchTracks();
            renderTrackHistory(tracks);
        } catch (error) {
            console.error('Error fetching track history:', error);
            trackHistoryList.innerHTML = '<li class="track-history-item">Failed to load track history</li>';
            showSnackbar('Failed to load track history');
        }
    });
    
    // Close modal
    closeTrackHistoryBtn.addEventListener('click', () => {
        trackHistoryModal.classList.remove('show');
    });
    
    // Close modal when clicking outside content
    trackHistoryModal.addEventListener('click', (e) => {
        if (e.target === trackHistoryModal) {
            trackHistoryModal.classList.remove('show');
        }
    });
    
    isTrackHistoryInitialized = true;
}

function renderTrackHistory(tracks) {
    const trackHistoryList = document.getElementById('track-history-list');
    const nodes = getNodes();
    
    if (tracks.length === 0) {
        trackHistoryList.innerHTML = '<li class="track-history-item">No track history found</li>';
        return;
    }
    
    // Sort tracks by date descending
    tracks.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Create a map of node ID to node name
    const nodeMap = {};
    nodes.forEach(node => {
        nodeMap[node.id] = node.name;
    });
    
    // Process tracks to calculate level changes
    const processedTracks = [];
    const previousLevels = {};
    
    tracks.forEach(track => {
        const changes = [];
        const currentDate = new Date(track.date);
        const previousDate = new Date(currentDate);
        previousDate.setDate(currentDate.getDate() - 1);
        const previousDateString = previousDate.toISOString().slice(0, 10);
        
        Object.entries(track.levels).forEach(([nodeId, currentLevel]) => {
            const nodeName = nodeMap[nodeId] || `Unknown Node (${nodeId})`;
            const previousLevel = previousLevels[nodeId] || 0;
            const levelChange = currentLevel - previousLevel;
            
            if (levelChange > 0) {
                changes.push({
                    nodeId,
                    nodeName,
                    levelChange
                });
            }
            
            // Update previous level for next iteration
            previousLevels[nodeId] = currentLevel;
        });
        
        if (changes.length > 0) {
            processedTracks.push({
                date: track.date,
                changes
            });
        }
    });
    
    // Render processed tracks
    if (processedTracks.length === 0) {
        trackHistoryList.innerHTML = '<li class="track-history-item">No level changes found</li>';
        return;
    }
    
    trackHistoryList.innerHTML = '';
    
    processedTracks.forEach(track => {
        const listItem = document.createElement('li');
        listItem.className = 'track-history-item';
        
        const dateObj = new Date(track.date);
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const dateString = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
        
        let changesHtml = '';
        track.changes.forEach(change => {
            changesHtml += `<div class="track-history-change">+${change.levelChange}Lv ${change.nodeName}</div>`;
        });
        
        listItem.innerHTML = `
            <div class="track-history-date">${dateString}</div>
            <div class="track-history-changes">${changesHtml}</div>
        `;
        
        trackHistoryList.appendChild(listItem);
    });
}