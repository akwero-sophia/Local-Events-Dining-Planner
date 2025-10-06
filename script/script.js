// Ticketmaster API Configuration
const TICKETMASTER_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual API key
const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

// State management
let myPlanner = [];

// DOM Elements
const eventSearchForm = document.getElementById('eventSearchForm');
const diningSearchForm = document.getElementById('diningSearchForm');
const eventResults = document.getElementById('eventResults');
const diningResults = document.getElementById('diningResults');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const plannerItems = document.getElementById('plannerItems');

// Initialize app
function init() {
    setupEventListeners();
    loadPlannerFromStorage();
    testTicketmasterAPI();
}

// Setup event listeners
function setupEventListeners() {
    eventSearchForm.addEventListener('submit', handleEventSearch);
    diningSearchForm.addEventListener('submit', handleDiningSearch);
}

// Test Ticketmaster API with sample query
async function testTicketmasterAPI() {
    console.log('Testing Ticketmaster API...');
    
    try {
        const testCity = 'New York';
        const url = `${TICKETMASTER_BASE_URL}?apikey=${TICKETMASTER_API_KEY}&city=${testCity}&size=5`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data._embedded && data._embedded.events) {
            console.log('✅ Ticketmaster API Test Successful!');
            console.log('Sample Events Found:', data._embedded.events.length);
            console.log('First Event:', data._embedded.events[0].name);
            return true;
        } else {
            console.log('⚠️ No events found in test query');
            return false;
        }
    } catch (error) {
        console.error('❌ Ticketmaster API Test Failed:', error);
        console.log('Please make sure to add your API key in the script.js file');
        return false;
    }
}

// Handle event search
async function handleEventSearch(e) {
    e.preventDefault();
    
    const location = document.getElementById('location').value;
    const eventType = document.getElementById('eventType').value;
    const dateRange = document.getElementById('dateRange').value;
    
    if (!location) {
        showError('Please enter a location');
        return;
    }
    
    // Show loading state
    showLoading(true);
    hideError();
    
    try {
        const events = await fetchEvents(location, eventType, dateRange);
        displayEvents(events);
    } catch (error) {
        showError('Failed to fetch events. Please try again.');
        console.error('Error fetching events:', error);
    } finally {
        showLoading(false);
    }
}

// Fetch events from Ticketmaster API
async function fetchEvents(location, eventType, date) {
    let url = `${TICKETMASTER_BASE_URL}?apikey=${TICKETMASTER_API_KEY}&city=${location}&size=20`;
    
    // Add classification if event type is selected
    if (eventType) {
        const classificationMap = {
            'music': 'music',
            'sports': 'sports',
            'arts': 'arts',
            'family': 'family'
        };
        url += `&classificationName=${classificationMap[eventType]}`;
    }
    
    // Add date filter if provided
    if (date) {
        url += `&startDateTime=${date}T00:00:00Z`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error('API request failed');
    }
    
    const data = await response.json();
    
    if (data._embedded && data._embedded.events) {
        return data._embedded.events;
    }
    
    return [];
}

