let map, currentGeoJsonLayer = null, currentCurrency = null, currentExchangeRate = 1;
let airportCluster, cityCluster, hospitalCluster, earthquakeLayer;
let overlayLayers = {};

// tile layers
var streets = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
  attribution: "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012"
});
var satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
});
var basemaps = { Streets: streets, Satellite: satellite };

// overlays for leaflet control 
airportCluster = L.markerClusterGroup({ polygonOptions: { fillColor: "#fff", color: "#000", weight: 2, opacity: 1, fillOpacity: 0.5 }});
cityCluster = L.markerClusterGroup({ polygonOptions: { fillColor: "#fff", color: "#000", weight: 2, opacity: 1, fillOpacity: 0.5 }});
hospitalCluster = L.markerClusterGroup({ polygonOptions: { fillColor: "#fff", color: "#000", weight: 2, opacity: 1, fillOpacity: 0.5 }});


// icons
var airportIcon = L.ExtraMarkers.icon({ prefix: "fa", icon: "fa-plane", iconColor: "black", markerColor: "white", shape: "square" });
var cityIcon    = L.ExtraMarkers.icon({ prefix: "fa", icon: "fa-city", iconColor: "green", markerColor: "green", shape: "square" });
var hospitalIcon= L.ExtraMarkers.icon({ prefix: "fa", icon: "fa-hospital", iconColor: "red", markerColor: "red", shape: "penta" });
overlayLayers = {
  "Airports": airportCluster,
  "Cities": cityCluster,
  "Hospitals": hospitalCluster
};



$(document).ready(() => {
  initMap();
  populateCountries();
  populateCurrencyDropdown();

  // --- GeoIP country auto-detect ---
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos) {
      $.getJSON('php/getUserCountry.php', {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }).done(function(result) {
        if (result && result.countryCode) {
          let selectCountry = function() {
            const $countrySelect = $('#countrySelect');
            if ($countrySelect.find(`option[value="${result.countryCode}"]`).length) {
              $countrySelect.val(result.countryCode).trigger('change');
            } else {
              setTimeout(selectCountry, 100);
            }
          };
          selectCountry();
        }
      });
    });
  }

  $('#countrySelect').on('change', () => {
    const isoCode = $('#countrySelect').val();
    if (isoCode) {
      window.lastCountryInfo = null;
      $('#capitalCity,#languages,#currency').html('<span class="text-muted">Loading...</span>');
      $('#countryInfoModal').modal("show");
      $('#pre-load').removeClass("fadeOut");
      $.get('php/getCountryInfo.php?code=' + isoCode)
        .done(raw => {
          const info = parseJSON(raw);
          if (info && !info.error) {
            $('#capitalCity').html(info.capital ? info.capital : 'N/A');
            $('#languages-glance').html(info.languages ? info.languages : 'N/A');
            $('#currency-glance').html(info.currency ? info.currency : 'N/A');
            hidePreloader('#pre-load');
          } else {
            $('#capitalCity,#languages-glance,#currency-glance').html('<span class="text-danger">No data</span>');
            hidePreloader('#pre-load');
          }
        })
        .fail(() => {
          $('#capitalCity,#languages,#currency').html('<span class="text-danger">Error</span>');
          hidePreloader('#pre-load');
        });
      fetchCountryData(isoCode); 
      loadCountryPoints(isoCode);
    }
  });

  $('#countryInfoModal').on('show.bs.modal', function() {
    $('#pre-load').removeClass("fadeOut");
    const data = window.lastCountryInfo;
    if (!data) {
      $('#capitalCity,#languages-glance,#currency-glance').html('<span class="text-muted">Loading...</span>');
    } else {
      $('#capitalCity').html(data.capital ? data.capital : 'N/A');
      $('#languages-glance').html(data.languages ? data.languages : 'N/A');
      $('#currency-glance').html(data.currency ? data.currency : 'N/A');
      hidePreloader('#pre-load');
    }
  });

  $('#countryInfoModal').on('hidden.bs.modal', function () {
    $('#pre-load').removeClass("fadeOut");
    $('#countrySelect').focus();
  });
  $('#amount').on('keyup change', handleCurrencyConversion);
  $('#targetCurrency').on('change', handleCurrencyConversion);

 $('#infoModal').on('show.bs.modal', function () {
  handleCurrencyConversion();
});

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
  $('.modal-section').addClass('d-none');
  $('#' + sectionId).removeClass('d-none');
}

