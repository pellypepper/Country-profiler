📌 Country Profiler
A web-based interactive application that displays detailed country profiles, including borders, capital, currency, population, live weather, Wikipedia summary, and recent earthquake data. Built using Leaflet.js and powered by multiple public APIs.

🌍 Live Preview
Note: Host locally or deploy with platforms like Netlify, GitHub Pages, or Vercel for a live demo.

🚀 Features
🌐 Interactive world map (OpenStreetMap + Leaflet)

📍 Detects user location and highlights their country

🏛️ Country data via REST Countries

☁️ Real-time weather from OpenWeatherMap

🔁 Currency exchange rates via ExchangeRate API

🌋 Recent earthquakes from USGS

📚 Wikipedia summaries

🧭 GeoJSON country borders with selection dropdown

🧩 Marker clustering, custom icons, and easy map controls


⚙️ Setup Instructions
1. Clone the Repository
bash
Copy
Edit
git clone https://github.com/your-username/country-profiler.git
cd country-profiler
2. Install Dependencies
This project uses only local assets. No build tools required. Just ensure:

Web server like XAMPP/WAMP/Live Server is running

PHP is enabled (for getCountryInfo.php and getBorders.php)

3. Font Awesome Setup
Download Font Awesome Free and place:

all.min.css in css/

webfonts/ in libs/webfonts/

Make sure paths in all.min.css match your folder structure.

📦 API Keys (Required)
Update the following keys in php/getCountryInfo.php:

php
Copy
Edit
$apiKey = 'YOUR_OPENCAGE_API_KEY';
$openWeatherKey = 'YOUR_OPENWEATHERMAP_API_KEY';
Get OpenCage API key

Get OpenWeatherMap API key

🗺️ How It Works
User selects a country or lets app detect their location

App queries several APIs and updates:

Map with borders

Sidebar with info

Weather overlay toggle

Clicking the map opens sidebar with updated info