// Display events in the results grid
function displayEvents(events) {
    if (events.length === 0) {
        eventResults.innerHTML = '<p class="empty-state">No events found. Try different search criteria.</p>';
        return;
    }
    
    eventResults.innerHTML = events.map(event => {
        const imageUrl = event.images ? event.images[0].url : '';
        const date = event.dates?.start?.localDate || 'Date TBA';
        const time = event.dates?.start?.localTime || '';
        const venue = event._embedded?.venues?.[0]?.name || 'Venue TBA';
        const priceRange = event.priceRanges 
            ? `$${event.priceRanges[0].min} - $${event.priceRanges[0].max}`
            : 'Price TBA';
        
        return `
            <div class="event-card">
                <div class="event-image" style="background-image: url('${imageUrl}'); background-size: cover; background-position: center;">
                </div>
                <div class="event-content">
                    <h4 class="event-title">${event.name}</h4>
                    <p class="event-date">📅 ${date} ${time}</p>
                    <p class="event-venue">📍 ${venue}</p>
                    <p class="event-price">💵 ${priceRange}</p>
                    <button class="btn btn-secondary" onclick="addToPlanner('${event.id}', '${escapeHtml(event.name)}', '${date}', '${escapeHtml(venue)}')">
                        Add to Planner
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Handle dining search (placeholder - would integrate with restaurant API)
function handleDiningSearch(e) {
    e.preventDefault();
    
    const location = document.getElementById('diningLocation').value;
    const cuisine = document.getElementById('cuisine').value;
    
    // Placeholder functionality
    diningResults.innerHTML = `
        <div class="restaurant-card">
            <div class="restaurant-image" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"></div>
            <div class="restaurant-content">
                <h4 class="restaurant-name">Sample Restaurant</h4>
                <p class="restaurant-cuisine">🍽️ ${cuisine || 'Various'} Cuisine</p>
                <p class="restaurant-rating">⭐ 4.5/5</p>
                <p class="restaurant-address">📍 ${location || 'City Center'}</p>
            </div>
        </div>
        <div class="restaurant-card">
            <div class="restaurant-image" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);"></div>
            <div class="restaurant-content">
                <h4 class="restaurant-name">Another Great Spot</h4>
                <p class="restaurant-cuisine">🍽️ ${cuisine || 'International'} Cuisine</p>
                <p class="restaurant-rating">⭐ 4.8/5</p>
                <p class="restaurant-address">📍 ${location || 'Downtown'}</p>
            </div>
        </div>
    `;
}

// Add event to planner
function addToPlanner(eventId, eventName, eventDate, eventVenue) {
    const event = {
        id: eventId,
        name: eventName,
        date: eventDate,
        venue: eventVenue,
        addedAt: new Date().toISOString()
    };
    
    // Check if already in planner
    if (myPlanner.some(e => e.id === eventId)) {
        alert('This event is already in your planner!');
        return;
    }
    
    myPlanner.push(event);
    savePlannerToStorage();
    displayPlanner();
    
    // Show success message
    alert(`"${eventName}" added to your planner!`);
}

// Remove event from planner
function removeFromPlanner(eventId) {
    myPlanner = myPlanner.filter(e => e.id !== eventId);
    savePlannerToStorage();
    displayPlanner();
}

// Display planner items
function displayPlanner() {
    const emptyState = document.querySelector('.empty-state');
    
    if (myPlanner.length === 0) {
        emptyState.style.display = 'block';
        plannerItems.innerHTML = '';
        return;
    }
    
    emptyState.style.display = 'none';
    
    plannerItems.innerHTML = myPlanner.map(event => `
        <div class="event-card" style="display: flex; align-items: center; padding: 1rem;">
            <div style="flex: 1;">
                <h4>${event.name}</h4>
                <p>📅 ${event.date}</p>
                <p>📍 ${event.venue}</p>
            </div>
            <button class="btn btn-secondary" style="width: auto;" onclick="removeFromPlanner('${event.id}')">
                Remove
            </button>
        </div>
    `).join('');
}

// Storage functions
function savePlannerToStorage() {
    try {
        // Using a simple in-memory storage since we can't use localStorage
        // In a real application, this would persist to localStorage
        console.log('Planner saved:', myPlanner);
    } catch (error) {
        console.error('Error saving planner:', error);
    }
}

function loadPlannerFromStorage() {
    try {
        // In a real application, this would load from localStorage
        myPlanner = [];
        displayPlanner();
    } catch (error) {
        console.error('Error loading planner:', error);
    }
}

// Utility functions
function showLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
    if (show) {
        eventResults.style.display = 'none';
    } else {
        eventResults.style.display = 'grid';
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Log instructions for API key
console.log(`
╔════════════════════════════════════════════════════════════╗
║  TICKETMASTER API SETUP INSTRUCTIONS                       ║
╚════════════════════════════════════════════════════════════╝

1. Get your FREE API key from: https://developer.ticketmaster.com/
2. Create an account and register a new app
3. Copy your Consumer Key (API Key)
4. Replace 'YOUR_API_KEY_HERE' in script.js with your actual key
5. Refresh the page to test the API connection

The app will automatically test the API connection on load.
`);