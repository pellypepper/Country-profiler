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



  // Trigger conversion 
  $('#amount').on('keyup change', handleCurrencyConversion);


  $('#targetCurrency').on('change', handleCurrencyConversion);
 

  // Modal nav buttons
  $('.modal-nav button').on('click', function() {
    $('.modal-nav button').removeClass('active');
    $(this).addClass('active');
    showModalSection($(this).data('section'));
  });

  $('#closeModal').on('click', hideModal);
  $('#infoModal').on('click', function(e) {
    if (e.target === this) hideModal();
  });
});


function showModalSection(sectionId) {
  $('.modal-section').hide();
  $('#' + sectionId).show();
}

// display modal
function showModal() {
  $('#infoModal').css('display', 'flex');
}

// hide modal
function hideModal() {
  $('#infoModal').css('display', 'none');
}



function initMap() {
  map = L.map('map').setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  
  $.ajax({
    url: 'php/getWeatherLayer.php',
    type: 'GET',
    dataType: 'json',
    timeout: 10000,
    success: function(data) {
      if (data && data.tileUrl) {
        const weatherLayer = L.tileLayer(data.tileUrl, {
          attribution: data.attribution || 'Weather data © OpenWeatherMap',
          opacity: data.opacity || 0.5,
          maxZoom: data.maxZoom || 18,
      
          errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        });
        
        weatherLayer.on('tileerror', function(e) {
          console.warn('Weather tile failed to load:', e.tile.src);
        });
        
        weatherLayer.addTo(map);

      }
    },
    error: function(xhr, status, error) {
      console.error('Failed to load weather layer configuration:', status, error);
    }
  });


  L.easyButton('fa-globe', () => map.setView([20, 0], 2), 'Reset View').addTo(map);
  L.easyButton('fa-wikipedia-w', () => { showModalSection('modal-wikipedia'); showModal(); }, 'Wikipedia Article').addTo(map);
  L.easyButton('fa-money-bill-wave', () => { showModalSection('modal-currency'); showModal(); }, 'Currency Converter').addTo(map);
  L.easyButton('fa-cloud-sun', () => { showModalSection('modal-weather'); showModal(); }, '3-Day Forecast').addTo(map);
  L.easyButton('fa-newspaper', () => { showModalSection('modal-news'); showModal(); }, 'Latest News').addTo(map);
  L.easyButton('fa-home', () => {
    map.setView([20, 0], 2); 
    showModalSection('modal-home'); 
    showModal();
  }, 'General Info').addTo(map);

  // Initialize cluster groups
  airportCluster = L.markerClusterGroup();
  cityCluster = L.markerClusterGroup();
  hospitalCluster = L.markerClusterGroup(); 

  overlayLayers = {
    "Airports": airportCluster,
    "Cities": cityCluster,
    "Hospital": hospitalCluster
  };

  L.control.layers(null, overlayLayers, { collapsed: false, position: 'topright' }).addTo(map);

  // Add layers to map
  map.addLayer(airportCluster);
  map.addLayer(cityCluster);
  map.addLayer(hospitalCluster);
}


function getUserLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const { latitude, longitude } = coords;
      const userMarker = L.marker([latitude, longitude])
        .bindPopup('You are here. Click for more info.')
        .on('click', () => { showModalSection('modal-home'); showModal(); })
        .addTo(map);

      map.setView([latitude, longitude], 6);

      $.get('php/getCountryInfo.php?lat=' + latitude + '&lng=' + longitude)
        .done(data => {
          const info = parseJSON(data);
          const countryCode = info?.results?.[0]?.components?.country_code?.toUpperCase();
          if (countryCode) {
            $('#countrySelect').val(countryCode).trigger('change');
          }
        });
    },
    error => console.warn("Geolocation error:", error)
  );
}

function populateCountries() {
  $.getJSON('php/getCountries.php')
    .done(data => {
      const $select = $('#countrySelect');
      $select.empty().append('<option value="">Select a country</option>');
      data
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(c => {
          $select.append(`<option value="${c.iso_a2}">${c.name}</option>`);
        });
    });
}

function populateCurrencyDropdown() {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR'];
  const $target = $('#targetCurrency');
  $target.empty().append('<option value="">Select target currency</option>');
  currencies.forEach(c => $target.append(`<option value="${c}">${c}</option>`));

  //  trigger conversion on currency change
  $target.on('change', handleCurrencyConversion);
}

function fetchCountryData(isoCode) {
  clearCountryModal();
  loadCountryBorders(isoCode);
  loadCountryInfo(isoCode);
}

function clearCountryModal() {
  $('#countryName').text('Loading...');
  $('#capital, #population, #currency, #languages').text('');
  $('#flag, #coatOfArms').empty();
  $('#weatherForecast').html('<li>Loading weather forecast...</li>');
  $('#news').html('<p>Loading news...</p>');
  $('#sidebar-wikipedia').html('<h3>Wikipedia</h3><p>Loading...</p>');
  $('#earthquakes').text('');
}

function loadCountryBorders(isoCode) {
  $.get('php/getBorders.php?code=' + isoCode)
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
      }
    });
}

function loadCountryInfo(isoCode) {
  $.get('php/getCountryInfo.php?code=' + isoCode)
    .done(raw => {
      const info = parseJSON(raw);
      if (!info || info.error) {
        alert("Failed to load country data: " + (info?.error||"Unknown error"));
        return;
      }
      renderBasicInfo(info);
      renderWikipedia(info.wikipedia);
      renderWeather(info.weatherForecast, info.capital);
      renderEarthquakes(info.earthquakes);
      renderNews(info.news);
    });
}

