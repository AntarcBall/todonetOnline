// src/js/ui/tooltip.js

export async function initTooltips() {
    try {
        const response = await fetch('../tooltips.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const tooltips = await response.json();

        for (const [elementId, tooltipText] of Object.entries(tooltips)) {
            const element = document.getElementById(elementId);
            if (element) {
                element.setAttribute('title', tooltipText);
            }
        }
    } catch (error) {
        console.error("Failed to initialize tooltips:", error);
    }
}