function showModal() {
  const $modal = $('#infoModal');
  $modal.modal('show');
}

function hideModal() {
  $('#infoModal').modal('hide');

  $('#countrySelect').focus();
}

function initMap() {
  map = L.map('map', {
    layers: [streets]
  }).setView([20, 0], 2);

  // Add base layers and overlays
  L.control.layers(basemaps, overlayLayers, { collapsed: false, position: 'topright' }).addTo(map);

  // Add default overlays
  map.addLayer(airportCluster);
  map.addLayer(cityCluster);
  map.addLayer(hospitalCluster);



  // Easy buttons
 L.easyButton('<strong style="font-size:1.2em">W</strong>', () => { 
    showModalSection('modal-wikipedia'); 
    showModal(); 
}, 'Wikipedia Article').addTo(map);
L.easyButton('fa-coins', () => { showModalSection('modal-currency'); showModal(); }, 'Currency Converter').addTo(map);
  L.easyButton('fa-cloud-sun-rain', () => { showModalSection('modal-weather'); showModal(); }, '3-Day Forecast').addTo(map);
  L.easyButton('fa-rss', () => { showModalSection('modal-news'); showModal(); }, 'Latest News').addTo(map);
  L.easyButton('fa-home', () => {
    map.setView([20, 0], 2); 
    showModalSection('modal-home'); 
    showModal();
  }, 'General Info').addTo(map);

  hidePreloader();
}

