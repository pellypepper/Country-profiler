let map;
let currentGeoJsonLayer = null;

$(document).ready(function () {
  initMap();
  getUserLocation();
  populateCountries();
  
  $('#countrySelect').on('change', function () {
    const isoCode = $(this).val();
    if (isoCode) {
      fetchCountryData(isoCode);
    }
  });
});

// Open sidebar
function openSidebar() {
  document.getElementById("infoSidebar").style.left = "0";
}

// Close sidebar
function closeSidebar() {
  document.getElementById("infoSidebar").style.left = "-100%";

}

// Event listener for close button
document.getElementById("closeSidebar").addEventListener("click", closeSidebar);



function initMap() {
  map = L.map('map').setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // --- Weather Overlay Layer ---
  weatherLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=??`, {
    attribution: 'Weather data © OpenWeatherMap',
    opacity: 0.5
  });

  // --- Toggle Weather Button ---
  L.easyButton('fa-cloud', function(btn, map) {
    if (map.hasLayer(weatherLayer)) {
      map.removeLayer(weatherLayer);
    } else {
      map.addLayer(weatherLayer);
    }
  }, 'Toggle Weather Overlay').addTo(map);

  // --- Reset View Button ---
  L.easyButton('fa-globe', function(btn, map){
    map.setView([20, 0], 2);
  }, 'Reset View').addTo(map);

  // --- Load Earthquake Data ---
  addEarthquakeLayer();

  // --- Extra Marker Example ---
  const customIcon = L.ExtraMarkers.icon({
    icon: 'fa-star',
    markerColor: 'green-light',
    shape: 'circle',
    prefix: 'fa'
  });

  const customMarker = L.marker([20, 0], { icon: customIcon })
    .bindPopup('Custom Extra Marker')
    .addTo(map);

  // --- Show sidebar on map click ---
  map.on('click', function () {
    openSidebar();
  });
}

// 
function addEarthquakeLayer() {
  $.getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson', function(data) {
    earthquakeLayer = L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: feature.properties.mag * 1.5,
          fillColor: "red",
          color: "#600",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.7
        }).bindPopup(`<strong>${feature.properties.place}</strong><br>Magnitude: ${feature.properties.mag}`);
      }
    }).addTo(map);
  });
}


// Get user location
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;

        // marker cluster group
        const markerCluster = L.markerClusterGroup();

        // user marker
        const userMarker = L.marker([latitude, longitude])
          .bindPopup('Click for more info')
          .on('click', openSidebar);

        // marker added to the cluster group and map
        markerCluster.addLayer(userMarker);
        map.addLayer(markerCluster);


        map.setView([latitude, longitude], 6);

        // Get country information based on user location
        $.get(`php/getCountryInfo.php?lat=${latitude}&lng=${longitude}`, function(data) {
          try {
            const info = typeof data === 'string' ? JSON.parse(data) : data;
            if (info && info.results && info.results.length > 0) {
              const components = info.results[0].components;
              const countryCode = components.country_code ? components.country_code.toUpperCase() : null;
              if (countryCode) {
                $('#countrySelect').val(countryCode).trigger('change');
              }
            } else {
              console.warn("Could not determine country from location");
            }
          } catch (error) {
            console.error("Error processing location data:", error);
          }
        });
      },
      error => {
        console.warn("Geolocation error:", error);
      }
    );
  }
}

//Get Countries
function populateCountries() {
  $.getJSON('data/countryBorders.geo.json', function(data) {
    try {
      
      $('#countrySelect').append('<option value="">Select a country</option>');
      
      // Sort countries alphabetically
      const countries = data.features
        .filter(country => country.properties && country.properties.name && country.properties.iso_a2)
        .sort((a, b) => a.properties.name.localeCompare(b.properties.name));
      
      countries.forEach(country => {
        const iso = country.properties.iso_a2;
        const name = country.properties.name;
        $('#countrySelect').append(`<option value="${iso}">${name}</option>`);
      });
    } catch (error) {
      console.error("Error loading country list:", error);
      alert("Failed to load country list.");
    }
  });
}


function fetchCountryData(isoCode) {

  // Show loading indicator
  $('#countryName').text('Loading...');
  
  // Fetch and render country borders
  $.get(`php/getBorders.php?code=${isoCode}`, function(geoJsonData) {
    try {
      // Check if the data is already an object or needs parsing
      const geoJson = typeof geoJsonData === 'string' ? JSON.parse(geoJsonData) : geoJsonData;
      
      // Check if  GeoJSON feature is valid
      if (!geoJson || !geoJson.type || !geoJson.geometry) {
        if (geoJson.error) {
          console.error("Error from server:", geoJson.error);
        } else {
          console.error("Invalid GeoJSON format received");
        }
        throw new Error("Invalid GeoJSON data");
      }
      
      // Remove previous geoJSON layer if it exists
      if (currentGeoJsonLayer) {
        map.removeLayer(currentGeoJsonLayer);
      }
      
      // Create new GeoJSON layer
      currentGeoJsonLayer = L.geoJSON(geoJson);
      currentGeoJsonLayer.addTo(map);
      
      // Fit the map to country bounds
      try {
        map.fitBounds(currentGeoJsonLayer.getBounds());
      } catch (e) {
        console.warn("Could not fit bounds:", e);
        // Fall back 
        map.setView([20, 0], 2);
      }
    } catch (error) {
      console.error("Error processing GeoJSON data:", error);
    }
  }).fail(function(xhr, status, error) {
    console.error("Failed to load country borders:", status, error);
  });

  // Fetch country info and populate sidebar
  $.get(`php/getCountryInfo.php?code=${isoCode}`, function(data) {
    try {
      // Check if the data is already an object or needs parsing
      const info = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (info.error) {
        console.error("Error from server:", info.error);
        alert("Failed to load country data: " + info.error);
        return;
      }

      // Populate the sidebar with country information
      $('#countryName').text(info.name);
      $('#capital').text(info.capital || 'N/A');
      $('#population').text(info.population ? info.population.toLocaleString() : 'N/A');
      $('#currency').text(info.currency !== 'N/A' ? `${info.currency} (${info.exchangeRate})` : 'N/A');
      $('#weather').text(info.weather || 'N/A');
      
      //Wikipedia link
      if (info.wikipedia && info.wikipedia.link && info.wikipedia.link !== '#') {
        $('#wikiLink').attr('href', info.wikipedia.link).text('View Article');
      } else {
        $('#wikiLink').attr('href', '#').text('Not available');
      }
      
      // Display earthquakes
      if (info.earthquakes && info.earthquakes.length > 0) {
        $('#earthquakes').html('<ul>' + info.earthquakes.map(e => `<li>${e}</li>`).join('') + '</ul>');
      } else {
        $('#earthquakes').text('No recent significant earthquakes.');
      }


 
    } catch (error) {
      console.error("Error processing country data:", error);
      alert("Failed to load country data.");
    }
  }).fail(function() {
    alert("Failed to connect to the server. Please try again later.");
  });
}