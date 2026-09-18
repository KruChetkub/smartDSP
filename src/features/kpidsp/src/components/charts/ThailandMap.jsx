import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { MapPin } from 'lucide-react';
import thailandGeoJson from '../../data/thailand.json';

// Approximate center coordinates for Health Regions 1-13
const REGION_COORDS = {
  1: [99.0, 18.8],
  2: [100.1, 16.6],
  3: [100.0, 15.6],
  4: [100.6, 14.5],
  5: [99.8, 13.5],
  6: [101.6, 13.4],
  7: [103.2, 16.2],
  8: [103.5, 17.4],
  9: [102.5, 15.0],
  10: [104.5, 15.2],
  11: [99.1, 8.8],
  12: [100.4, 6.8],
  13: [100.5, 13.8] // Bangkok
};

// Map Province names from the TopoJSON to Health Regions
const PROVINCE_TO_REGION = {
  'Chiang Mai': 1, 'Chiang Rai': 1, 'Nan': 1, 'Phayao': 1, 'Phrae': 1, 'Mae Hong Son': 1, ' Lampang': 1, 'Lampang': 1, 'Lamphun': 1,
  'Tak': 2, 'Phitsanulok': 2, 'Phetchabun': 2, 'Sukhothai': 2, 'Uttaradit': 2,
  'Kamphaeng Phet': 3, 'Chai Nat': 3, 'Nakhon Sawan': 3, 'Phichit': 3, 'Uthai Thani': 3,
  'Nakhon Nayok': 4, 'Nonthaburi': 4, 'Pathum Thani': 4, 'Phra Nakhon Si Ayutthaya': 4, 'Lop Buri': 4, 'Saraburi': 4, 'Sing Buri': 4, 'Ang Thong': 4,
  'Kanchanaburi': 5, 'Nakhon Pathom': 5, 'Prachuap Khiri Khan': 5, 'Phetchaburi': 5, 'Ratchaburi': 5, 'Samut Songkhram': 5, 'Samut Sakhon': 5, 'Suphan Buri': 5,
  'Chanthaburi': 6, 'Chachoengsao': 6, 'Chon Buri': 6, 'Trat': 6, 'Prachin Buri': 6, 'Rayong': 6, 'Samut Prakan': 6, 'Sa Kaeo': 6,
  'Kalasin': 7, 'Khon Kaen': 7, 'Maha Sarakham': 7, 'Roi Et': 7,
  'Nakhon Phanom': 8, 'Bueng Kan': 8, 'Loei': 8, 'Sakon Nakhon': 8, 'Nong Khai': 8, 'Nong Bua Lam Phu': 8, 'Udon Thani': 8,
  'Chaiyaphum': 9, 'Nakhon Ratchasima': 9, 'Buri Ram': 9, 'Surin': 9,
  'Mukdahan': 10, 'Yasothon': 10, 'Si Sa Ket': 10, 'Amnat Charoen': 10, 'Ubon Ratchathani': 10,
  'Krabi': 11, 'Chumphon': 11, 'Nakhon Si Thammarat': 11, 'Phangnga': 11, 'Phuket': 11, 'Ranong': 11, 'Surat Thani': 11,
  'Trang': 12, 'Narathiwat': 12, 'Pattani': 12, 'Phatthalung': 12, 'Yala': 12, 'Songkhla': 12, 'Satun': 12,
  'Bangkok': 13, 'Bangkok Metropolis': 13
};