function renderBasicInfo(info) {
  $('#countryName').text(info.name || 'N/A');
  $('#capital').text(info.capital || 'N/A');
  $('#population').text(info.population?.toLocaleString() || 'N/A');
  const cur = info.currency, rate = info.exchangeRate;
  $('#currency').text(cur ? `${cur} (${rate})` : 'N/A');
  $('#languages').text(info.languages || 'N/A');
  $('#flag').html(info.flag? `<img src="${info.flag}" width="40"/>`:'');
  $('#coatOfArms').html(info.coatOfArms? `<img src="${info.coatOfArms}" width="40"/>`:'');
  currentCurrency = info.currency; currentExchangeRate = info.exchangeRate;
  $('#currencyName').text(currentCurrency? `${currentCurrency} (${currentExchangeRate})`:'Not available');
}

function renderWikipedia(wiki) {
  if (wiki && wiki.results) {
    const list = wiki.results.map(a =>
      `<li><a href="https://en.wikipedia.org/wiki/${encodeURIComponent(a.title)}" target="_blank">${a.title}</a><br><small>${a.snippet}…</small></li>`
    ).join('');
    $('#sidebar-wikipedia').html(list
      ? `<h3>Wikipedia Results</h3><ul>${list}</ul><p><a href="${wiki.link}" target="_blank">Summary</a>: ${wiki.summary}</p>`
      : `<p>No Wikipedia articles found.</p>`);
  }
}

function renderWeather(weather, capital) {
  if (Array.isArray(weather) && weather.length) {
    let html = `<li style="font-weight:600;font-size:1.1em;">Forecast for <span style="color:#277">${capital}</span></li>`;
    html += weather.map(d =>
      `<li>
        <img src="https://openweathermap.org/img/wn/${d.icon}@2x.png" alt="${d.desc}" style="vertical-align:middle;width:42px;height:42px;">
        <strong>${(new Date(d.date)).toDateString()}:</strong> ${d.desc}, ${d.temp}°C
      </li>`
    ).join('');
    $('#weatherForecast').html(html);
  } else {
    $('#weatherForecast').html('<li>No forecast available.</li>');
  }
}

function renderEarthquakes(eqList) {
  $('#earthquakes').html(eqList?.length
    ? `<ul>${eqList.map(e=>`<li>${e}</li>`).join('')}</ul>`
    : 'No recent significant earthquakes.');
}

function renderNews(newsList) {
  if (Array.isArray(newsList) && newsList.length) {
    $('#news').html(`<ul>${
      newsList.map(a =>
        `<li>
          ${a.image ? `<img src="${a.image}" alt="news" style="width:60px;height:60px;object-fit:cover;margin-right:8px;vertical-align:middle;">` : ''}
          <a href="${a.url}" target="_blank">${a.title}</a><br>
          <small>${a.source} – ${new Date(a.publishedAt).toLocaleDateString()}</small>
        </li>`
      ).join('')
    }</ul>`);
  } else {
    $('#news').html('<p>No news in last 2 days.</p>');
  }
}

const supportedCurrencies = [
  "AUD","BGN","BRL","CAD","CHF","CNY","CZK","DKK","EUR","GBP","HKD",
  "HRK","HUF","IDR","ILS","INR","ISK","JPY","KRW","MXN","MYR","NOK",
  "NZD","PHP","PLN","RON","RUB","SEK","SGD","THB","TRY","USD","ZAR"
];

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

  $.getJSON('php/convertCurrency.php?amount=' + amount + '&from=' + from + '&to=' + to)
    .done(data => {
      if (data && data.converted) {
        $('#convertedAmount').text(`${data.converted} ${to}`);
      } else {
        $('#convertedAmount').text('Conversion failed.');
      }
    })
    .fail(() => $('#convertedAmount').text('Error fetching conversion rate.'));
}

function parseJSON(data) {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (err) {
    console.error("JSON parse error:", err);
    return null;
  }
}

function loadCountryPoints(isoCode) {
  airportCluster.clearLayers();
  cityCluster.clearLayers();
    hospitalCluster.clearLayers();

  // Custom icon colors 
  const airportIcon = L.ExtraMarkers.icon({
    icon: 'fa-plane',
    markerColor: 'blue-dark', 
    shape: 'square',
    prefix: 'fa',
      iconColor: '#ff4500'

  });
  const cityIcon = L.ExtraMarkers.icon({
    icon: 'fa-city',
    markerColor: 'green-light', 
    shape: 'circle',
    prefix: 'fa',
    iconColor: '#008000'
  });
  const hospitalIcon = L.ExtraMarkers.icon({
    icon: 'fa-hospital',
    markerColor: 'red', 
    shape: 'penta',
    prefix: 'fa',
        iconColor: '#8a2be2'
 
  });

  
  function loadGeoNamesMarkers(q, clusterGroup, icon, popupTitle) {
    $.getJSON('php/getGeoNames.php', {
      q: q,
      country: isoCode
    })
    .done(data => {
      if (data && data.geonames && Array.isArray(data.geonames)) {
        data.geonames.forEach(item => {
          if (item.lat && item.lng) {
            let markerLabel = item.name;
            if (item.fcodeName) {
              markerLabel += " <br><small>" + item.fcodeName + "</small>";
            }
            const marker = L.marker([parseFloat(item.lat), parseFloat(item.lng)], { icon })
              .bindPopup(`<strong>${popupTitle}:</strong> ${markerLabel}`);
            clusterGroup.addLayer(marker);
          }
        });
      }
    });
  }

  // Airports (q=airport)
  loadGeoNamesMarkers("airport", airportCluster, airportIcon, "Airport");

  // Cities (q=city)
  loadGeoNamesMarkers("city", cityCluster, cityIcon, "City");

  // Hospitals (q=hospital)
  loadGeoNamesMarkers("hospital", hospitalCluster, hospitalIcon, "Hospital");

 
}

