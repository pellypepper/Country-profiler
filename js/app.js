


let map, currentGeoJsonLayer = null, currentCurrency = null, currentExchangeRate = 1;
let airportCluster, cityCluster, earthquakeLayer;
let overlayLayers = {};

$(document).ready(() => {
  initMap();
  getUserLocation();
  populateCountries();
  populateCurrencyDropdown();

  $('#countrySelect').on('change', () => {
    const isoCode = $('#countrySelect').val();
    if (isoCode) {
      fetchCountryData(isoCode);
      loadCountryPoints(isoCode);
    }
  });

  $('#convertCurrency').on('click', handleCurrencyConversion);
  $('#closeSidebar').on('click', closeSidebar);
});

function initMap() {
  map = L.map('map').setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const weatherLayer = L.tileLayer('https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=5014e6b3bf193188d57264af05782338', {
    attribution: 'Weather data © OpenWeatherMap',
    opacity: 0.5
  });

  L.easyButton('fa-cloud', () => toggleLayer(weatherLayer), 'Toggle Weather Overlay').addTo(map);
  L.easyButton('fa-globe', () => map.setView([20, 0], 2), 'Reset View').addTo(map);
  L.easyButton('fa-wikipedia-w', () => showSidebarSection('sidebar-wikipedia'), 'Wikipedia Article').addTo(map);
  L.easyButton('fa-money-bill-wave', () => showSidebarSection('sidebar-currency'), 'Currency Converter').addTo(map);
  L.easyButton('fa-cloud-sun', () => showSidebarSection('sidebar-weather'), '3-Day Forecast').addTo(map);
  L.easyButton('fa-newspaper', () => showSidebarSection('sidebar-news'), 'Latest News').addTo(map);
  L.easyButton('fa-home', () => {
    map.setView([20, 0], 2);
    showSidebarSection('sidebar-home');
  }, 'General Info').addTo(map);

  L.marker([20, 0], {
    icon: L.ExtraMarkers.icon({
      icon: 'fa-star',
      markerColor: 'green-light',
      shape: 'circle',
      prefix: 'fa'
    })
  }).bindPopup('Custom Extra Marker').addTo(map);

  airportCluster = L.markerClusterGroup();
  cityCluster = L.markerClusterGroup();
  earthquakeLayer = L.layerGroup(); 

  // Add overlayLayers
  overlayLayers = {
    "Airports": airportCluster,
    "Cities": cityCluster,
    "Earthquakes": earthquakeLayer 
  };

  // Add control panel
  L.control.layers(null, overlayLayers, { collapsed: false, position: 'topright' }).addTo(map);

  // add all
  map.addLayer(airportCluster);
  map.addLayer(cityCluster);

  // event listener for Earthquakes overlay
  map.on('overlayadd', function(e) {
    if (e.name === "Earthquakes") {
      loadEarthquakeLayer();
    }
  });
  map.on('overlayremove', function(e) {
    if (e.name === "Earthquakes") {
      earthquakeLayer.clearLayers();
    }
  });
}

// function to load earthquake data
function loadEarthquakeLayer() {
  earthquakeLayer.clearLayers();
  $.getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson')
    .done(data => {
      L.geoJSON(data, {
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
          radius: feature.properties.mag * 1.5,
          fillColor: "red",
          color: "#600",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.7
        }).bindPopup(`<strong>${feature.properties.place}</strong><br>Magnitude: ${feature.properties.mag}`)
      }).addTo(earthquakeLayer);
    })
    .fail(() => console.error("Failed to load earthquake data."));
}

// function to toggle layers
function toggleLayer(layer) {
  if (map.hasLayer(layer)) {
    map.removeLayer(layer);
  } else {
    map.addLayer(layer);
  }
}

// function to get user location
function getUserLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const { latitude, longitude } = coords;
      const userMarker = L.marker([latitude, longitude])
        .bindPopup('You are here. Click for more info.')
        .on('click', openSidebar)
        .addTo(map);

      map.setView([latitude, longitude], 6);

      $.get(`php/getCountryInfo.php?lat=${latitude}&lng=${longitude}`)
        .done(data => {
          const info = parseJSON(data);
          const countryCode = info?.results?.[0]?.components?.country_code?.toUpperCase();
          if (countryCode) {
            $('#countrySelect').val(countryCode).trigger('change');
          }
        })
        .fail(() => console.warn("Failed to fetch country info for user location."));
    },
    error => console.warn("Geolocation error:", error)
  );
}

// function to populate country dropdown
function populateCountries() {
  $.getJSON('data/countryBorders.geo.json')
    .done(data => {
      const $select = $('#countrySelect');
      $select.empty().append('<option value="">Select a country</option>');

      data.features
        .filter(c => c.properties?.name && c.properties?.iso_a2)
        .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
        .forEach(c => {
          $select.append(`<option value="${c.properties.iso_a2}">${c.properties.name}</option>`);
        });
    })
    .fail(() => alert("Failed to load country list."));
}

