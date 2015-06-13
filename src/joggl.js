var joggl = this.joggl || {};
(function (ns) {

  function initData(data) {
      var totalKm = Number(data[0]['jogging'].replace(/,/g,'.'));
      distancemap = ns.distancemap;
      var found;
      var i = 0;
      for (var key in distancemap) {
        i = i + 1;
        found = key;
        if (key> totalKm*1000) {
          break;
        }
      }
      showPlace(distancemap[found]);
      showLines(found, distancemap);
      showMarker(found, distancemap);
  }

  function showPlace(found) {
    var url = 'http://nominatim.openstreetmap.org/reverse?zoom=18&addressdetails=1&format=json&lat=';
    
    var url = url + found[1] + '&lon=' + found[0];

    mapboxgl.util.getJSON(url, function (err, result) {
            if (err) throw err;
            var place = result['address']
            var displayName = '';
            if (place['village']) {
              displayName += place['village'] + ' i ';
            } else if (place['hamlet']) {
              displayName += place['hamlet'] + ' i ';
            }
            displayName += place['county'] + ' kommune, ' + place['state'];
            document.getElementById('place').innerHTML = displayName;
    });
  }

  //split the line at the found point and draw in different styles
  function showLines(found, distancemap) {
      var coordinates = getCoordinates(ns.geojson1)
      for (var i = 0; i < coordinates.length; i++){
        if (coordinates[i][0] === distancemap[found][0]) {
          break;
        }
      }
      i = i + 1;
      coordinates.splice(i, coordinates.length-i);
      var coordinates2 = getCoordinates(ns.geojson2);
      coordinates2.splice(0, i-1);

      var sourceObj2 = new mapboxgl.GeoJSONSource({
        data: ns.geojson2
      });

      var sourceObj = new mapboxgl.GeoJSONSource({
        data: ns.geojson1
      });
      ns.map.addSource('myroute', sourceObj); 
      ns.map.addSource('myroute2', sourceObj2); 

      ns.map.addLayer({
        "id": "route-remaining",
        "type": "line",
        "source": "myroute",
        "layout": {
          "line-join": "round",
          "line-cap": "round"
        },
        "paint": {
          "line-color": "#000000",
          "line-width": 2,
          "line-opacity": 0.2
        }
      },"place_label_city");

      ns.map.addLayer({
        "id": "route-run",
        "type": "line",
        "source": "myroute2",
        "layout": {
          "line-join": "round",
          "line-cap": "round"
        },
        "paint": {
          "line-color": "#ff6400",
          "line-width": 3
        }
      },"place_label_city");
  }

  function showMarker(key, distancemap) {
      ns.map.addSource("markers", {
        "type": "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": [{
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": distancemap[key] 
            },
            "properties": {
              "title": '' + Math.round(key/1000) + ' km',
              "marker-symbol": "school-24",
              "text-size": 16
            }
          }, {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [25.781588, 71.167982]
            },
            "properties": {
              "title": "Nordkapp 2540 km",
              "marker-symbol": "circle-stroked-18",
              "text-size": 12
            }
          }, {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [ 7.109169, 58.018015]
            },
            "properties": {
              "title": "Lindesnes 0 km",
              "marker-symbol": "triangle-stroked-18",
              "text-size": 8
            }
          }]
        }
      });

      ns.map.addLayer({
        "id": "markers",
        "type": "symbol",
        "source": "markers",
        "layout": {
          "icon-image": "{marker-symbol}",
          "text-field": "{title}",
          "text-font": "Open Sans Semibold, Arial Unicode MS Bold",
          "text-offset": [0, 0.8],
          "text-anchor": "top"
        },
        "paint": {
          "text-size": 12,
          "text-halo-width": 2,
          "text-halo-color": "#eee"
        }
      },13);

  }

  function calculateDistance(a, b) {
    var sum = 0;
    var n;
    for (n=0; n < a.length; n++) {
      sum += Math.pow(a[n]-b[n], 2);
    }
    return Math.sqrt(sum);
  }

  function calculateDistances(geojson) {
    var coordinates = getCoordinates(geojson);
    var count = 0;
    distances = {};
    var max = coordinates.length -1;
    var lastcoord;
    var lastdistance = 0;
    for(var i = max; i>=0 ; i--) {
      count++;
      utmcoord = proj4('EPSG:32633', coordinates[i]);

      if (i == max) {
        distances[0] = coordinates[i];
      } else {
        distance = calculateDistance(lastcoord,utmcoord);
        var cummulativeSum;
        if (isNaN(lastdistance)) {
          cummulativeSum = distance;
        } else {
          cummulativeSum = lastdistance + distance;
        }
        distances[''+(cummulativeSum)] = coordinates[i];
      }
      lastcoord = utmcoord;
      lastdistance = cummulativeSum;
    }
    return distances;
  }

  function getCoordinates(featureCollection) {
    return featureCollection['features'][0]['geometry']['coordinates'];
  }

  ns.setup = function() {
    proj4.defs("EPSG:32633","+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs");

    mapboxgl.accessToken = 'pk.eyJ1IjoiYmFrayIsImEiOiJucGluZjdFIn0.yRHgsbqP2PuZ7iMXR56Ekw';
    var map = new mapboxgl.Map({
      container: 'map', // container id
      style: 'lib/basic-v7.json', //stylesheet location
      center: [68, 10], // starting position
      zoom:4 // starting zoom
    });
    map.fitBounds([ [56.5, 4], [72, 31.5] ]);

    ns.map = map;

    map.on('style.load', function() {
          mapboxgl.util.getJSON('data/route.geojson', function (err, geojson) {
            if (err) throw err;
            ns.geojson1 = geojson;
            ns.geojson2 = JSON.parse(JSON.stringify(geojson));
            distances = calculateDistances(geojson);
            ns.distancemap = distances;
            Tabletop.init( { key: '0AtfTjSZCvAfkdHRSQ0JRNHFHZFVIQXBEVXBMamwteWc',
                     callback: function(data, tabletop) { initData(data) },
                     simpleSheet: true } )
        });
      }); 
  }

} (joggl));