// General preloader hide utility
function hidePreloader(selector = '#preloader') {
  $(selector).fadeOut(300, function() { $(this).removeClass('fadeOut'); });
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
const currencies = [
  'ARS',
  'AUD',
  'BHD',
  'BWP',
  'BRL',
  'BND',
  'BGN',
  'CAD',
  'CLP',
  'CNY',
  'COP',
  'CZK',
  'DKK',
  'AED',
  'EUR',
  'HKD',
  'HUF',
  'ISK',
  'INR',
  'IDR',
  'IRR',
  'ILS',
  'JPY',
  'KZT',
  'KWD',
  'LYD',
  'MYR',
  'MUR',
  'MXN',
  'NPR',
  'NZD',
  'NOK',
  'OMR',
  'PKR',
  'PHP',
  'PLN',
  'QAR',
  'RON',
  'RUB',
  'SAR',
  'SGD',
  'ZAR',
  'KRW',
  'LKR',
  'SEK',
  'CHF',
  'TWD',
  'THB',
  'TTD',
  'TRY'
];

  const $target = $('#targetCurrency');
  $target.empty().append('<option value="USD">USD</option>');
  currencies.forEach(c => $target.append(`<option value="${c}">${c}</option>`));
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

// Loads the country info for the modal 
function loadCountryInfoForModal(isoCode, cb) {
  $.get('php/getCountryInfo.php?code=' + isoCode)
    .done(raw => {
      const info = parseJSON(raw);
      if (info && !info.error) {
        renderBasicInfo(info); 
      }
      if (typeof cb === "function") cb();
    })
    .fail(() => {
      window.lastCountryInfo = null;
      if (typeof cb === "function") cb();
    });
}

function loadCountryBorders(isoCode) {
  $.get('php/getBorders.php?code=' + isoCode)
    .done(raw => {
      const geoJson = parseJSON(raw);
      if (geoJson?.type && geoJson.geometry) {
        if (currentGeoJsonLayer) map.removeLayer(currentGeoJsonLayer);
        currentGeoJsonLayer = L.geoJSON(geoJson, {
          style: {
            color: "#0074D9",     
            weight: 3,       
            opacity: 0.8,          
            fillColor: "#7FDBFF",  
            fillOpacity: 0.2      
          }
        }).addTo(map);
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

    
      renderNews(info.news);
    });
}

function renderBasicInfo(info) {
  window.lastCountryInfo = info;
  $('#countryName').text(info.name || 'N/A');
  $('#capital').text(info.capital || 'N/A');
  $('#population').text(info.population?.toLocaleString() || 'N/A');
  $('#currency').text(info.currency || 'N/A');
  $('#languages').text(info.languages || 'N/A');
  $('#flag').html(info.flag ? `<img src="${info.flag}" width="40"/>` : '');
  $('#coatOfArms').html(info.coatOfArms ? `<img src="${info.coatOfArms}" width="40"/>` : '');
  currentCurrency = info.currency; currentExchangeRate = info.exchangeRate;
  $('#currencyName').text(currentCurrency ? `${currentCurrency} (${currentExchangeRate})` : 'Not available');
  hidePreloader('#pre-load');
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
    
    let html = `
      <div class="fw-bold mb-3" style="font-size:1.1em;">Forecast for <span style="color:#277">${capital}</span></div>
      <div class="d-flex flex-wrap gap-2 justify-content-center">
        ${weather.slice(0, 3).map((d, i) => {
          // Format date
          const dateObj = new Date(d.date);
          const dayMonth = i === 0
            ? "Today"
            : dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

          // Normalize icon URL
          let icon = d.icon || d.conditionIcon || "";
          if (icon && icon.startsWith("//")) icon = "https:" + icon;
          if (icon && icon.startsWith("/")) icon = "https://openweathermap.org" + icon; 

          const desc = d.desc || d.conditionText || "";
    const celsiusMin = (typeof d.minC !== "undefined") ? d.minC : (typeof d.tempMin !== "undefined" ? d.tempMin : d.temp);
const celsiusTemp = d.temp || "";

const tempMinF = (celsiusMin !== "" && !isNaN(celsiusMin)) ? (celsiusMin * 9/5) + 32 : "";
const tempF = (celsiusTemp !== "" && !isNaN(celsiusTemp)) ? (celsiusTemp * 9/5) + 32 : "";

          

          return `
            <div class="border rounded shadow-sm p-3 flex-fill min-width-0" style="min-width:180px;max-width:220px;display:flex;flex-direction:column;align-items:center;justify-content-between;">
              <div class="fw-bold text-primary fs-6 mb-1">${dayMonth}</div>
              <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" style="width:48px;height:48px;" class="mb-1"/>
              <div class="mb-1 text-center">${desc}</div>
             <div class="fw-bold fs-5 text-success mb-0">${Math.round(celsiusTemp)}&deg;C</div>

            </div>
          `;
        }).join('')}
      </div>
    `;
    $('#weatherForecast')
      .removeAttr('style')
      .html(html);
  } else {
    $('#weatherForecast').html('<li>No forecast available.</li>');
  }
}

function renderNews(newsList) {
  if (Array.isArray(newsList) && newsList.length) {
    const html = newsList.map(a => `
      <table class="table table-borderless mb-0">
        <tr>
          <td rowspan="2" width="50%">
            ${a.image ? `<img class="img-fluid rounded" src="${a.image}" alt="news" title="">` : ''}
          </td>
          <td>
            <a href="${a.url}" class="fw-bold fs-6 text-black" target="_blank">${a.title}</a>
          </td>
        </tr>
        <tr>
          <td class="align-bottom pb-0">
            <p class="fw-light fs-6 mb-1">
              ${(a.source || '')}${a.publishedAt ? " – " + new Date(a.publishedAt).toLocaleDateString() : ""}
            </p>
          </td>
        </tr>
      </table>
      <hr>
    `).join('');
    $('#news').html(html);
  } else {
    $('#news').html('<div class="text-muted">No news in last 2 days.</div>');
  }
}


function handleCurrencyConversion() {
  const amount = parseFloat($('#amount').val());
  const from = currentCurrency;
  const to = $('#targetCurrency').val();

  if (!amount || amount <= 0) {
    
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
              .bindPopup(`${item.name}`);
            clusterGroup.addLayer(marker);
          }
        });
      }
    });
  }

  // Airports
  loadGeoNamesMarkers("airport", airportCluster, airportIcon, "Airport");
  // Cities
  loadGeoNamesMarkers("city", cityCluster, cityIcon, "City");
  // Hospitals
  loadGeoNamesMarkers("hospital", hospitalCluster, hospitalIcon, "Hospital");
}

// Optional: Toast utility for errors
function showToast(message, duration, close) {
  Toastify({
    text: message,
    duration: duration,
    newWindow: true,
    close: close,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    style: {
      background: "#870101"
    }
  }).showToast();
}