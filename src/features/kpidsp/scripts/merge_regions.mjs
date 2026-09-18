import fs from 'fs';
import * as topojsonClient from 'topojson-client';

import * as topojsonServer from 'topojson-server';

const url = "https://raw.githubusercontent.com/apisit/thailand.json/master/thailand.json";

const PROVINCE_TO_REGION = {
  // Region 1
  'Chiang Mai': 1, 'Chiang Rai': 1, 'Nan': 1, 'Phayao': 1, 'Phrae': 1, 'Mae Hong Son': 1, ' Lampang': 1, 'Lampang': 1, 'Lamphun': 1,
  // Region 2
  'Tak': 2, 'Phitsanulok': 2, 'Phetchabun': 2, 'Sukhothai': 2, 'Uttaradit': 2,
  // Region 3
  'Kamphaeng Phet': 3, 'Chai Nat': 3, 'Nakhon Sawan': 3, 'Phichit': 3, 'Uthai Thani': 3,
  // Region 4
  'Nakhon Nayok': 4, 'Nonthaburi': 4, 'Pathum Thani': 4, 'Phra Nakhon Si Ayutthaya': 4, 'Lop Buri': 4, 'Saraburi': 4, 'Sing Buri': 4, 'Ang Thong': 4,
  // Region 5
  'Kanchanaburi': 5, 'Nakhon Pathom': 5, 'Prachuap Khiri Khan': 5, 'Phetchaburi': 5, 'Ratchaburi': 5, 'Samut Songkhram': 5, 'Samut Sakhon': 5, 'Suphan Buri': 5,
  // Region 6
  'Chanthaburi': 6, 'Chachoengsao': 6, 'Chon Buri': 6, 'Trat': 6, 'Prachin Buri': 6, 'Rayong': 6, 'Samut Prakan': 6, 'Sa Kaeo': 6,
  // Region 7
  'Kalasin': 7, 'Khon Kaen': 7, 'Maha Sarakham': 7, 'Roi Et': 7,
  // Region 8
  'Nakhon Phanom': 8, 'Bueng Kan': 8, 'Loei': 8, 'Sakon Nakhon': 8, 'Nong Khai': 8, 'Nong Bua Lam Phu': 8, 'Udon Thani': 8,
  // Region 9
  'Chaiyaphum': 9, 'Nakhon Ratchasima': 9, 'Buri Ram': 9, 'Surin': 9,
  // Region 10
  'Mukdahan': 10, 'Yasothon': 10, 'Si Sa Ket': 10, 'Amnat Charoen': 10, 'Ubon Ratchathani': 10,
  // Region 11
  'Krabi': 11, 'Chumphon': 11, 'Nakhon Si Thammarat': 11, 'Phangnga': 11, 'Phuket': 11, 'Ranong': 11, 'Surat Thani': 11,
  // Region 12
  'Trang': 12, 'Narathiwat': 12, 'Pattani': 12, 'Phatthalung': 12, 'Yala': 12, 'Songkhla': 12, 'Satun': 12,
  // Region 13
  'Bangkok': 13, 'Bangkok Metropolis': 13
};

async function generate() {
    const res = await fetch(url);
    const geojson = await res.json();
    
    // Assign a unique ID parameter to each feature so we can track it through TopoJSON translation
    geojson.features.forEach((f, i) => { f.id = i; });
    
    // Convert to TopoJSON
    const topology = topojsonServer.topology({ collection: geojson });
    
    const features = [];
    
    // The converted object is in topology.objects.collection
    const objectGeometries = topology.objects.collection.geometries;
    
    for (let r = 1; r <= 13; r++) {
       const regionGeoms = objectGeometries.filter(g => {
           // We mapped ID earlier, fetch properties from original GeoJSON
           const name = geojson.features[g.id].properties.NAME_1;
           return PROVINCE_TO_REGION[name] === r;
       });
       
       if (regionGeoms.length > 0) {
           const mergedGeojson = topojsonClient.merge(topology, regionGeoms);
           features.push({
               type: "Feature",
               properties: {
                   health_region: r
               },
               geometry: mergedGeojson
           });
       }
    }
    
    const featureCollection = {
        type: "FeatureCollection",
        features: features
    };
    
    if (!fs.existsSync('src/data')) fs.mkdirSync('src/data', { recursive: true });
    fs.writeFileSync('src/data/thailand_regions.json', JSON.stringify(featureCollection));
    console.log(`Written 13 regions to src/data/thailand_regions.json`);
}

generate().catch(console.error);