// function to populate currency dropdown
function populateCurrencyDropdown() {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR'];
  const $target = $('#targetCurrency');
  $target.empty().append('<option value="">Select target currency</option>');
  currencies.forEach(c => $target.append(`<option value="${c}">${c}</option>`));
}

// function to fetch country data
function fetchCountryData(isoCode) {
  clearCountrySidebar();
  loadCountryBorders(isoCode);
  loadCountryInfo(isoCode);
}

// function to clear country sidebar
function clearCountrySidebar() {
  $('#countryName').text('Loading...');
  $('#capital, #population, #currency, #languages').text('');
  $('#flag, #coatOfArms').empty();
  $('#weatherForecast').html('<li>Loading weather forecast...</li>');
  $('#news').html('<p>Loading news...</p>');
  $('#sidebar-wikipedia').html('<h3>Wikipedia</h3><p>Loading...</p>');
  $('#earthquakes').text('');
}

// function to load country borders
function loadCountryBorders(isoCode) {
  $.get(`php/getBorders.php?code=${isoCode}`)
    .done(raw => {
      const geoJson = parseJSON(raw);
      if (geoJson?.type && geoJson.geometry) {
        if (currentGeoJsonLayer) map.removeLayer(currentGeoJsonLayer);
        currentGeoJsonLayer = L.geoJSON(geoJson).addTo(map);
        try {
          map.fitBounds(currentGeoJsonLayer.getBounds());
        } catch {
          map.setView([20, 0], 2);
        }
      } else {
        console.error("Invalid borders GeoJSON");
      }
    })
    .fail((_, status, err) => console.error("Border fetch error:", status, err));
}

// function to load country info
function loadCountryInfo(isoCode) {
  $.get(`php/getCountryInfo.php?code=${isoCode}`)
    .done(raw => {
      const info = parseJSON(raw);
      if (!info || info.error) {
        alert("Failed to load country data: " + (info?.error||"Unknown error"));
        return;
      }
      renderBasicInfo(info);
      loadWikipedia(info.name);
      loadWeather(info.capital);
      renderEarthquakes(info.earthquakes);
      loadNews(info.name);
    })
    .fail(() => alert("Failed to fetch country info."));
}


// function to render basic info
function renderBasicInfo(info) {
  $('#countryName').text(info.name || 'N/A');
  $('#capital').text(info.capital || 'N/A');
  $('#population').text(info.population?.toLocaleString() || 'N/A');
  const cur = info.currency, rate = info.exchangeRate;
  $('#currency').text(cur ? `${cur} (${rate})` : 'N/A');
  $('#languages').text(info.geoNames?.languages || 'N/A');
  $('#flag').html(info.flag? `<img src="${info.flag}" width="40"/>`:'');
  $('#coatOfArms').html(info.coatOfArms? `<img src="${info.coatOfArms}" width="40"/>`:'');
  currentCurrency = info.currency; currentExchangeRate = info.exchangeRate;
  $('#currencyName').text(currentCurrency? `${currentCurrency} (${currentExchangeRate})`:'Not available');
}

// function to load Wikipedia articles
function loadWikipedia(countryName) {
  $.getJSON(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(countryName)}&format=json&origin=*`)
    .done(wikiData => {
      const list = wikiData.query?.search?.slice(0,3).map(a =>
        `<li><a href="https://en.wikipedia.org/wiki/${encodeURIComponent(a.title)}" target="_blank">${a.title}</a><br><small>${a.snippet}…</small></li>`
      ).join('');
      $('#sidebar-wikipedia').html(list
        ? `<h3>Wikipedia: ${countryName}</h3><ul>${list}</ul>`
        : `<p>No Wikipedia articles found.</p>`);
    })
    .fail(() => $('#sidebar-wikipedia').html('<p>Failed to load Wikipedia data.</p>'));
}

// function to load weather forecast
function loadWeather(capital) {
  if (!capital) {
    $('#weatherForecast').html('<li>Capital not available.</li>');
    return;
  }
  $.getJSON(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(capital)}&appid=5014e6b3bf193188d57264af05782338&units=metric`)
    .done(wd => {
      const daily = wd.list.filter(i => i.dt_txt.includes("12:00:00")).slice(0,4);
      $('#weatherForecast').html(daily.length
        ? daily.map(d => `<li><strong>${new Date(d.dt_txt).toDateString()}:</strong> ${d.weather[0].description}, ${d.main.temp}°C</li>`).join('')
        : '<li>No forecast available.</li>'
      );
    })
    .fail(() => $('#weatherForecast').html('<li>Failed to fetch weather.</li>'));
}

//  function to render earthquakes
function renderEarthquakes(eqList) {
  $('#earthquakes').html(eqList?.length
    ? `<ul>${eqList.map(e=>`<li>${e}</li>`).join('')}</ul>`
    : 'No recent significant earthquakes.');
}

