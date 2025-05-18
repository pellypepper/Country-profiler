# 📌 Country Profiler

A web-based interactive application that displays detailed country profiles, including borders, capital, currency, population, live weather, Wikipedia summary, and recent earthquake data. Built using Leaflet.js and powered by multiple public APIs.

---

## 🌍 Live Preview

> **Note:** Live Demo link github link: https://ppeliance.42web.io/

---

## 🚀 Features

- 🌐 Interactive world map (OpenStreetMap + Leaflet)
- 📍 Detects user location and highlights their country
- 🏛️ Country data via [REST Countries](https://restcountries.com)
- ☁️ Real-time weather from [OpenWeatherMap](https://openweathermap.org/)
- 🔁 Currency exchange rates via [ExchangeRate API](https://www.exchangerate-api.com/)
- 🌋 Recent earthquakes from [USGS](https://earthquake.usgs.gov/)
- 📚 Wikipedia summaries
- 🧭 GeoJSON country borders with selection dropdown
- 🧩 Marker clustering, custom icons, and easy map controls

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
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
User selects a country from the dropdown or allows auto-detection by geolocation.

The app queries multiple APIs and updates:

The map with country borders, airports, cities, and earthquake markers.

The sidebar with detailed country info, currency converter, Wikipedia summaries, weather forecast, and news.

The weather overlay on the map.

📱 User Interface and Controls
Easy Buttons for Sidebar Sections
At the top-right of the map, several easy buttons provide quick access to different sidebar sections and map functions:

Button Icon	Function
🌩️ fa-cloud	Toggle the weather overlay (cloud map).
🌐 fa-globe	Reset the map view to default world view.
📖 fa-wikipedia-w	Show the Wikipedia article sidebar section with country summaries.
💵 fa-money-bill-wave	Show the Currency Converter sidebar.
🌤️ fa-cloud-sun	Show the 3-day weather forecast sidebar.
📰 fa-newspaper	Show the Latest news related to the selected country.
🏠 fa-home	Show General Info sidebar with country basics and resets map view.

Sidebar Sections
Each easy button reveals a different sidebar section:

General Info: Displays country name, capital, population, region, subregion, area, currency, languages, flag, coat of arms, and recent earthquakes.

Wikipedia: Top Wikipedia search results for the country with links.

Currency Converter: Convert between the country's currency and other supported currencies.

Weather Forecast: Shows 3-day weather forecast for the country's capital.

Latest News: Displays news headlines related to the country.

The sidebar can be opened by clicking on the map markers or using the easy buttons and closed via the close button.

Airports and Cities Markers with Layer Control
Airports and Cities are displayed as clustered markers on the map using Leaflet MarkerCluster plugin.

Airports use a blue plane icon, cities use a green city icon.

Marker clusters improve performance and usability by grouping close markers.

These marker layers are toggleable using the layer control panel at the top-right corner:

Overlay Layer	Description
Airports	Shows clustered airport locations within the selected country.
Cities	Shows clustered major city locations within the selected country.
Earthquakes	Shows recent significant earthquakes worldwide (magnitude > 4.5).

Users can toggle these overlays on/off to customize the map view.

The Earthquakes layer loads dynamically when enabled and clears when disabled.