export default function ThailandMap({ dashboardData }) {
  const [tooltipContent, setTooltipContent] = useState("");
  const [hoverRegion, setHoverRegion] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  // Map region number to its color and data
  const regionData = useMemo(() => {
    const dataMap = {};
    if (!dashboardData || dashboardData.length === 0) return dataMap;
    
    // Check if we ONLY have overall report data
    const hasRegionalData = dashboardData.some(d => d.region && d.region.match(/\d+/));
    const overallData = dashboardData.find(d => d.region === 'ภาพรวมประเทศ' || d.region === 'รายงานภาพรวม' || !d.region);

    const applyDataToMap = (rnum, d) => {
        let color = '#f1f5f9';
        if (d.status_info.raw === 'passed_100') color = '#10b981';
        else if (d.status_info.raw === 'failed_75') color = '#eab308';
        else if (d.status_info.raw === 'failed_50') color = '#f97316';
        else if (d.status_info.raw === 'failed_0') color = '#f43f5e';
        else if (d.status_info.raw === 'pending') color = '#cbd5e1';

        dataMap[rnum] = {
           color: color,
           performance: d.current_value || '-',
           target: d.target_value || 'N/A',
           statusText: d.status_info.text
        };
    };

    if (!hasRegionalData && overallData) {
       // Apply overall data to all 13 regions
       for (let i = 1; i <= 13; i++) {
           applyDataToMap(i, overallData);
       }
    } else {
       // Apply regional data
       dashboardData.forEach(d => {
         const match = d.region && d.region.match(/\d+/);
         if (match) {
           const rnum = parseInt(match[0]);
           applyDataToMap(rnum, d);
         }
       });
    }
    
    return dataMap;
  }, [dashboardData]);

  return (
    <div 
      className="w-full h-full min-h-[300px] relative bg-transparent rounded-3xl mx-auto flex overflow-hidden group"
      onMouseMove={handleMouseMove}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full h-full relative z-10 pb-2 cursor-crosshair">
         <ComposableMap
           projection="geoMercator"
           projectionConfig={{
             scale: 2150,
             center: [100.8, 13.0]
           }}
           className="w-full h-full"
         >
           <ZoomableGroup 
              center={[100.8, 13.0]} 
              zoom={1} 
              minZoom={1} 
              maxZoom={5}
              translateExtent={[[-100, -100], [800, 800]]}
           >
             <Geographies geography={thailandGeoJson}>
               {({ geographies }) =>
                 geographies.map((geo) => {
                   const provName = geo.properties.name; // FIXED property key!
                   const regionNum = PROVINCE_TO_REGION[provName];
                   
                   const rData = regionData[regionNum];
                   const baseColor = rData ? rData.color : '#f1f5f9';
                   
                   const isHoveredRegion = hoverRegion === regionNum && regionNum !== undefined;
                   
                   // Drop opacity if another region is hovered
                   const regionOpacity = hoverRegion && hoverRegion !== regionNum ? 0.3 : 1;
                   const fillColor = isHoveredRegion ? '#06b6d4' : baseColor;
                   const strokeColor = isHoveredRegion
                     ? '#06b6d4'
                     : baseColor === '#f1f5f9'
                       ? '#cbd5e1'
                       : '#ffffff';

                   return (
                     <Geography
                       key={geo.rsmKey}
                       geography={geo}
                       fill={fillColor}
                       stroke={strokeColor}
                       strokeWidth={0.75}
                       style={{
                         fill: fillColor,
                         stroke: strokeColor,
                         strokeWidth: 0.75,
                         opacity: regionOpacity,
                         outline: 'none',
                         cursor: 'pointer',
                         transition: 'all 0.2s ease-in-out',
                       }}
                       onMouseEnter={() => {
                         if (regionNum) {
                           setHoverRegion(regionNum);
                           setTooltipContent(
                             <div className="flex flex-col text-left">
                               <p className="font-bold text-slate-800 text-sm mb-1">เขตฯ {String(regionNum).padStart(2, '0')}</p>
                               {rData ? (
                                 <p className="text-xs font-medium text-slate-600 tracking-wide">
                                    <span className="text-slate-800 font-black">{rData.performance}</span> (ร้อยละ)
                                 </p>
                               ) : (
                                 <p className="text-xs font-medium text-slate-400">ไม่มีข้อมูล</p>
                               )}
                             </div>
                           );
                         }
                       }}
                       onMouseLeave={() => {
                         setHoverRegion(null);
                         setTooltipContent("");
                       }}
                     />
                   );
                 })
               }
             </Geographies>

             {/* Static Value Overlays */}
             {Object.keys(REGION_COORDS).map(rnum => {
                const rData = regionData[rnum];
                // Hide label if no data exists
                if (!rData || rData.performance === '-') return null;
                
                return (
                  <Marker key={`marker-${rnum}`} coordinates={REGION_COORDS[rnum]}>
                     <rect x="-17" y="-8" width="34" height="16" rx="4" fill="rgba(255,255,255,0.85)" stroke={rData.color === '#cbd5e1' ? '#94a3b8' : rData.color} strokeWidth="1" pointerEvents="none" />
                     <text textAnchor="middle" y="3" style={{ fontFamily: "Inter, sans-serif", fontSize: "8px", fontWeight: "900", fill: rData.color === '#cbd5e1' ? '#64748b' : rData.color }} pointerEvents="none">
                       {rData.performance}
                     </text>
                  </Marker>
                );
             })}
           </ZoomableGroup>
         </ComposableMap>
      </div>

      {/* Floating Mouse-tracking Tooltip */}
      {tooltipContent && (
        <div 
          className="fixed z-50 pointer-events-none bg-white/95 backdrop-blur-md border border-slate-200 px-4 py-3 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] transition-opacity duration-150"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
          }}
        >
          {tooltipContent}
        </div>
      )}

    </div>
  );
}