// function to load news articles
function loadNews(countryName) {
  const apiKey = 'f0e3dc997f2b8f840a79a4c1634a6cee';
  const from = new Date(Date.now() - 2*24*60*60*1000).toISOString().split('T')[0];
  const url = `https://gnews.io/api/v4/search?token=${apiKey}&q=${encodeURIComponent(countryName)}&lang=en&max=5&from=${from}`;

  $.getJSON(url)
    .done(newsData => {
      const list = newsData.articles?.map(a =>
        `<li><a href="${a.url}" target="_blank">${a.title}</a><br><small>${a.source.name} – ${new Date(a.publishedAt).toLocaleDateString()}</small></li>`
      ).join('');
      $('#news').html(list ? `<ul>${list}</ul>` : `<p>No news in last 2 days.</p>`);
    })
    .fail(() => $('#news').html('<p>Unable to load news.</p>'));
}


// handle supported frankfurter currency conversion
const supportedCurrencies = [
  "AUD","BGN","BRL","CAD","CHF","CNY","CZK","DKK","EUR","GBP","HKD",
  "HRK","HUF","IDR","ILS","INR","ISK","JPY","KRW","MXN","MYR","NOK",
  "NZD","PHP","PLN","RON","RUB","SEK","SGD","THB","TRY","USD","ZAR"
];

// function to handle currency conversion
function handleCurrencyConversion() {
  const amount = parseFloat($('#amount').val());
  const from = currentCurrency;
  const to = $('#targetCurrency').val();

  if (!amount || amount <= 0) {
    alert("Enter a valid amount.");
    return;
  }
  if (!from || !to || from === 'N/A' || to === 'N/A') {
    $('#convertedAmount').text('Currency information unavailable.');
    return;
  }
  if (from === to) {
    $('#convertedAmount').text(`${amount.toFixed(2)} ${to}`);
    return;
  }
  if (!supportedCurrencies.includes(from) || !supportedCurrencies.includes(to)) {
    $('#convertedAmount').text('Currency not supported.');
    return;
  }

  $('#convertedAmount').text('Converting...');

  const url = `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`;
  $.getJSON(url)
    .done(data => {
      if (data && data.rates && data.rates[to]) {
        $('#convertedAmount').text(`${data.rates[to].toFixed(2)} ${to}`);
      } else {
        $('#convertedAmount').text('Conversion failed.');
      }
    })
    .fail(() => $('#convertedAmount').text('Error fetching conversion rate.'));
}

// function to show sidebar section
function showSidebarSection(sectionId) {
  if (!$(`#${sectionId}`).length) return;
  openSidebar();
  $('.sidebar-section').hide();
  $(`#${sectionId}`).show();
}

// function to open sidebar
function openSidebar() {
  $('#infoSidebar').css('left', '0');
}

// function to close sidebar
function closeSidebar() {
  $('#infoSidebar').css('left', '-100%');
}

// function to parse JSON safely
function parseJSON(data) {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (err) {
    console.error("JSON parse error:", err);
    return null;
  }
}

// function to load country points (airports and cities)
function loadCountryPoints(isoCode) {
  airportCluster.clearLayers();
  cityCluster.clearLayers();

  const airportIcon = L.ExtraMarkers.icon({
    icon: 'fa-plane',
    markerColor: 'blue',
    shape: 'square',
    prefix: 'fa'
  });
  const cityIcon = L.ExtraMarkers.icon({
    icon: 'fa-city',
    markerColor: 'green',
    shape: 'circle',
    prefix: 'fa'
  });

  function polygonCentroid(coords) {
    // Assumes coords is [ [ [lng, lat], ... ] ] (1-ring Polygon)
    let area = 0, x = 0, y = 0;
    const points = coords[0];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [x0, y0] = points[j];
      const [x1, y1] = points[i];
      const f = x0 * y1 - x1 * y0;
      area += f;
      x += (x0 + x1) * f;
      y += (y0 + y1) * f;
    }
    area *= 0.5;
    if (area === 0) return points[0]; // fallback
    x /= (6 * area);
    y /= (6 * area);
    return [x, y];
  }

  function addFeatures(url, clusterGroup, icon, popupTitle) {
    $.getJSON(url)
      .done(data => {
        data.features.forEach((f, idx) => {
          let coords = null, name = '', show = false;

          if (popupTitle === "Airport") {
            if (
              f.properties &&
              typeof f.properties.latitude_deg === 'number' &&
              typeof f.properties.longitude_deg === 'number'
            ) {
              coords = [f.properties.longitude_deg, f.properties.latitude_deg];
              name = f.properties?.name || 'Unnamed Airport';
              show = f.properties?.iso_country === isoCode;
            }
          } else if (popupTitle === "City") {
            if (f.geometry && f.geometry.type === "Polygon" && Array.isArray(f.geometry.coordinates)) {
              coords = polygonCentroid(f.geometry.coordinates);
              name = f.properties?.NAME || 'Unnamed City';
              show = true;
            }
          }

          if (show && Array.isArray(coords) && coords.length === 2) {
            const marker = L.marker([coords[1], coords[0]], { icon })
              .bindPopup(`<strong>${popupTitle}:</strong> ${name}`);
            clusterGroup.addLayer(marker);
          }
        });
      });
  }

  addFeatures('data/airports.geojson', airportCluster, airportIcon, 'Airport');
  addFeatures('data/map1.geojson', cityCluster, cityIcon, 'City');
}