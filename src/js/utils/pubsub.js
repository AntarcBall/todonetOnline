// src/js/utils/pubsub.js

const events = {};

/**
 * Subscribe to an event.
 * @param {string} eventName The name of the event to subscribe to.
 * @param {Function} callback The function to call when the event is published.
 * @returns {{unsubscribe: Function}} An object with an unsubscribe method.
 */
export function subscribe(eventName, callback) {
    if (!events[eventName]) {
        events[eventName] = [];
    }
    events[eventName].push(callback);

    return {
        unsubscribe: () => {
            events[eventName] = events[eventName].filter(cb => cb !== callback);
        }
    };
}

/**
 * Publish an event.
 * @param {string} eventName The name of the event to publish.
 * @param {*} data The data to pass to the subscribers.
 */
export function publish(eventName, data) {
    if (events[eventName]) {
        events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in subscriber for event "${eventName}":`, error);
            }
        });
    }
}
