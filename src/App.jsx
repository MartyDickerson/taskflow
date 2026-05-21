import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, LineChart, Line } from "recharts";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://zpbsoehvlblfkmvzuyjf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYnNvZWh2bGJsZmttdnp1eWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDcxNDIsImV4cCI6MjA5NDY4MzE0Mn0.pkSoMbc0r3PFJxqi6raV2GHXhAOXAMH8tb1o8zB61LU"
);

const T = {
  bg:        "#09091a",
  surface:   "#0e0e22",
  raised:    "#12122c",
  card:      "#161634",
  border:    "#1e1e3a",
  border2:   "#252548",
  accent:    "#7c3aed",
  accentB:   "#9333ea",
  accentDim: "rgba(124,58,237,0.15)",
  accentGlow:"rgba(124,58,237,0.3)",
  accentLight:"#a78bfa",
  pink:      "#ec4899",
  pinkDim:   "rgba(236,72,153,0.15)",
  green:     "#10b981",
  greenDim:  "rgba(16,185,129,0.12)",
  red:       "#ef4444",
  redDim:    "rgba(239,68,68,0.12)",
  yellow:    "#f59e0b",
  text:      "#f0eeff",
  muted:     "#6b6b9a",
  faint:     "#2a2a4a",
};

const SPEND_DATA = [
  { name:"Shopping",      value:27, color:T.accent },
  { name:"Subscriptions", value:35, color:T.pink },
  { name:"Dining",        value:18, color:T.yellow },
  { name:"Other",         value:20, color:T.faint },
];

const DAYS_S  = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const NAV     = ["Dashboard","Tasks","Calendar","Finance","Goals","Settings","Help Center"];
const NAV_ICO = { Dashboard:"⊞", Tasks:"✓", Calendar:"📅", Finance:"◈", Goals:"🎯", Settings:"⚙", "Help Center":"?" };

const WEATHER_ICONS = { clear:"☀️", sunny:"☀️", "mostly sunny":"🌤️", "partly cloudy":"⛅", cloudy:"☁️", overcast:"☁️", rain:"🌧️", "light rain":"🌦️", thunderstorm:"⛈️", snow:"❄️", fog:"🌫️", windy:"💨" };
const getWIcon = (c) => { if(!c) return "🌤️"; const l=c.toLowerCase(); for(const[k,v] of Object.entries(WEATHER_ICONS)) if(l.includes(k)) return v; return "🌤️"; };

function Pill({ children, color }) {
  return <span style={{ fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:20, background:`${color}22`, color, whiteSpace:"nowrap" }}>{children}</span>;
}

function Bar2({ pct, color, h=5 }) {
  return (
    <div style={{ height:h, background:T.faint, borderRadius:h, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:color, borderRadius:h, boxShadow:`0 0 8px ${color}66`, transition:"width 1s ease" }} />
    </div>
  );
}

function Ring({ pct, size=96, stroke=9, color=T.accent, center }) {
  const r=(size-stroke)/2, circ=2*Math.PI*r, dash=(Math.min(pct,100)/100)*circ;
  return (
    <div style={{ position:"relative", width:size, height:size, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)", position:"absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.faint} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 7px ${color})`, transition:"stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{ zIndex:1, textAlign:"center" }}>{center}</div>
    </div>
  );
}

function Spinner() {
  return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"20px 0" }}>
    <div style={{ width:18, height:18, border:`2px solid ${T.border2}`, borderTop:`2px solid ${T.accent}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
  </div>;
}

const CustomTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return <div style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:9, padding:"9px 13px", fontSize:12 }}>
    <div style={{ color:T.muted, marginBottom:4 }}>{payload[0]?.payload?.day}</div>
    <div style={{ color:T.green, fontWeight:700 }}>Done: {payload[0]?.value}</div>
  </div>;
};

function Calendar() {
  const [cal, setCal]         = useState(new Date(2026,4,1));
  const today                 = new Date(2026,4,18);
  const [events, setEvents]   = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEv, setNewEv]     = useState({ title:"", event_date:"", event_time:"", color:T.accent });
  const [saving, setSaving]   = useState(false);

  useEffect(()=>{
    supabase.from("calendar_events").select("*").order("event_date",{ascending:true}).order("event_time",{ascending:true})
      .then(({data})=>setEvents(data||[]));
    const sub = supabase.channel("cal-events")
      .on("postgres_changes",{event:"*",schema:"public",table:"calendar_events"},()=>{
        supabase.from("calendar_events").select("*").order("event_date",{ascending:true}).order("event_time",{ascending:true})
          .then(({data})=>setEvents(data||[]));
      }).subscribe();
    return ()=>supabase.removeChannel(sub);
  },[]);

  const addEvent = async () => {
    if (!newEv.title.trim() || !newEv.event_date) return;
    setSaving(true);
    await supabase.from("calendar_events").insert(newEv);
    setNewEv({ title:"", event_date:"", event_time:"", color:T.accent });
    setShowAdd(false); setSaving(false);
  };

  const deleteEvent = async (id) => {
    setEvents(ev=>ev.filter(e=>e.id!==id));
    await supabase.from("calendar_events").delete().eq("id",id);
  };

  const fd=new Date(cal.getFullYear(),cal.getMonth(),1).getDay();
  const dim=new Date(cal.getFullYear(),cal.getMonth()+1,0).getDate();
  const cells=[...Array(fd).fill(null),...Array.from({length:dim},(_,i)=>i+1)];

  // Days that have events this month - from Supabase only
  const eventDays = new Set(events
    .filter(e=>{ 
      const [y,m]=e.event_date.split("-").map(Number);
      return m-1===cal.getMonth()&&y===cal.getFullYear(); 
    })
    .map(e=>parseInt(e.event_date.split("-")[2])));

  // Today's events
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const selectedStr = `${cal.getFullYear()}-${String(cal.getMonth()+1).padStart(2,"0")}`;
  const todayEvents = events.filter(e=>e.event_date===todayStr);

  return (
    <div>
      {/* Calendar header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <button onClick={()=>setCal(new Date(cal.getFullYear(),cal.getMonth()-1))}
          style={{ background:T.faint, border:"none", color:T.muted, width:26, height:26, borderRadius:7, cursor:"pointer", fontSize:13 }}>‹</button>
        <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{MONTHS[cal.getMonth()].slice(0,3)} {cal.getFullYear()}</span>
        <button onClick={()=>setCal(new Date(cal.getFullYear(),cal.getMonth()+1))}
          style={{ background:T.faint, border:"none", color:T.muted, width:26, height:26, borderRadius:7, cursor:"pointer", fontSize:13 }}>›</button>
      </div>

      {/* Day labels */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {DAYS_S.map(d=><div key={d} style={{ textAlign:"center", fontSize:9, color:T.faint, fontWeight:700, padding:"2px 0", textTransform:"uppercase" }}>{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((day,i)=>{
          const isT=day===today.getDate()&&cal.getMonth()===today.getMonth()&&cal.getFullYear()===today.getFullYear();
          const hasE=day&&eventDays.has(day)&&!isT;
          return <div key={i} style={{ textAlign:"center", fontSize:11, padding:"5px 0", borderRadius:7,
            cursor:day?"pointer":"default",
            background:isT?T.accent:"transparent",
            color:!day?"transparent":isT?"white":T.text,
            fontWeight:isT?800:400,
            boxShadow:isT?`0 0 12px ${T.accentGlow}`:"none",
            position:"relative", transition:"background 0.15s" }}>
            {day||"·"}
            {hasE&&<div style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background:T.accentLight }} />}
          </div>;
        })}
      </div>

      {/* Today's events */}
      <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Today's Schedule</div>
          <button onClick={()=>setShowAdd(!showAdd)}
            style={{ fontSize:10, padding:"2px 8px", borderRadius:6, fontWeight:700,
              background:showAdd?T.accentDim:`linear-gradient(135deg,${T.accent},${T.accentB})`,
              border:showAdd?`1px solid ${T.accent}44`:"none", color:showAdd?T.accentLight:"white" }}>
            {showAdd?"✕":"+ Add"}
          </button>
        </div>

        {/* Add event form */}
        {showAdd&&(
          <div className="fu" style={{ background:T.accentDim, border:`1px solid ${T.accent}33`, borderRadius:10, padding:10, marginBottom:10 }}>
            <input value={newEv.title} onChange={e=>setNewEv({...newEv,title:e.target.value})}
              placeholder="Event title"
              style={{ width:"100%", background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"6px 9px", color:T.text, fontSize:11, marginBottom:6 }} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
              <input type="date" value={newEv.event_date} onChange={e=>setNewEv({...newEv,event_date:e.target.value})}
                style={{ background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"6px 9px", color:T.text, fontSize:11 }} />
              <input type="text" value={newEv.event_time} onChange={e=>setNewEv({...newEv,event_time:e.target.value})}
                placeholder="Time e.g. 10:00 AM"
                style={{ background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"6px 9px", color:T.text, fontSize:11 }} />
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <select value={newEv.color} onChange={e=>setNewEv({...newEv,color:e.target.value})}
                style={{ flex:1, background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"6px 9px", color:T.text, fontSize:11 }}>
                <option value={T.accent}>Purple</option>
                <option value={T.pink}>Pink</option>
                <option value={T.green}>Green</option>
                <option value={T.yellow}>Yellow</option>
                <option value={T.red}>Red</option>
              </select>
              <button onClick={addEvent} disabled={saving}
                style={{ padding:"6px 14px", background:`linear-gradient(135deg,${T.accent},${T.pink})`, borderRadius:7, color:"white", fontSize:12, fontWeight:700, opacity:saving?0.6:1 }}>Save</button>
            </div>
          </div>
        )}

        {/* Event list */}
        <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:180, overflowY:"auto" }}>
          {todayEvents.length===0&&<div style={{ fontSize:11, color:T.muted, textAlign:"center", padding:"10px 0" }}>No events today</div>}
          {todayEvents.map(e=>(
            <div key={e.id} style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 9px", borderRadius:9, background:T.raised, border:`1px solid ${T.border}` }}
              onMouseEnter={ev=>ev.currentTarget.querySelector(".ev-del").style.opacity="1"}
              onMouseLeave={ev=>ev.currentTarget.querySelector(".ev-del").style.opacity="0"}>
              <div style={{ width:3, height:26, borderRadius:2, background:e.color, boxShadow:`0 0 6px ${e.color}`, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600 }}>{e.title}</div>
                <div style={{ fontSize:10, color:T.muted }}>{e.event_time||"All day"}</div>
              </div>
              <button className="ev-del" onClick={()=>deleteEvent(e.id)}
                style={{ background:"none", color:T.red, fontSize:14, padding:"0 4px", borderRadius:4, opacity:0, transition:"opacity 0.15s", cursor:"pointer" }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



function useWindowSize() {
  const [size, setSize] = React.useState({ w: window.innerWidth, h: window.innerHeight });
  React.useEffect(()=>{
    const fn = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  },[]);
  return size;
}

function WeatherWidget({ compact=false, onLocChange=null }) {
  const [weather, setWeather]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [unit, setUnit]             = useState("F");
  const [tab, setTab]               = useState("Temperature");
  const [loc, setLoc]               = useState(null); // null until loaded from Supabase
  const [editLoc, setEditLoc]       = useState(false);
  const [locInput, setLocInput]     = useState("");
  const [locResults, setLocResults] = useState([]);
  const [searching, setSearching]   = useState(false);

  const DEFAULT_LOC = { name:"Alpharetta, GA", lat:34.0754, lon:-84.2941 };

  const saveLoc = (l) => { try { localStorage.setItem("taskflow_weather_loc", JSON.stringify(l)); } catch(e){} };
  const loadLoc = () => { try { const s=localStorage.getItem("taskflow_weather_loc"); return s?JSON.parse(s):null; } catch(e){ return null; } };

  const fetchWeather = (lat, lon) => {
    setLoading(true);
    const wmo={0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",51:"Light drizzle",61:"Light rain",63:"Rain",80:"Rain showers",95:"Thunderstorm"};
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&hourly=temperature_2m,precipitation_probability,windspeed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7`)
      .then(r=>r.json()).then(data=>{
        const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const now=new Date(), h=now.getHours();
        const hourLabels=["Now","1 AM","4 AM","7 AM","10 AM","1 PM","4 PM","7 PM"];
        const hourIndices=[h,1,4,7,10,13,16,19];
        const hourly=hourIndices.map((idx,i)=>({ label:hourLabels[i], temp:Math.round(data.hourly.temperature_2m[idx]||75), precip:data.hourly.precipitation_probability[idx]||0, wind:Math.round(data.hourly.windspeed_10m[idx]||8) }));
        const forecast=data.daily.time.map((dateStr,i)=>{
          const [y,m,d]=dateStr.split("-").map(Number);
          return { day:DAYS[new Date(y,m-1,d).getDay()], high:Math.round(data.daily.temperature_2m_max[i]), low:Math.round(data.daily.temperature_2m_min[i]), rain:data.daily.precipitation_probability_max[i], condition:wmo[data.daily.weathercode[i]]||"Clear" };
        });
        setWeather({ temp:Math.round(data.current.temperature_2m), high:Math.round(data.daily.temperature_2m_max[0]), low:Math.round(data.daily.temperature_2m_min[0]), condition:wmo[data.current.weathercode]||"Clear sky", wind:Math.round(data.current.windspeed_10m), humidity:data.current.relativehumidity_2m, precip:data.current.precipitation_probability||0, hourly, forecast });
        setLoading(false);
      }).catch(()=>setLoading(false));
  };

  // On mount: load saved location from localStorage FIRST, then fetch weather
  useEffect(()=>{
    const saved = loadLoc();
    const activeLoc = saved || DEFAULT_LOC;
    setLoc(activeLoc);
    if(onLocChange) onLocChange(activeLoc.name.split(",")[0]);
    fetchWeather(activeLoc.lat, activeLoc.lon);
  }, []);

  const searchLocation = async () => {
    if (!locInput.trim()) return;
    setSearching(true);
    try {
      const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locInput)}&count=5&language=en&format=json`);
      const d=await r.json();
      setLocResults(d.results||[]);
    } catch(e){ setLocResults([]); }
    setSearching(false);
  };

  const selectLocation = (result) => {
    const newLoc = { name:`${result.name}, ${result.admin1||result.country}`, lat:result.latitude, lon:result.longitude };
    setLoc(newLoc);
    saveLoc(newLoc);
    if(onLocChange) onLocChange(result.name);
    setEditLoc(false); setLocInput(""); setLocResults([]);
    fetchWeather(newLoc.lat, newLoc.lon);
  };

  const toC = v=>Math.round((v-32)*5/9);
  const fmt = v=>unit==="F"?`${v}°`:`${toC(v)}°`;

  if (loading) return <Spinner />;

  const chartData = tab==="Temperature"?weather.hourly.map(h=>({label:h.label,value:h.temp})):tab==="Precipitation"?weather.hourly.map(h=>({label:h.label,value:h.precip})):weather.hourly.map(h=>({label:h.label,value:h.wind}));
  const chartColor = tab==="Temperature"?"#c8a84b":tab==="Precipitation"?T.accentLight:T.green;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {editLoc&&(
        <div className="fu" style={{ marginBottom:4 }}>
          <div style={{ display:"flex", gap:6 }}>
            <input value={locInput} onChange={e=>setLocInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchLocation()}
              placeholder="Search city... e.g. Atlanta, GA"
              style={{ flex:1, background:T.raised, border:`1px solid ${T.accent}`, borderRadius:8, padding:"7px 10px", color:T.text, fontSize:12 }} />
            <button onClick={searchLocation} disabled={searching}
              style={{ padding:"7px 12px", background:`linear-gradient(135deg,${T.accent},${T.pink})`, borderRadius:8, color:"white", fontSize:12, fontWeight:700 }}>
              {searching?"...":"Search"}
            </button>
            <button onClick={()=>{setEditLoc(false);setLocResults([]);}} style={{ padding:"7px 10px", background:T.faint, borderRadius:8, color:T.muted, fontSize:12 }}>✕</button>
          </div>
          {locResults.length>0&&(
            <div style={{ marginTop:6, background:T.card, border:`1px solid ${T.border2}`, borderRadius:9, overflow:"hidden", position:"absolute", zIndex:100, width:"calc(100% - 48px)" }}>
              {locResults.map((r,i)=>(
                <div key={i} onClick={()=>selectLocation(r)} style={{ padding:"8px 12px", fontSize:12, cursor:"pointer", borderBottom:`1px solid ${T.border}`, color:T.text }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.accentDim}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  📍 {r.name}, {r.admin1||""} {r.country}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:12 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <div style={{ fontSize:34, lineHeight:1 }}>{getWIcon(weather.condition)}</div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, lineHeight:1, color:T.text }}>{fmt(weather.temp)}</div>
              <div style={{ display:"flex", gap:4, marginTop:2 }}>
                {["F","C"].map(u=><button key={u} onClick={()=>setUnit(u)} style={{ padding:"1px 7px", borderRadius:5, fontSize:10, fontWeight:700, background:unit===u?T.raised:"transparent", border:`1px solid ${unit===u?T.border2:"transparent"}`, color:unit===u?T.text:T.muted }}>{u}</button>)}
              </div>
            </div>
          </div>
          <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>High {fmt(weather.high)} · Low {fmt(weather.low)}</div>
          <div style={{ fontSize:12, color:T.text, marginBottom:8 }}>{weather.condition}</div>
          {[{l:"Humidity",v:`${weather.humidity}%`},{l:"Precipitation",v:`${weather.precip}%`},{l:"Wind",v:`${weather.wind} mph`}].map(s=>(
            <div key={s.l} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:11, color:T.muted }}>{s.l}</span>
              <span style={{ fontSize:11, fontWeight:600, color:T.text }}>{s.v}</span>
            </div>
          ))}
          <button onClick={()=>setEditLoc(!editLoc)} style={{ marginTop:8, fontSize:10, color:T.accentLight, background:"none", border:"none", padding:0, cursor:"pointer" }}>
            📍 {loc?.name||"Alpharetta, GA"} ✎
          </button>
        </div>
        <div>
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            {["Temperature","Precipitation","Wind"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{ fontSize:10, padding:"3px 10px", borderRadius:7, fontWeight:600, background:tab===t?T.raised:"transparent", border:`1px solid ${tab===t?T.border2:"transparent"}`, color:tab===t?T.text:T.muted, transition:"all 0.15s" }}>{t}</button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={chartData} margin={{top:5,right:5,left:-30,bottom:0}}>
              <defs><linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/><stop offset="95%" stopColor={chartColor} stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="label" tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:8, fontSize:11 }} labelStyle={{ color:T.muted }} itemStyle={{ color:chartColor }}/>
              <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill="url(#wGrad)" dot={{ fill:chartColor, r:2 }} activeDot={{ r:4, fill:chartColor }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, paddingTop:8, borderTop:`1px solid ${T.border}` }}>
        {weather.forecast.map((d,i)=>(
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 4px", borderRadius:9, background:i===0?T.accentDim:"transparent", border:`1px solid ${i===0?T.accent+"44":"transparent"}` }}>
            <div style={{ fontSize:9, fontWeight:700, color:i===0?T.accentLight:T.muted, textTransform:"uppercase" }}>{d.day}</div>
            <div style={{ fontSize:18 }}>{getWIcon(d.condition)}</div>
            <div style={{ fontSize:10, fontWeight:700, color:T.text }}>{fmt(d.high)}</div>
            <div style={{ fontSize:9, color:T.muted }}>{fmt(d.low)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}



const CardLogo = ({ type }) => {
  const t = (type||"").toLowerCase();
  if(t.includes("mastercard")) return (
    <div style={{ display:"flex", alignItems:"center" }}>
      <div style={{ width:20, height:20, borderRadius:"50%", background:"#eb001b", opacity:0.9 }}/>
      <div style={{ width:20, height:20, borderRadius:"50%", background:"#f79e1b", opacity:0.9, marginLeft:-10 }}/>
    </div>
  );
  if(t.includes("amex")||t.includes("american")) return (
    <div style={{ background:"#007bc1", borderRadius:4, padding:"2px 6px", fontSize:9, fontWeight:800, color:"white", letterSpacing:0.5 }}>AMEX</div>
  );
  if(t.includes("discover")) return (
    <div style={{ background:"linear-gradient(135deg,#ff6600,#ff9900)", borderRadius:4, padding:"2px 6px", fontSize:9, fontWeight:800, color:"white" }}>DISCOVER</div>
  );
  if(t.includes("gusto")) return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      <div style={{ width:18, height:18, borderRadius:"50%", background:"linear-gradient(135deg,#f45d48,#f97316)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"white", opacity:0.9 }}/>
      </div>
      <span style={{ fontWeight:900, fontSize:13, color:"white", letterSpacing:"0.5px" }}>gusto</span>
    </div>
  );
  if(t.includes("navy")||t.includes("nfcu")||t.includes("navyfederal")) return (
    <div style={{ display:"flex", flexDirection:"column", lineHeight:1.3 }}>
      <span style={{ fontSize:8, fontWeight:800, color:"white", letterSpacing:"0.5px" }}>NAVY FEDERAL</span>
      <span style={{ fontSize:7, color:"rgba(255,255,255,0.7)", letterSpacing:"0.3px" }}>CREDIT UNION</span>
    </div>
  );
  // Default: Visa
  return (
    <div style={{ fontFamily:"serif", fontStyle:"italic", fontWeight:900, fontSize:20, color:"white", letterSpacing:"-1px" }}>VISA</div>
  );
};


function PomodoroTimer() {
  const [pomState, setPomState] = useState("idle");
  const [pomSecs,  setPomSecs]  = useState(25*60);
  const [pomCount, setPomCount] = useState(0);
  const [task,     setTask]     = useState("");
  const pomRef = useRef(null);

  useEffect(()=>{
    if(pomState==="idle") return;
    pomRef.current = setInterval(()=>{
      setPomSecs(s=>{
        if(s<=1){
          clearInterval(pomRef.current);
          if(pomState==="work"){ setPomCount(c=>c+1); setPomState("break"); return 5*60; }
          else { setPomState("idle"); return 25*60; }
        }
        return s-1;
      });
    },1000);
    return ()=>clearInterval(pomRef.current);
  },[pomState]);

  const mins  = String(Math.floor(pomSecs/60)).padStart(2,"0");
  const secs  = String(pomSecs%60).padStart(2,"0");
  const total = pomState==="work"?25*60:5*60;
  const pct   = pomState==="idle"?0:((total-pomSecs)/total)*100;
  const color = pomState==="break"?T.green:T.accent;
  const SIZE  = 160; const R = 68; const C = SIZE/2; const CIRC = 2*Math.PI*R;

  return (
    <div style={{ background:`linear-gradient(145deg,#14143a,${T.surface})`, borderRadius:14, padding:"18px", border:`1px solid ${T.accent}33`, boxShadow:`0 0 20px ${T.accentGlow}`, display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontSize:10, color:T.accentLight, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>🍅 Focus Timer</div>
        {pomCount>0&&<div style={{ fontSize:11, color:T.accentLight, fontWeight:700 }}>🔥 {pomCount} session{pomCount!==1?"s":""}</div>}
      </div>

      {/* Task input */}
      <input value={task} onChange={e=>setTask(e.target.value)} placeholder="What are you working on?"
        style={{ background:T.raised, border:`1px solid ${T.border2}`, borderRadius:8, padding:"8px 12px", color:T.text, fontSize:12, marginBottom:16, width:"100%" }} />

      {/* Big donut */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
        <div style={{ position:"relative", width:SIZE, height:SIZE }}>
          <svg width={SIZE} height={SIZE} style={{ transform:"rotate(-90deg)" }}>
            <circle cx={C} cy={C} r={R} fill="none" stroke={T.faint} strokeWidth={10}/>
            <circle cx={C} cy={C} r={R} fill="none" stroke={color} strokeWidth={10}
              strokeDasharray={`${(pct/100)*CIRC} ${CIRC}`}
              strokeLinecap="round" style={{ transition:"stroke-dasharray 1s linear", filter:`drop-shadow(0 0 8px ${color})` }}/>
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:42, color:T.text, lineHeight:1, letterSpacing:"2px" }}>{mins}:{secs}</div>
            <div style={{ fontSize:11, color:color, fontWeight:700, marginTop:4, letterSpacing:"2px" }}>
              {pomState==="idle"?"READY":pomState==="work"?"FOCUS":"BREAK"}
            </div>
            {task&&pomState!=="idle"&&<div style={{ fontSize:10, color:T.muted, marginTop:4, textAlign:"center", maxWidth:120, lineHeight:1.3 }}>{task}</div>}
          </div>
        </div>
      </div>

      {/* Session dots */}
      <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:16 }}>
        {[...Array(4)].map((_,i)=>(
          <div key={i} style={{ width:10, height:10, borderRadius:"50%",
            background:i<pomCount%4?color:T.faint,
            boxShadow:i<pomCount%4?`0 0 8px ${color}88`:"none",
            transition:"all 0.3s" }}/>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8 }}>
        {pomState==="idle"?(
          <button onClick={()=>{ setPomSecs(25*60); setPomState("work"); }}
            style={{ flex:2, padding:"10px", borderRadius:10, fontWeight:700, fontSize:13,
              background:`linear-gradient(135deg,${T.accent},${T.accentB})`, border:"none", color:"white",
              boxShadow:`0 4px 14px ${T.accentGlow}` }}>▶ Start Focus</button>
        ):(
          <button onClick={()=>{ clearInterval(pomRef.current); setPomState("idle"); setPomSecs(25*60); }}
            style={{ flex:1, padding:"10px", borderRadius:10, fontWeight:700, fontSize:13,
              background:T.faint, border:`1px solid ${T.border2}`, color:T.muted }}>■ Stop</button>
        )}
        <button onClick={()=>{ clearInterval(pomRef.current); setPomState("idle"); setPomSecs(25*60); setPomCount(0); }}
          style={{ flex:1, padding:"10px", borderRadius:10, fontWeight:700, fontSize:13,
            background:T.raised, border:`1px solid ${T.border2}`, color:T.muted }}>↺ Reset</button>
      </div>

      {/* Status */}
      <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:T.muted, fontStyle:"italic" }}>
        {pomState==="work"?"Stay focused! You've got this 💪":pomState==="break"?"Take a breather ☕ You earned it!":"4 pomodoros = 1 long break"}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { w } = useWindowSize();
  const isXl  = w >= 1400;
  const isLg  = w >= 1100 && w < 1400;
  const isMd  = w >= 768  && w < 1100;
  const isSm  = w < 768;
  const isCompact = w < 1100;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [tasks,       setTasks]       = useState([]);
  const [goals,       setGoals]       = useState([]);
  const [txns,        setTxns]        = useState([]);
  const [cards,       setCards]       = useState([]);
  const [selectedCard,setSelectedCard]= useState(0);
  const [loading,     setLoading]     = useState({ tasks:true, goals:true, txns:true, cards:true });
  const [newTask,     setNewTask]     = useState("");
  const [newTxn,      setNewTxn]      = useState({ name:"", amount:"", type:"expense", icon:"💳" });
  const [newCard,     setNewCard]     = useState({ name:"", number:"", balance:"", type:"visa", color:T.accent });
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [showGoalForm,setShowGoalForm]= useState(false);
  const [newGoal,     setNewGoal]     = useState({ text:"", progress:0, color:"#7c3aed" });
  const [fitnessGoals, setFitnessGoals] = useState({ steps:10000, calories:2500, water_oz:128, sleep_hrs:12, tea_cups:3 });
  const [editingGoal,  setEditingGoal]  = useState(null);
  const [fitnessLog,   setFitnessLog]   = useState(null);
  const [books,       setBooks]       = useState([]);
  const [showBookForm,setShowBookForm]= useState(false);
  const [newBook,     setNewBook]     = useState({ title:"", author:"", pages_total:0, pages_read:0, cover_color:"#7c3aed" });
  const [editBookId,  setEditBookId]  = useState(null);
  const [showCardForm,setShowCardForm]= useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm,     setPayForm]     = useState({ name:"", amount:"" });
  const [activeNav,   setActiveNav]   = useState("Dashboard");
  const [editGoal,    setEditGoal]    = useState(null);
  const [baseBalance, setBaseBalance] = useState(14560.75);
  const [weatherLocName, setWeatherLocName] = useState("Alpharetta");
  const contentRef = useRef(null);
  const [editBalance, setEditBalance] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState("");

  const showToast = m => { setToast(m); setTimeout(()=>setToast(""),2400); };

  const loadAll = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const [{ data:t },{ data:g },{ data:tx },{ data:c },{ data:f },{ data:bks }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at",{ascending:true}),
      supabase.from("goals").select("*").order("created_at",{ascending:true}),
      supabase.from("transactions").select("*").order("type",{ascending:false}).limit(6),
      supabase.from("cards").select("*").order("created_at",{ascending:true}),
      supabase.from("fitness").select("*").eq("log_date",today).single(),
      supabase.from("books").select("*").order("created_at",{ascending:false}),
    ]);
    setTasks(t||[]); setGoals(g||[]); setTxns(tx||[]); setCards(c||[]);
    setFitnessLog(f || { steps:0, calories:0, water_oz:0, workouts:0, sleep_hrs:0, weight:0, tea_cups:0 });
    setBooks(bks||[]);
    // Load fitness goals from localStorage
    try{ const saved=localStorage.getItem("taskflow_fitness_goals"); if(saved) setFitnessGoals(JSON.parse(saved)); }catch(e){}
    setLoading({ tasks:false, goals:false, txns:false, cards:false });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const s1 = supabase.channel("t").on("postgres_changes",{event:"*",schema:"public",table:"tasks"},()=>supabase.from("tasks").select("*").order("created_at",{ascending:true}).then(({data})=>setTasks(data||[]))).subscribe();
    const s2 = supabase.channel("g").on("postgres_changes",{event:"*",schema:"public",table:"goals"},()=>supabase.from("goals").select("*").order("created_at",{ascending:true}).then(({data})=>setGoals(data||[]))).subscribe();
    const s3 = supabase.channel("tx").on("postgres_changes",{event:"*",schema:"public",table:"transactions"},()=>supabase.from("transactions").select("*").order("type",{ascending:false}).limit(6).then(({data})=>setTxns(data||[]))).subscribe();
    const s4 = supabase.channel("c").on("postgres_changes",{event:"*",schema:"public",table:"cards"},()=>supabase.from("cards").select("*").order("created_at",{ascending:true}).then(({data})=>setCards(data||[]))).subscribe();
    return () => { supabase.removeChannel(s1); supabase.removeChannel(s2); supabase.removeChannel(s3); supabase.removeChannel(s4); };
  }, []);

  const toggleTask  = async(task) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const newDone = !task.done;
    setTasks(ts=>ts.map(t=>t.id===task.id?{...t,done:newDone,completed_date:newDone?dateStr:null}:t));
    await supabase.from("tasks").update({ done:newDone, completed_date:newDone?dateStr:null }).eq("id",task.id);
  };
  const addTask     = async() => { if(!newTask.trim()) return; setSaving(true); const{data}=await supabase.from("tasks").insert({text:newTask.trim(),done:false,priority:"medium"}).select().single(); if(data) setTasks(ts=>[...ts,data]); setNewTask(""); setSaving(false); showToast("Task added ✓"); };
  const deleteTask  = async(id) => { setTasks(ts=>ts.filter(t=>t.id!==id)); await supabase.from("tasks").delete().eq("id",id); showToast("Task removed"); };
  const saveGoal    = async(goal,pct) => { setGoals(gs=>gs.map(g=>g.id===goal.id?{...g,progress:pct}:g)); await supabase.from("goals").update({progress:pct}).eq("id",goal.id); setEditGoal(null); showToast("Goal updated ✓"); };
  const addGoal     = async() => { if(!newGoal.text.trim()) return; setSaving(true); const{data}=await supabase.from("goals").insert({text:newGoal.text,progress:newGoal.progress,color:newGoal.color}).select().single(); if(data) setGoals(gs=>[...gs,data]); setNewGoal({text:"",progress:0,color:"#7c3aed"}); setShowGoalForm(false); setSaving(false); showToast("Goal added ✓"); };
  const deleteGoal  = async(id) => { setGoals(gs=>gs.filter(g=>g.id!==id)); await supabase.from("goals").delete().eq("id",id); showToast("Goal removed"); };
  const addTxn      = async() => { if(!newTxn.name.trim()||!newTxn.amount) return; setSaving(true); const amt=newTxn.type==="expense"?-Math.abs(parseFloat(newTxn.amount)):Math.abs(parseFloat(newTxn.amount)); const{data}=await supabase.from("transactions").insert({name:newTxn.name,amount:amt,icon:newTxn.icon,date_label:"Just now",type:newTxn.type}).select().single(); if(data) setTxns(tx=>[data,...tx.slice(0,5)]); setNewTxn({name:"",amount:"",type:"expense",icon:"💳"}); setShowTxnForm(false); setSaving(false); showToast("Transaction saved ✓"); };
  const addCard     = async() => { if(!newCard.name.trim()||!newCard.number.trim()) return; setSaving(true); const{data}=await supabase.from("cards").insert({name:newCard.name,number:newCard.number,balance:parseFloat(newCard.balance)||0,type:newCard.type,color:newCard.color,spend_limit:parseFloat(newCard.spendLimit)||0,spent:0}).select().single(); if(data) setCards(c=>[...c,data]); setNewCard({name:"",number:"",balance:"",type:"visa",color:T.accent,spendLimit:""}); setShowCardForm(false); setSaving(false); showToast("Card added ✓"); };
  const deleteCard  = async(id) => { setCards(c=>c.filter(x=>x.id!==id)); await supabase.from("cards").delete().eq("id",id); showToast("Card removed"); };

  const done     = tasks.filter(t=>t.done).length;
  const pct      = tasks.length?Math.round((done/tasks.length)*100):0;
  const income   = txns.filter(t=>t.type==="income").reduce((a,t)=>a+Math.abs(parseFloat(t.amount)),0);
  const expenses = txns.filter(t=>t.type==="expense").reduce((a,t)=>a+Math.abs(parseFloat(t.amount)),0);
  const balance  = baseBalance+income-expenses;
  const pColor   = p=>p==="high"?T.red:p==="medium"?T.yellow:T.faint;
  const activeCard = cards[selectedCard] || null;

  return (
    <div className="tf-app" style={{ background:T.bg, fontFamily:"'Plus Jakarta Sans',sans-serif", color:T.text, fontSize:13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@1,300;1,400&display=swap');        *{box-sizing:border-box;margin:0;padding:0;scrollbar-width:thin;scrollbar-color:#2a2a4a transparent}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#2a2a4a;border-radius:2px}
        html,body,#root{height:100%;width:100%}
        input,select,button,textarea{font-family:'Plus Jakarta Sans',sans-serif}
        input::placeholder{color:#3a3a5a}input:focus,select:focus{outline:none}
        button{cursor:pointer;border:none;outline:none}
        .nb:hover{background:rgba(124,58,237,0.12)!important}
        .task-row:hover{background:rgba(124,58,237,0.06)!important}
        .task-row:hover .del{opacity:1!important}
        .txn-row:hover{background:rgba(255,255,255,0.03)!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .tf-app{display:flex;height:100vh;overflow:hidden}
        .tf-sidebar{width:218px;flex-shrink:0;transition:transform 0.25s ease,width 0.25s ease}
        .tf-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .tf-content{flex:1;overflow-y:auto;padding:18px 22px 32px}
        .tf-row1{display:grid;grid-template-columns:1fr 220px 1fr 280px;gap:14px;align-items:stretch}
        .tf-row2{display:grid;grid-template-columns:1.1fr 0.9fr 0.8fr 0.8fr 0.9fr;gap:14px}
        .tf-hamburger{display:none;background:#12122c;border:1px solid #252548;color:#6b6b9a;width:34px;height:34px;border-radius:8px;font-size:16px;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
        .tf-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:199}
        @media(max-width:1280px){
          .tf-row2{grid-template-columns:repeat(3,1fr)}
        }
        @media(max-width:1100px){
          .tf-sidebar{position:fixed;top:0;left:0;height:100vh;z-index:200;transform:translateX(-100%)}
          .tf-sidebar.open{transform:translateX(0)}
          .tf-row1{grid-template-columns:1fr 1fr}
          .tf-row2{grid-template-columns:repeat(2,1fr)}
          .tf-hamburger{display:flex}
          .tf-content{padding:14px 16px 28px}
          .tf-overlay.open{display:block}
        }
        @media(max-width:768px){
          .tf-row1{grid-template-columns:1fr}
          .tf-row2{grid-template-columns:1fr}
          .tf-content{padding:10px 12px 24px}
          .tf-quote{display:none}
          .tf-header{flex-direction:column;align-items:flex-start;gap:8px}
        }
        @media(min-width:1600px){
          .tf-content{padding:20px 28px 36px}
        }to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        .fu{animation:fadeUp 0.3s ease}
        .pulse{animation:pulse 2s infinite}
      `}</style>

      {toast&&<div style={{ position:"fixed",top:18,right:18,zIndex:9999,
        background:`linear-gradient(135deg,${T.accent},${T.pink})`,color:"white",
        padding:"9px 18px",borderRadius:10,fontSize:13,fontWeight:700,
        boxShadow:`0 4px 24px ${T.accentGlow}`,animation:"toastIn 0.28s ease" }}>{toast}</div>}

      {/* SIDEBAR — Reading Tracker */}
      <div className={`tf-sidebar${sidebarOpen?" open":""}`} style={{ background:T.surface, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", padding:"20px 13px", gap:10, overflowY:"auto", boxShadow:sidebarOpen?`4px 0 20px rgba(0,0,0,0.5)`:undefined }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 8px", marginBottom:4 }}>
          <div style={{ width:34, height:34, borderRadius:10, overflow:"hidden", border:`1.5px solid ${T.accent}`, boxShadow:`0 0 16px ${T.accentGlow}`, flexShrink:0 }}>
            <img src="https://i.imgur.com/AWWs5jM.png" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          </div>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:"2px" }}>TaskFlow</span>
          <div className="pulse" style={{ width:6, height:6, borderRadius:"50%", background:T.green, marginLeft:"auto", boxShadow:`0 0 6px ${T.green}` }} />
          {isCompact&&<button onClick={()=>setSidebarOpen(false)} style={{ background:T.faint, border:"none", color:T.muted, width:24, height:24, borderRadius:6, fontSize:14, cursor:"pointer", marginLeft:4 }}>✕</button>}
        </div>

        {/* Reading Tracker Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>📚 Reading</div>
          <button onClick={()=>setShowBookForm(!showBookForm)} style={{ fontSize:10, padding:"3px 8px", borderRadius:6, fontWeight:700,
            background:showBookForm?T.accentDim:`linear-gradient(135deg,${T.accent},${T.accentB})`,
            border:showBookForm?`1px solid ${T.accent}44`:"none", color:showBookForm?T.accentLight:"white" }}>
            {showBookForm?"✕":"+ Add"}
          </button>
        </div>

        {/* Add Book Form */}
        {showBookForm&&(
          <div className="fu" style={{ background:T.accentDim, border:`1px solid ${T.accent}33`, borderRadius:10, padding:10 }}>
            <input value={newBook.title} onChange={e=>setNewBook({...newBook,title:e.target.value})}
              placeholder="Book title" style={{ width:"100%", background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"6px 8px", color:T.text, fontSize:11, marginBottom:6 }} />
            <input value={newBook.author} onChange={e=>setNewBook({...newBook,author:e.target.value})}
              placeholder="Author" style={{ width:"100%", background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"6px 8px", color:T.text, fontSize:11, marginBottom:6 }} />
            <input value={newBook.cover_image||""} onChange={e=>setNewBook({...newBook,cover_image:e.target.value})}
              placeholder="Cover image URL (optional)" style={{ width:"100%", background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"6px 8px", color:T.text, fontSize:11, marginBottom:6 }} />
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:6 }}>
              <input type="number" value={newBook.pages_total} onChange={e=>setNewBook({...newBook,pages_total:parseInt(e.target.value)||0})}
                placeholder="Total pages" style={{ width:"100%", background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"6px 8px", color:T.text, fontSize:11 }} />
              <input type="number" value={newBook.pages_read} onChange={e=>setNewBook({...newBook,pages_read:parseInt(e.target.value)||0})}
                placeholder="Pages read so far" style={{ width:"100%", background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"6px 8px", color:T.text, fontSize:11 }} />
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <select value={newBook.cover_color} onChange={e=>setNewBook({...newBook,cover_color:e.target.value})}
                style={{ flex:1, background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"6px 8px", color:T.text, fontSize:11 }}>
                <option value="#7c3aed">🟣 Purple</option>
                <option value="#10b981">🟢 Green</option>
                <option value="#f59e0b">🟡 Yellow</option>
                <option value="#ec4899">🩷 Pink</option>
                <option value="#3b82f6">🔵 Blue</option>
                <option value="#ef4444">🔴 Red</option>
              </select>
              <button onClick={async()=>{
                if(!newBook.title.trim()) return;
                setSaving(true);
                const {data} = await supabase.from("books").insert({...newBook}).select().single();
                if(data) setBooks(b=>[data,...b]);
                setNewBook({title:"",author:"",pages_total:0,pages_read:0,cover_color:"#7c3aed"});
                setShowBookForm(false); setSaving(false); showToast("Book added ✓");
              }} disabled={saving} style={{ padding:"6px 10px", background:`linear-gradient(135deg,${T.accent},${T.accentB})`, borderRadius:7, color:"white", fontSize:11, fontWeight:700, opacity:saving?0.6:1 }}>Save</button>
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
          {[
            { l:"Reading", v:books.filter(b=>b.status==="reading").length, c:T.accent },
            { l:"Done",    v:books.filter(b=>b.status==="done").length,    c:T.green },
            { l:"Total",   v:books.length,                                  c:T.muted },
          ].map(s=>(
            <div key={s.l} style={{ textAlign:"center", padding:"7px 4px", borderRadius:9, background:T.raised, border:`1px solid ${T.border2}` }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:s.c, lineHeight:1 }}>{s.v}</div>
              <div style={{ fontSize:9, color:T.muted, marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Book list */}
        <div style={{ display:"flex", flexDirection:"column", gap:8, flex:1 }}>
          {books.length===0&&(
            <div style={{ textAlign:"center", padding:"20px 0", color:T.muted, fontSize:11 }}>
              <div style={{ fontSize:28, marginBottom:8 }}>📖</div>
              Add your first book!
            </div>
          )}
          {books.map(b=>{
            const pct = b.pages_total>0 ? Math.min(Math.round((b.pages_read/b.pages_total)*100),100) : 0;
            const isDone = b.status==="done";
            return (
              <div key={b.id} style={{ background:T.raised, borderRadius:11, padding:"10px 11px", border:`1px solid ${T.border2}`, position:"relative" }}
                onMouseEnter={e=>e.currentTarget.querySelector(".book-del").style.opacity="1"}
                onMouseLeave={e=>e.currentTarget.querySelector(".book-del").style.opacity="0"}>
                <div style={{ display:"flex", gap:9, alignItems:"flex-start" }}>
                  {/* Book cover image or colored spine */}
                  {b.cover_image ? (
                    <div style={{ width:44, height:60, borderRadius:5, overflow:"hidden", flexShrink:0, boxShadow:`0 4px 12px rgba(0,0,0,0.4)`, border:`1px solid ${T.border2}` }}>
                      <img src={b.cover_image} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt={b.title}
                        onError={e=>{ e.target.style.display="none"; e.target.parentNode.style.background=b.cover_color; }} />
                    </div>
                  ) : (
                    <div style={{ width:10, flexShrink:0, alignSelf:"stretch", borderRadius:3, background:b.cover_color, boxShadow:`0 0 8px ${b.cover_color}66`, minHeight:40 }} />
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:isDone?T.muted:T.text, textDecoration:isDone?"line-through":"none",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>{b.title}</div>
                    {b.author&&<div style={{ fontSize:10, color:T.muted, marginBottom:6 }}>{b.author}</div>}
                    {/* Progress bar */}
                    <div style={{ height:4, background:T.faint, borderRadius:4, overflow:"hidden", marginBottom:4 }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:b.cover_color, borderRadius:4, transition:"width 0.5s" }} />
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontSize:9, color:T.muted }}>{b.pages_read} / {b.pages_total} pages</span>
                      <span style={{ fontSize:9, fontWeight:700, color:b.cover_color }}>{pct}%</span>
                    </div>

                    {/* Edit mode toggle */}
                    {editBookId===b.id ? (
                      <div className="fu">
                        <div style={{ fontSize:9, color:T.muted, marginBottom:4, fontWeight:600 }}>EDIT BOOK</div>
                        <input defaultValue={b.title} id={`edit-title-${b.id}`}
                          placeholder="Title" style={{ width:"100%", background:T.card, border:`1px solid ${T.border2}`, borderRadius:6, padding:"5px 7px", color:T.text, fontSize:10, marginBottom:4 }} />
                        <input defaultValue={b.author} id={`edit-author-${b.id}`}
                          placeholder="Author" style={{ width:"100%", background:T.card, border:`1px solid ${T.border2}`, borderRadius:6, padding:"5px 7px", color:T.text, fontSize:10, marginBottom:4 }} />
                        <input defaultValue={b.cover_image||""} id={`edit-img-${b.id}`}
                          placeholder="Cover image URL" style={{ width:"100%", background:T.card, border:`1px solid ${T.border2}`, borderRadius:6, padding:"5px 7px", color:T.text, fontSize:10, marginBottom:4 }} />
                        <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:6 }}>
                          <div>
                            <div style={{ fontSize:9, color:T.muted, marginBottom:2 }}>Total Pages</div>
                            <input type="number" defaultValue={b.pages_total} id={`edit-total-${b.id}`}
                              style={{ width:"100%", background:T.card, border:`1px solid ${T.border2}`, borderRadius:6, padding:"5px 7px", color:T.text, fontSize:10 }} />
                          </div>
                          <div>
                            <div style={{ fontSize:9, color:T.muted, marginBottom:2 }}>Current Page</div>
                            <input type="number" defaultValue={b.pages_read} id={`edit-read-${b.id}`}
                              style={{ width:"100%", background:T.card, border:`1px solid ${T.border2}`, borderRadius:6, padding:"5px 7px", color:T.text, fontSize:10 }} />
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={()=>setEditBookId(null)}
                            style={{ flex:1, padding:"5px", background:T.faint, borderRadius:6, color:T.muted, fontSize:10, border:"none" }}>Cancel</button>
                          <button onClick={async()=>{
                            const title  = document.getElementById(`edit-title-${b.id}`).value;
                            const author = document.getElementById(`edit-author-${b.id}`).value;
                            const img    = document.getElementById(`edit-img-${b.id}`).value;
                            const total  = parseInt(document.getElementById(`edit-total-${b.id}`).value)||0;
                            const read   = parseInt(document.getElementById(`edit-read-${b.id}`).value)||0;
                            const newStatus = read >= total && total > 0 ? "done" : "reading";
                            const updated = { title, author, cover_image:img, pages_total:total, pages_read:read, status:newStatus };
                            setBooks(bs=>bs.map(x=>x.id===b.id?{...x,...updated}:x));
                            await supabase.from("books").update(updated).eq("id",b.id);
                            setEditBookId(null); showToast("Book updated ✓");
                          }} style={{ flex:2, padding:"5px", background:`linear-gradient(135deg,${T.accent},${T.accentB})`, borderRadius:6, color:"white", fontSize:10, fontWeight:700, border:"none" }}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <div>
                          <div style={{ fontSize:9, color:T.muted, marginBottom:2 }}>Current Page</div>
                          <input type="number" defaultValue={b.pages_read}
                            onBlur={async e=>{
                              const val = parseInt(e.target.value)||0;
                              const newStatus = val >= b.pages_total && b.pages_total > 0 ? "done" : "reading";
                              setBooks(bs=>bs.map(x=>x.id===b.id?{...x,pages_read:val,status:newStatus}:x));
                              await supabase.from("books").update({pages_read:val,status:newStatus}).eq("id",b.id);
                              showToast("Progress updated ✓");
                            }}
                            style={{ width:"100%", background:T.card, border:`1px solid ${T.border2}`, borderRadius:6, padding:"4px 6px", color:T.text, fontSize:10, textAlign:"center" }} />
                        </div>
                        <div style={{ fontSize:9, color:T.muted }}>of {b.pages_total} total pages</div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Edit + Delete buttons */}
                <div style={{ position:"absolute", top:6, right:6, display:"flex", gap:4 }}>
                  <button className="book-del" onClick={()=>setEditBookId(editBookId===b.id?null:b.id)}
                    style={{ background:T.accentDim, border:`1px solid ${T.accent}44`, color:T.accentLight, fontSize:10, opacity:0, transition:"opacity 0.15s", padding:"2px 6px", borderRadius:4 }}>✎</button>
                  <button className="book-del" onClick={async()=>{
                    setBooks(bs=>bs.filter(x=>x.id!==b.id));
                    await supabase.from("books").delete().eq("id",b.id);
                    showToast("Book removed");
                  }} style={{ background:"none", color:T.red, fontSize:13, opacity:0, transition:"opacity 0.15s", padding:"2px 4px", borderRadius:4 }}>×</button>
                </div>
              </div>
            );
          })}
        </div>


        {/* Divider */}
        <div style={{ height:1, background:T.border2, margin:"4px 0" }} />

        {/* Mood Tracker */}
        {(()=>{
          const moods = [
            { score:1, emoji:"😞", label:"Rough",   color:"#ef4444" },
            { score:2, emoji:"😕", label:"Meh",     color:"#f97316" },
            { score:3, emoji:"😐", label:"Okay",    color:"#f59e0b" },
            { score:4, emoji:"😊", label:"Good",    color:"#10b981" },
            { score:5, emoji:"🤩", label:"Amazing", color:"#7c3aed" },
          ];
          const today = new Date().toISOString().split("T")[0];
          const [todayMood, setTodayMood] = React.useState(null);
          const [moodNote,  setMoodNote]  = React.useState("");
          const [moodHistory, setMoodHistory] = React.useState([]);
          const [savingMood, setSavingMood] = React.useState(false);

          React.useEffect(()=>{
            supabase.from("mood").select("*").eq("log_date",today).single()
              .then(({data})=>{ if(data){ setTodayMood(data.mood_score); setMoodNote(data.note||""); } });
            supabase.from("mood").select("*").order("log_date",{ascending:false}).limit(7)
              .then(({data})=>setMoodHistory(data||[]));
          },[]);

          const saveMood = async(score) => {
            setSavingMood(true);
            setTodayMood(score);
            await supabase.from("mood").upsert({ log_date:today, mood_score:score, note:moodNote },{ onConflict:"log_date" });
            setSavingMood(false);
          };

          const selected = moods.find(m=>m.score===todayMood);

          return (
            <div style={{ padding:"12px", borderRadius:12, background:T.raised, border:`1px solid ${T.border2}` }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>
                💭 Mood Today
              </div>

              {/* Mood emoji buttons */}
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                {moods.map(m=>(
                  <button key={m.score} onClick={()=>saveMood(m.score)}
                    style={{ background:todayMood===m.score?m.color+"22":"transparent",
                      border:`1.5px solid ${todayMood===m.score?m.color:T.border2}`,
                      borderRadius:10, padding:"6px 4px", cursor:"pointer", flex:1, margin:"0 2px",
                      display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                      transform:todayMood===m.score?"scale(1.1)":"scale(1)", transition:"all 0.2s",
                      boxShadow:todayMood===m.score?`0 0 10px ${m.color}55`:"none" }}>
                    <span style={{ fontSize:18 }}>{m.emoji}</span>
                    <span style={{ fontSize:8, color:todayMood===m.score?m.color:T.muted, fontWeight:600 }}>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Note input */}
              {todayMood&&(
                <div style={{ marginBottom:8 }}>
                  <input value={moodNote} onChange={e=>setMoodNote(e.target.value)}
                    onBlur={()=>saveMood(todayMood)}
                    placeholder="Add a note... (optional)"
                    style={{ width:"100%", background:T.card, border:`1px solid ${T.border2}`, borderRadius:7,
                      padding:"6px 9px", color:T.text, fontSize:10 }} />
                </div>
              )}

              {/* Today's mood summary */}
              {selected&&(
                <div style={{ padding:"7px 10px", borderRadius:8, background:selected.color+"18",
                  border:`1px solid ${selected.color}33`, display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                  <span style={{ fontSize:16 }}>{selected.emoji}</span>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:selected.color }}>Feeling {selected.label}</div>
                    <div style={{ fontSize:9, color:T.muted }}>Today · {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                  </div>
                </div>
              )}

              {/* 7-day mood history */}
              {moodHistory.length>0&&(
                <div>
                  <div style={{ fontSize:9, color:T.muted, marginBottom:5, fontWeight:600 }}>LAST 7 DAYS</div>
                  <div style={{ display:"flex", gap:3, alignItems:"flex-end" }}>
                    {moodHistory.slice(0,7).reverse().map((m,i)=>{
                      const mo = moods.find(x=>x.score===m.mood_score);
                      return (
                        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                          <div style={{ width:"100%", height:`${m.mood_score*8}px`, borderRadius:3,
                            background:mo?.color||T.faint, opacity:0.8, transition:"height 0.3s" }} />
                          <span style={{ fontSize:8, color:T.muted }}>
                            {new Date(m.log_date+"T12:00:00").toLocaleDateString("en-US",{weekday:"narrow"})}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Profile */}
        <div style={{ padding:"12px 10px", borderRadius:12, background:T.raised, border:`1px solid ${T.border2}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", overflow:"hidden", border:`2px solid ${T.accent}`, flexShrink:0 }}>
              <img src="https://i.imgur.com/AWWs5jM.png" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            </div>
            <div><div style={{ fontSize:13, fontWeight:700 }}>Marty Dickerson</div><div style={{ fontSize:10, color:T.muted }}>Premium</div></div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div className="pulse" style={{ width:5, height:5, borderRadius:"50%", background:T.green }} />
            <span style={{ fontSize:10, color:T.green }}>Live · Supabase</span>
          </div>
        </div>
      </div>

      <div className={`tf-overlay${sidebarOpen?" open":""}`} onClick={()=>setSidebarOpen(false)}/>
      {/* MAIN */}
      <div className="tf-main">

        {/* Header */}
        <div className="tf-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 22px", borderBottom:`1px solid ${T.border}`, flexShrink:0, background:`linear-gradient(135deg,${T.surface},#11112a)`, gap:12 }}>
          <div>
            {/* Greeting */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:"2px", lineHeight:1, background:`linear-gradient(135deg,${T.text},${T.accentLight})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              {(()=>{ const h=new Date().getHours(); return h<12?"Good Morning,":h<17?"Good Afternoon,":"Good Evening,"; })()} <span style={{ fontWeight:800, fontSize:28, letterSpacing:"1px" }}>Marty</span>! {(()=>{ const h=new Date().getHours(); return h<12?"☀️":h<17?"🌤️":"🌙"; })()}
              </div>
            </div>
            <div style={{ fontSize:11, color:T.muted }}>
              {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
            </div>
          </div>

          {/* Hamburger menu on compact */}
          <button className="tf-hamburger" onClick={()=>setSidebarOpen(o=>!o)}>☰</button>
          {/* Daily quote */}
          <div className="tf-quote" style={{ maxWidth:420, padding:"10px 16px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accent}33`, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:20, flexShrink:0 }}>💬</div>
            <div>
              <div style={{ fontSize:11, color:T.text, fontStyle:"italic", lineHeight:1.5 }}>
                "{[
                  "The secret of getting ahead is getting started.",
                  "Small steps every day lead to big results.",
                  "It always seems impossible until it's done.",
                  "Don't watch the clock. Do what it does — keep going.",
                  "Success is the sum of small efforts repeated daily.",
                  "Push yourself, because no one else will do it for you.",
                  "Great things never come from comfort zones.",
                ][new Date().getDay()]}"
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="tf-content" style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* ── ROW 1: Weekly | Weather | My Cards ── */}
          <div className="tf-row1" style={{ alignItems:"stretch" }}>

            {/* Weekly Bar */}
            <div style={{ background:`linear-gradient(145deg,#14143a,${T.surface})`, borderRadius:14, padding:"16px 18px", border:`1px solid ${T.accent}44`, boxShadow:`0 0 20px ${T.accentGlow}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:10, color:T.accentLight, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Weekly Activity</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:"1px", color:T.text }}>{done} of {tasks.length} Tasks Done</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                  <Pill color={T.green}>{pct}% complete</Pill>
                  <div style={{ fontSize:11, color:T.muted }}>{tasks.filter(t=>!t.done).length} remaining</div>
                </div>
              </div>
              {(()=>{
                const dayNames=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
                const todayIdx=0;

                // Build week dates starting Mon May 18
                const weekDates = dayNames.map((_,i)=>{
                  const d = new Date(2026,4,18);
                  d.setDate(d.getDate()+i);
                  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                });

                const weekBars = dayNames.map((day,i)=>{
                  const dayTasks = tasks.filter(t=>t.completed_date===weekDates[i]);
                  return { day, done:dayTasks.length, isToday:i===todayIdx, taskNames:dayTasks.map(t=>t.text) };
                });

                return (
                  <div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={weekBars} barSize={22} margin={{top:4,right:4,left:-20,bottom:0}}>
                        <XAxis dataKey="day" tick={{fill:"#8b8bcc",fontSize:12,fontWeight:600}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:"#6b6b9a",fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                        <Tooltip content={<CustomTip/>} cursor={{fill:"rgba(124,58,237,0.08)"}}/>
                        <Bar dataKey="done" radius={[5,5,0,0]}>
                          {weekBars.map((e,i)=><Cell key={i} fill={e.isToday?T.accent:e.done>0?T.accent+"66":T.faint}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Per-day task summary */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5, marginTop:8 }}>
                      {weekBars.map((d,i)=>(
                        <div key={i} style={{ padding:"8px 5px", borderRadius:9, minHeight:80,
                          background: d.isToday ? T.accentDim : d.done>0 ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)",
                          border:`1px solid ${d.isToday?T.accent+"44":d.done>0?"rgba(124,58,237,0.18)":T.border}` }}>
                          {d.done > 0 ? (
                            <>
                              <div style={{ fontSize:10, fontWeight:700, color:d.isToday?T.accentLight:T.muted,
                                textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>
                                {d.done} task{d.done!==1?"s":""}
                              </div>
                              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                {d.taskNames.slice(0,3).map((name,j)=>(
                                  <div key={j} style={{ display:"flex", alignItems:"flex-start", gap:4 }}>
                                    <div style={{ width:4, height:4, borderRadius:"50%", background:d.isToday?T.accentLight:T.accent+"88", marginTop:3, flexShrink:0 }} />
                                    <div style={{ fontSize:9.5, color:d.isToday?T.text:"rgba(255,255,255,0.6)", lineHeight:1.4,
                                      overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                                      {name}
                                    </div>
                                  </div>
                                ))}
                                {d.taskNames.length > 3 && (
                                  <div style={{ fontSize:8, color:T.muted, marginTop:1 }}>+{d.taskNames.length-3} more</div>
                                )}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize:9, color:T.faint, textAlign:"center", marginTop:8 }}>
                              {i < todayIdx ? "None" : i===todayIdx ? "No tasks\ncomplete" : "—"}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Weekly streak */}
                    {(()=>{
                      const streak = weekBars.filter((d,i)=>i<=todayIdx&&d.done>0).length;
                      const streakMsg = streak===0?"Start your streak today! 💪"
                        :streak===1?"1 day streak — great start! 🔥"
                        :streak===2?"2 day streak — keep it up! 🔥"
                        :streak===3?"3 day streak — you're on fire! 🔥"
                        :streak>=4?`${streak} day streak — unstoppable! 🔥🔥`:"";
                      return (
                        <div style={{ marginTop:10, padding:"10px 14px", borderRadius:10,
                          background:streak>0?`linear-gradient(135deg,rgba(124,58,237,0.15),rgba(236,72,153,0.08))`:"rgba(255,255,255,0.02)",
                          border:`1px solid ${streak>0?T.accent+"33":T.border}`,
                          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:streak>0?T.accent:T.faint, lineHeight:1 }}>{streak}</div>
                            <div>
                              <div style={{ fontSize:11, fontWeight:700, color:streak>0?T.text:T.muted }}>Day Streak</div>
                              <div style={{ fontSize:10, color:T.muted }}>This week</div>
                            </div>
                          </div>
                          <div style={{ fontSize:11, color:streak>0?T.accentLight:T.muted, fontStyle:"italic", textAlign:"right", maxWidth:160 }}>
                            {streakMsg}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>

            {/* Focus Timer */}
            <PomodoroTimer />

            {/* Weather */}
            <div style={{ background:`linear-gradient(145deg,#14143a,${T.surface})`, borderRadius:14, padding:"14px 16px", border:`1px solid ${T.accent}33`, overflow:"hidden", boxShadow:`0 0 20px ${T.accentGlow}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:9, color:T.accentLight, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>Weather · {weatherLocName}</div>
                <Pill color={T.yellow}>Live</Pill>
              </div>
              <WeatherWidget compact onLocChange={name=>setWeatherLocName(name)} />
            </div>

            {/* MY CARDS */}
            <div style={{ background:"linear-gradient(160deg,#c2410c 0%,#9333ea 55%,#1e1b4b 100%)", borderRadius:14, padding:"16px 18px", border:`1px solid rgba(147,51,234,0.3)`, display:"flex", flexDirection:"column", gap:10, boxShadow:`0 8px 32px rgba(147,51,234,0.3)` }}>

              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.8)", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>My Cards</div>
                <button onClick={()=>setShowCardForm(!showCardForm)} style={{ fontSize:11, padding:"3px 10px", borderRadius:7, fontWeight:700, background:"rgba(255,255,255,0.15)", border:`1px solid rgba(255,255,255,0.3)`, color:"white" }}>
                  {showCardForm?"✕":"+ Add Card"}
                </button>
              </div>

              {/* Add Card Form */}
              {showCardForm&&(
                <div className="fu" style={{ background:"rgba(0,0,0,0.35)", border:`1px solid rgba(255,255,255,0.15)`, borderRadius:10, padding:11 }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <input value={newCard.name} onChange={e=>setNewCard({...newCard,name:e.target.value})} placeholder="Card name"
                      style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, padding:"7px 9px", color:"white", fontSize:11 }} />
                    <input value={newCard.number} onChange={e=>setNewCard({...newCard,number:e.target.value})} placeholder="Last 4 digits"
                      style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, padding:"7px 9px", color:"white", fontSize:11 }} />
                    <input value={newCard.balance} onChange={e=>setNewCard({...newCard,balance:e.target.value})} placeholder="Balance" type="number"
                      style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, padding:"7px 9px", color:"white", fontSize:11 }} />
                    <input value={newCard.spendLimit||""} onChange={e=>setNewCard({...newCard,spendLimit:e.target.value})} placeholder="Spend limit" type="number"
                      style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, padding:"7px 9px", color:"white", fontSize:11 }} />
                    <div style={{ display:"flex", gap:6 }}>
                      <select value={newCard.color} onChange={e=>setNewCard({...newCard,color:e.target.value})}
                        style={{ flex:1, background:"rgba(0,0,0,0.4)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, padding:"7px 6px", color:"white", fontSize:11 }}>
                        <option value={T.accent}>Purple</option>
                        <option value={T.pink}>Pink</option>
                        <option value="#1e40af">Blue</option>
                        <option value="#065f46">Green</option>
                        <option value="#7c2d12">Red</option>
                      </select>
                      <button onClick={addCard} disabled={saving} style={{ padding:"7px 16px", background:"rgba(255,255,255,0.25)", borderRadius:7, color:"white", fontSize:12, fontWeight:700, border:"1px solid rgba(255,255,255,0.3)", opacity:saving?0.6:1 }}>Save</button>
                    </div>
                  </div>
                </div>
              )}

              {loading.cards?<Spinner/>:(
                <>
                  {cards.length===0&&<div style={{ textAlign:"center", color:"rgba(255,255,255,0.4)", fontSize:12, padding:"20px 0" }}>No cards yet</div>}
                  {cards.length>0&&(()=>{
                    const c = cards[selectedCard];
                    const spentPct = c.spend_limit>0 ? Math.min(Math.round((c.spent/c.spend_limit)*100),100) : 0;
                    return (
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {/* Card preview */}
                        <div style={{ borderRadius:14, overflow:"hidden", position:"relative",
                          background:`linear-gradient(135deg,${c.color||"#2d1b5e"}cc 0%, #1a1a3e 60%,#0d0d1e 100%)`,
                          border:"1px solid rgba(255,255,255,0.12)", boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
                          <div style={{ position:"absolute", top:-30, right:-30, width:100, height:100, borderRadius:"50%", background:"rgba(124,58,237,0.18)", pointerEvents:"none" }} />
                          <div style={{ padding:"14px", position:"relative", zIndex:1 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                              <div><CardLogo type={c.type||c.name} /></div>
                              <div style={{ width:32, height:22, borderRadius:4, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
                                  {[...Array(4)].map((_,k)=><div key={k} style={{ width:6,height:4,background:"rgba(255,255,255,0.35)",borderRadius:1 }}/>)}
                                </div>
                              </div>
                            </div>
                            <div style={{ fontFamily:"monospace", fontSize:12, letterSpacing:"3px", color:"rgba(255,255,255,0.6)", marginBottom:10 }}>•••• •••• •••• {c.number}</div>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                              <div>
                                <div style={{ fontSize:8, color:"rgba(255,255,255,0.4)", letterSpacing:1, marginBottom:2 }}>AVAILABLE BALANCE</div>
                                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"white", lineHeight:1 }}>${parseFloat(c.balance).toLocaleString("en-US",{minimumFractionDigits:2})}</div>
                                <div style={{ fontSize:10, color:T.green, marginTop:2 }}>▲ 4.12%</div>
                              </div>
                              <div style={{ textAlign:"right" }}>
                                <div style={{ fontSize:8, color:"rgba(255,255,255,0.4)", marginBottom:1 }}>Card Holder</div>
                                <div style={{ fontSize:11, fontWeight:600, color:"white" }}>Marty Dickerson</div>
                                <div style={{ fontFamily:"serif", fontStyle:"italic", fontWeight:900, fontSize:14, color:"rgba(255,255,255,0.7)", letterSpacing:"-0.5px", marginTop:2 }}>VISA</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card nav */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <button onClick={()=>setSelectedCard(i=>(i-1+cards.length)%cards.length)}
                            style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"white", width:28, height:28, borderRadius:8, fontSize:16, cursor:"pointer", fontWeight:700 }}>‹</button>
                          <div style={{ display:"flex", gap:5 }}>
                            {cards.map((_,i)=><div key={i} onClick={()=>setSelectedCard(i)}
                              style={{ width:i===selectedCard?14:5, height:5, borderRadius:3, background:i===selectedCard?"white":"rgba(255,255,255,0.3)", cursor:"pointer", transition:"all 0.2s" }} />)}
                          </div>
                          <button onClick={()=>setSelectedCard(i=>(i+1)%cards.length)}
                            style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"white", width:28, height:28, borderRadius:8, fontSize:16, cursor:"pointer", fontWeight:700 }}>›</button>
                        </div>

                        {/* Spend limit tracker */}
                        {c.spend_limit>0&&(
                          <div style={{ background:"rgba(0,0,0,0.25)", borderRadius:10, padding:"9px 12px", border:"1px solid rgba(255,255,255,0.1)" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                              <span style={{ fontSize:10, color:"rgba(255,255,255,0.6)" }}>Spend Limit</span>
                              <span style={{ fontSize:10, color:"white", fontWeight:700 }}>${(c.spent||0).toFixed(2)} / ${parseFloat(c.spend_limit).toLocaleString()}</span>
                            </div>
                            <div style={{ height:5, background:"rgba(255,255,255,0.1)", borderRadius:5, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${spentPct}%`, borderRadius:5, transition:"width 0.5s ease",
                                background: spentPct>80 ? `linear-gradient(90deg,${T.red},#ff8c00)` : `linear-gradient(90deg,${T.green},${T.accent})` }} />
                            </div>
                            <div style={{ fontSize:9, color: spentPct>80?"#ff8c00":T.green, marginTop:3, textAlign:"right" }}>
                              {spentPct}% used {spentPct>80?"⚠️":"✓"}
                            </div>
                          </div>
                        )}

                        {/* Quick Pay */}
                        {!showPayForm?(
                          <button onClick={()=>setShowPayForm(true)}
                            style={{ width:"100%", padding:"9px", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:9, color:"white", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                            💳 Quick Pay
                          </button>
                        ):(
                          <div className="fu" style={{ background:"rgba(0,0,0,0.35)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, padding:10 }}>
                            <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)", fontWeight:700, marginBottom:8 }}>Quick Pay — {c.name}</div>
                            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:6 }}>
                              <input value={payForm.name} onChange={e=>setPayForm({...payForm,name:e.target.value})} placeholder="Pay to / description"
                                style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:7, padding:"7px 9px", color:"white", fontSize:11 }} />
                              <input type="number" value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:e.target.value})} placeholder="Amount $"
                                style={{ width:"100%", background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:7, padding:"7px 9px", color:"white", fontSize:11 }} />
                            </div>
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>setShowPayForm(false)} style={{ flex:1, padding:"7px", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:7, color:"rgba(255,255,255,0.6)", fontSize:11 }}>Cancel</button>
                              <button disabled={saving} onClick={async()=>{
                                if(!payForm.name||!payForm.amount) return;
                                setSaving(true);
                                const amt = -Math.abs(parseFloat(payForm.amount));
                                const {data} = await supabase.from("transactions").insert({
                                  name:payForm.name, amount:amt, icon:"💳",
                                  date_label:"Just now", type:"expense", card_id:c.id
                                }).select().single();
                                if(data) setTxns(tx=>[data,...tx.slice(0,5)]);
                                // Update card spent
                                const newSpent = (parseFloat(c.spent)||0) + Math.abs(parseFloat(payForm.amount));
                                await supabase.from("cards").update({spent:newSpent}).eq("id",c.id);
                                setCards(cs=>cs.map(x=>x.id===c.id?{...x,spent:newSpent}:x));
                                setPayForm({name:"",amount:""});
                                setShowPayForm(false); setSaving(false);
                                showToast(`💳 Payment of $${Math.abs(amt).toFixed(2)} logged!`);
                              }} style={{ flex:2, padding:"7px", background:`linear-gradient(135deg,${T.accent},${T.accentB})`, border:"none", borderRadius:7, color:"white", fontSize:11, fontWeight:700, opacity:saving?0.6:1 }}>
                                Pay ${payForm.amount||"0.00"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Recent card transactions */}
                        {txns.filter(t=>t.card_id===c.id).length>0&&(
                          <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:10, padding:"9px 11px", border:"1px solid rgba(255,255,255,0.08)" }}>
                            <div style={{ fontSize:9, color:"rgba(255,255,255,0.5)", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>Recent on this card</div>
                            {txns.filter(t=>t.card_id===c.id).slice(0,3).map(t=>(
                              <div key={t.id} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                                <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>{t.name}</span>
                                <span style={{ fontSize:11, fontWeight:700, color:T.red }}>-${Math.abs(parseFloat(t.amount)).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Remove card */}
                        <button onClick={()=>deleteCard(c.id)}
                          style={{ width:"100%", padding:"8px", background:`linear-gradient(135deg,${T.red},#dc2626)`, border:"none", borderRadius:9, color:"white", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 14px rgba(239,68,68,0.3)` }}>
                          🗑 Remove Card
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

          </div>

          {/* ROW 2: Tasks | Goals | Calendar | Fitness | Finance */}
          <div className="tf-row2" style={{ minHeight:380 }}>

            {/* TO-DO */}
            <div id="section-tasks" style={{ background:T.surface, borderRadius:14, padding:"18px 18px", border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>To Do List</div>
                <Pill color={T.accent}>{tasks.filter(t=>!t.done).length} remaining</Pill>
              </div>
              <div style={{ display:"flex", gap:7, marginBottom:12 }}>
                <input id="newTaskInput" value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="Add task… Enter to save"
                  style={{ flex:1, background:T.raised, border:`1px solid ${T.border2}`, borderRadius:9, padding:"8px 12px", color:T.text, fontSize:12 }} />
                <button onClick={addTask} disabled={saving} style={{ padding:"8px 14px", background:`linear-gradient(135deg,${T.accent},${T.pink})`, borderRadius:9, color:"white", fontSize:16, fontWeight:900, boxShadow:`0 0 12px ${T.accentGlow}`, opacity:saving?0.6:1 }}>+</button>
              </div>
              {loading.tasks?<Spinner/>:(
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:3 }}>
                  {tasks.map(task=>(
                    <div key={task.id} className="task-row fu" style={{ display:"flex", alignItems:"center", padding:"8px 10px", borderRadius:9, cursor:"pointer", transition:"background 0.13s", background:task.done?"rgba(16,185,129,0.05)":"transparent", border:`1px solid ${task.done?"rgba(16,185,129,0.12)":"transparent"}` }}>
                      <div onClick={()=>toggleTask(task)} style={{ width:17, height:17, borderRadius:5, flexShrink:0, marginRight:9, border:`2px solid ${task.done?T.green:T.faint}`, background:task.done?T.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
                        {task.done&&<span style={{ fontSize:9, color:"white", lineHeight:1 }}>✓</span>}
                      </div>
                      <div style={{ width:6, height:6, borderRadius:2, background:pColor(task.priority), flexShrink:0, marginRight:8 }} />
                      <span onClick={()=>toggleTask(task)} style={{ fontSize:12.5, flex:1, textDecoration:task.done?"line-through":"none", color:task.done?T.muted:T.text }}>{task.text}</span>
                      <button className="del" onClick={()=>deleteTask(task.id)} style={{ background:"none", color:T.red, fontSize:15, padding:"0 4px", borderRadius:4, opacity:0, transition:"opacity 0.15s" }}>×</button>
                    </div>
                  ))}
                  {tasks.length===0&&<div style={{ textAlign:"center", color:T.muted, fontSize:12, padding:"20px 0" }}>No tasks — add one above!</div>}
                </div>
              )}
            </div>

            {/* GOALS */}
            <div id="section-goals" style={{ background:T.surface, borderRadius:14, padding:"18px 18px", border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>Weekly Goals</div>
                <button onClick={()=>setShowGoalForm(!showGoalForm)} style={{ fontSize:11, padding:"4px 10px", borderRadius:7, fontWeight:700,
                  background:showGoalForm?T.accentDim:`linear-gradient(135deg,${T.accent},${T.accentB})`,
                  border:showGoalForm?`1px solid ${T.accent}44`:"none",
                  color:showGoalForm?T.accentLight:"white" }}>
                  {showGoalForm?"✕":"+ Add"}
                </button>
              </div>

              {/* Add Goal Form */}
              {showGoalForm&&(
                <div className="fu" style={{ background:T.accentDim, border:`1px solid ${T.accent}33`, borderRadius:10, padding:11, marginBottom:12 }}>
                  <input value={newGoal.text} onChange={e=>setNewGoal({...newGoal,text:e.target.value})}
                    placeholder="Goal title e.g. Run 5K this week"
                    style={{ width:"100%", background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"7px 9px", color:T.text, fontSize:11, marginBottom:7 }} />
                  <div style={{ display:"flex", gap:6 }}>
                    <input type="number" value={newGoal.progress} onChange={e=>setNewGoal({...newGoal,progress:Math.min(100,Math.max(0,parseInt(e.target.value)||0))})}
                      placeholder="Starting %" min="0" max="100"
                      style={{ width:70, background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"7px 9px", color:T.text, fontSize:11 }} />
                    <select value={newGoal.color} onChange={e=>setNewGoal({...newGoal,color:e.target.value})}
                      style={{ flex:1, background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"7px 9px", color:T.text, fontSize:11 }}>
                      <option value="#7c3aed">🟣 Purple</option>
                      <option value="#10b981">🟢 Green</option>
                      <option value="#f59e0b">🟡 Yellow</option>
                      <option value="#ec4899">🩷 Pink</option>
                      <option value="#ef4444">🔴 Red</option>
                      <option value="#a78bfa">💜 Lavender</option>
                    </select>
                    <button onClick={addGoal} disabled={saving}
                      style={{ padding:"7px 14px", background:`linear-gradient(135deg,${T.accent},${T.pink})`, borderRadius:7,
                        color:"white", fontSize:12, fontWeight:700, opacity:saving?0.6:1 }}>Save</button>
                  </div>
                </div>
              )}
              {loading.goals?<Spinner/>:(
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16, padding:"12px 14px", background:T.raised, borderRadius:12, border:`1px solid ${T.border2}` }}>
                    <Ring pct={goals.length?Math.round(goals.reduce((a,g)=>a+g.progress,0)/goals.length):0} size={60} stroke={6} color={T.accent}
                      center={<div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:T.text }}>{goals.length?Math.round(goals.reduce((a,g)=>a+g.progress,0)/goals.length):0}%</div>}/>
                    <div><div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>Overall Progress</div><div style={{ fontSize:11, color:T.muted }}>{goals.filter(g=>g.progress>=100).length} of {goals.length} goals complete</div></div>
                  </div>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12, overflowY:"auto" }}>
                    {goals.map(g=>(
                      <div key={g.id}
                        onMouseEnter={e=>e.currentTarget.querySelector(".goal-actions").style.opacity="1"}
                        onMouseLeave={e=>e.currentTarget.querySelector(".goal-actions").style.opacity="0"}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, alignItems:"center" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}><div style={{ width:7, height:7, borderRadius:2, background:g.color, flexShrink:0 }}/><span style={{ fontSize:12, fontWeight:500 }}>{g.text}</span></div>
                          <div className="goal-actions" style={{ display:"flex", alignItems:"center", gap:6, opacity:0, transition:"opacity 0.15s" }}>
                            <span style={{ fontSize:12, fontWeight:700, color:g.color }}>{g.progress}%</span>
                            <button onClick={()=>setEditGoal({...g})} style={{ background:"none", fontSize:11, color:T.muted, padding:"1px 4px", borderRadius:4 }}
                              onMouseEnter={e=>e.target.style.color=T.accentLight} onMouseLeave={e=>e.target.style.color=T.muted}>✎</button>
                            <button onClick={()=>deleteGoal(g.id)} style={{ background:"none", fontSize:14, color:T.red, padding:"1px 3px", borderRadius:4, opacity:0.5 }}
                              onMouseEnter={e=>e.target.style.opacity="1"} onMouseLeave={e=>e.target.style.opacity="0.5"}>×</button>
                          </div>
                        </div>
                        <Bar2 pct={g.progress} color={g.color} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                    {(()=>{
                      const quotes=[
                        { q:"Small daily improvements lead to stunning results.", a:"Robin Sharma" },
                        { q:"The secret of getting ahead is getting started.", a:"Mark Twain" },
                        { q:"It always seems impossible until it's done.", a:"Nelson Mandela" },
                        { q:"Don't watch the clock; do what it does. Keep going.", a:"Sam Levenson" },
                        { q:"Success is the sum of small efforts repeated daily.", a:"Robert Collier" },
                        { q:"Push yourself, because no one else is going to do it for you.", a:"Unknown" },
                        { q:"Great things never come from comfort zones.", a:"Unknown" },
                      ];
                      const q = quotes[new Date().getDay()];
                      return (
                        <div style={{ padding:"10px 12px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accent}33`, position:"relative", overflow:"hidden" }}>
                          <div style={{ fontSize:18, color:T.accent, marginBottom:4, lineHeight:1 }}>"</div>
                          <div style={{ fontSize:11, color:T.text, lineHeight:1.6, fontStyle:"italic", marginBottom:6 }}>{q.q}</div>
                          <div style={{ fontSize:10, color:T.accentLight, fontWeight:600 }}>— {q.a}</div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* CALENDAR */}
            <div id="section-calendar" style={{ background:T.surface, borderRadius:14, padding:"18px 18px", border:`1px solid ${T.border}`, overflowY:"auto" }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", marginBottom:12 }}>Calendar</div>
              <Calendar />
            </div>

            {/* FITNESS TRACKER */}
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 18px", border:`1px solid ${T.border}`, display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>🏋️ Weekly Progress</div>
                <button onClick={async()=>{
                  if(!fitnessLog) return;
                  setSaving(true);
                  await supabase.from("fitness").upsert({...fitnessLog, log_date:new Date().toISOString().split("T")[0]});
                  setSaving(false); showToast("Fitness saved ✓");
                }} style={{ fontSize:11, padding:"5px 14px", borderRadius:8, fontWeight:700,
                  background:`linear-gradient(135deg,${T.green},#059669)`,
                  border:"none", color:"white", cursor:"pointer",
                  boxShadow:`0 4px 12px rgba(16,185,129,0.35)`,
                  opacity:saving?0.6:1, letterSpacing:"0.3px" }}>
                  💾 Save
                </button>
              </div>
              {!fitnessLog ? <Spinner/> : (()=>{
                const metrics = [
                  { key:"steps",     label:"Steps",    icon:"👟", unit:"steps", max:fitnessGoals.steps,    color:T.accent },
                  { key:"calories",  label:"Calories", icon:"🔥", unit:"kcal",  max:fitnessGoals.calories,  color:"#f97316" },
                  { key:"water_oz",  label:"Water",    icon:"💧", unit:"oz",    max:fitnessGoals.water_oz,  color:"#38bdf8" },
                  { key:"sleep_hrs", label:"Sleep",    icon:"😴", unit:"hrs",   max:fitnessGoals.sleep_hrs, color:"#a78bfa" },
                  { key:"tea_cups",  label:"Ginseng Tea", icon:"🍵", unit:"8oz", max:fitnessGoals.tea_cups||3, color:"#86efac" },
                ];
                const totalPct = Math.round(metrics.reduce((acc,m)=>acc+Math.min(((fitnessLog[m.key]||0)/m.max)*100,100),0)/metrics.length);
                const size=110, r=40, cx=55, cy=55, circ=2*Math.PI*r;
                let offset=0;
                const segments = metrics.map(m=>{
                  const pct=Math.min(((fitnessLog[m.key]||0)/m.max),1);
                  const dash=pct*(circ/metrics.length);
                  const gap=circ-dash;
                  const seg={color:m.color,dash,gap,offset,pct};
                  offset+=circ/metrics.length;
                  return seg;
                });
                return (
                  <div style={{ display:"flex", flexDirection:"column", gap:10, flex:1 }}>
                    {/* Top: donut + metric list */}
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      {/* Donut */}
                      <div style={{ position:"relative", flexShrink:0 }}>
                        <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.faint} strokeWidth={9}/>
                          {segments.map((s,i)=>(
                            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                              stroke={s.color} strokeWidth={9}
                              strokeDasharray={`${s.dash} ${s.gap}`}
                              strokeDashoffset={-s.offset}
                              strokeLinecap="round"/>
                          ))}
                        </svg>
                        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:T.text, lineHeight:1 }}>{totalPct}%</div>
                          <div style={{ fontSize:8, color:T.muted, textAlign:"center", lineHeight:1.3 }}>Goal<br/>Progress</div>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:7 }}>
                        {metrics.map(m=>{
                          const val=fitnessLog[m.key]||0;
                          const pct=Math.min(Math.round((val/m.max)*100),100);
                          return (
                            <div key={m.key}>
                              <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", alignItems:"center", gap:6, marginBottom:3 }}>
                                {/* Label */}
                                <div style={{ display:"flex", alignItems:"center", gap:5, minWidth:60 }}>
                                  <div style={{ width:7, height:7, borderRadius:"50%", background:m.color, flexShrink:0 }}/>
                                  <span style={{ fontSize:11, color:T.text, fontWeight:500 }}>{m.label}</span>
                                </div>
                                {/* Empty spacer */}
                                <div/>
                                {/* Value / Goal — right aligned */}
                                <div style={{ display:"flex", alignItems:"center", gap:2, justifyContent:"flex-end" }}>
                                  <input type="number" value={val}
                                    onChange={e=>setFitnessLog(f=>({...f,[m.key]:parseFloat(e.target.value)||0}))}
                                    style={{ width:44, textAlign:"right", background:"transparent", border:"none",
                                      color:T.text, fontSize:11, fontWeight:700, padding:0 }} />
                                  <span style={{ fontSize:9, color:T.faint }}>/</span>
                                  {editingGoal===m.key ? (
                                    <input type="number" defaultValue={m.max} autoFocus
                                      onBlur={e=>{ const v=parseInt(e.target.value)||m.max; const updated={...fitnessGoals,[m.key]:v}; setFitnessGoals(updated); setEditingGoal(null);
                                        try{ localStorage.setItem("taskflow_fitness_goals",JSON.stringify(updated)); }catch(e){}; }}
                                      onKeyDown={e=>{ if(e.key==="Enter") e.target.blur(); if(e.key==="Escape") setEditingGoal(null); }}
                                      style={{ width:40, textAlign:"left", background:T.accentDim, border:`1px solid ${T.accent}`, borderRadius:4, padding:"1px 4px", color:T.accentLight, fontSize:10, fontWeight:700 }} />
                                  ) : (
                                    <span onClick={()=>setEditingGoal(m.key)}
                                      style={{ fontSize:9, color:T.muted, cursor:"pointer", width:36, textAlign:"left" }}
                                      title="Click to edit goal">{m.max}</span>
                                  )}
                                </div>
                              </div>
                              <div style={{ height:3, background:T.faint, borderRadius:3, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:`${pct}%`, background:m.color, borderRadius:3, transition:"width 0.5s ease" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status message */}
                    <div style={{ padding:"7px 11px", borderRadius:9,
                      background:totalPct>=75?`rgba(16,185,129,0.12)`:totalPct>=40?T.accentDim:`rgba(239,68,68,0.08)`,
                      border:`1px solid ${totalPct>=75?T.green+"44":totalPct>=40?T.accent+"44":T.red+"33"}`,
                      display:"flex", alignItems:"center", gap:7 }}>
                      <span style={{ fontSize:13 }}>{totalPct>=75?"✅":totalPct>=40?"💪":"🎯"}</span>
                      <span style={{ fontSize:10, color:totalPct>=75?T.green:totalPct>=40?T.accentLight:T.muted, fontWeight:600, lineHeight:1.4 }}>
                        {totalPct>=75?"Great job! You're on track."
                          :totalPct>=40?"Good progress! Keep pushing."
                          :"Log your activity to track your goals!"}
                      </span>
                    </div>

                    {/* Motivation image */}
                    {(()=>{
                      const motivations=[
                        {img:"https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=400&q=80",quote:"Push harder than yesterday."},
                        {img:"https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80",quote:"Your body can do it."},
                        {img:"https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80",quote:"Sweat now. Shine later."},
                        {img:"https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400&q=80",quote:"No pain, no gain."},
                        {img:"https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80",quote:"Believe in yourself."},
                        {img:"https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400&q=80",quote:"The only bad workout is the one that didn't happen."},
                        {img:"https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&q=80",quote:"Make yourself proud."},
                      ];
                      const mv=motivations[new Date().getDay()];
                      return (
                        <div style={{ borderRadius:12, overflow:"hidden", position:"relative", flex:1, minHeight:90 }}>
                          <img src={mv.img} style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0, filter:"saturate(1.5) brightness(1.1)" }} alt="motivation"/>
                          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.85),rgba(0,0,0,0.05))", display:"flex", alignItems:"flex-end", padding:"12px 14px" }}>
                            <div style={{ fontSize:12, color:"white", fontWeight:700, lineHeight:1.5, fontStyle:"italic" }}>"{mv.quote}"</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>

            {/* FINANCE */}
            <div id="section-finance" style={{ background:T.surface, borderRadius:14, padding:"18px 18px", border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>Finance Tracker</div>
                <div style={{ display:"flex", gap:6 }}>
                  <label style={{ fontSize:10, padding:"3px 8px", borderRadius:6, fontWeight:700, cursor:"pointer",
                    background:"rgba(16,185,129,0.12)", border:`1px solid ${T.green}33`, color:T.green }}>
                    📥 Import CSV
                    <input type="file" accept=".csv" style={{ display:"none" }} onChange={async(e)=>{
                      const file = e.target.files[0];
                      if(!file) return;
                      const text = await file.text();
                      const lines = text.trim().split("\n");
                      // Navy Federal CSV format: Transaction Date, Transaction Type, Debit, Credit, Description
                      // Skip header row
                      let imported = 0;
                      const toInsert = [];
                      for(let i=1; i<lines.length; i++){
                        const cols = lines[i].split(",").map(c=>c.trim().replace(/^"|"$/g,""));
                        if(cols.length < 5) continue;
                        const [txDate, txType, debit, credit, description] = cols;
                        const isCredit = credit && parseFloat(credit) > 0;
                        const isDebit  = debit  && parseFloat(debit)  > 0;
                        if(!isCredit && !isDebit) continue;
                        const amount = isCredit ? parseFloat(credit) : -parseFloat(debit);
                        const type = isCredit ? "income" : "expense";
                        // Pick icon based on description
                        const desc = description.toLowerCase();
                        const icon = desc.includes("netflix")?"🎬":desc.includes("amazon")?"📦":desc.includes("walmart")||desc.includes("grocery")?"🛒":desc.includes("gas")||desc.includes("shell")||desc.includes("exxon")?"⛽":desc.includes("payroll")||desc.includes("direct dep")?"💼":desc.includes("electric")||desc.includes("utility")?"⚡":desc.includes("restaurant")||desc.includes("mcdonald")||desc.includes("chick")?"🍔":"💳";
                        toInsert.push({ name:description.slice(0,40), amount, icon, date_label:txDate, type });
                      }
                      if(toInsert.length===0){ showToast("No transactions found in CSV"); return; }
                      setSaving(true);
                      const {data} = await supabase.from("transactions").insert(toInsert).select();
                      if(data){ setTxns(tx=>[...data,...tx].slice(0,6)); imported=data.length; }
                      setSaving(false);
                      showToast(`✅ Imported ${imported} transactions!`);
                      e.target.value="";
                    }} />
                  </label>
                  <button onClick={()=>setShowTxnForm(!showTxnForm)} style={{ fontSize:11, padding:"4px 10px", borderRadius:7, fontWeight:700,
                    background:showTxnForm?T.accentDim:`linear-gradient(135deg,${T.accent},${T.accentB})`,
                    border:showTxnForm?`1px solid ${T.accent}44`:"none", color:showTxnForm?T.accentLight:"white" }}>
                    {showTxnForm?"✕":"+ Add"}
                  </button>
                </div>
              </div>
              {showTxnForm&&(
                <div className="fu" style={{ background:T.accentDim, border:`1px solid ${T.accent}33`, borderRadius:10, padding:11, marginBottom:11 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
                    <input value={newTxn.name} onChange={e=>setNewTxn({...newTxn,name:e.target.value})} placeholder="Name"
                      style={{ background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"7px 9px", color:T.text, fontSize:11 }} />
                    <input value={newTxn.amount} onChange={e=>setNewTxn({...newTxn,amount:e.target.value})} placeholder="Amount" type="number"
                      style={{ background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"7px 9px", color:T.text, fontSize:11 }} />
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <select value={newTxn.type} onChange={e=>setNewTxn({...newTxn,type:e.target.value})}
                      style={{ flex:1, background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"7px 9px", color:T.text, fontSize:11 }}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <select value={newTxn.icon} onChange={e=>setNewTxn({...newTxn,icon:e.target.value})}
                      style={{ width:58, background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7, padding:"7px 6px", color:T.text, fontSize:12 }}>
                      {["💳","💼","🛒","🎬","⚡","💻","🍔","✈️","🏥","🎮"].map(ic=><option key={ic}>{ic}</option>)}
                    </select>
                    <button onClick={addTxn} disabled={saving} style={{ padding:"7px 12px", background:`linear-gradient(135deg,${T.accent},${T.pink})`, borderRadius:7, color:"white", fontSize:12, fontWeight:700, opacity:saving?0.6:1 }}>Save</button>
                  </div>
                </div>
              )}
              {loading.txns?<Spinner/>:(
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
                    {[{l:"Income",v:`$${income.toFixed(2)}`,c:T.green,i:"⬆"},{l:"Spent",v:`$${expenses.toFixed(2)}`,c:T.red,i:"⬇"}].map(s=>(
                      <div key={s.l} style={{ padding:"9px 11px", background:T.raised, borderRadius:9, border:`1px solid ${T.border2}` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}><span style={{ fontSize:11, color:s.c }}>{s.i}</span><span style={{ fontSize:10, color:T.muted }}>{s.l}</span></div>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:s.c }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {[...txns].sort((a,b)=>{
                    if(a.type==="income" && b.type!=="income") return -1;
                    if(a.type!=="income" && b.type==="income") return 1;
                    return Math.abs(parseFloat(b.amount)) - Math.abs(parseFloat(a.amount));
                  }).map(tx=>{ const amt=Math.abs(parseFloat(tx.amount)),isIncome=tx.type==="income"; return (
                    <div key={tx.id} className="txn-row" style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 10px", borderRadius:10, transition:"background 0.13s", background:T.raised, border:`1px solid ${T.border}` }}>
                      <div style={{ width:29, height:29, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0, background:isIncome?T.greenDim:T.redDim, color:isIncome?T.green:T.red }}>{tx.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.name}</div><div style={{ fontSize:10, color:T.muted }}>{tx.date_label}</div></div>
                      <div style={{ fontSize:13, fontWeight:800, flexShrink:0, color:isIncome?T.green:T.red }}>{isIncome?"+":"-"}${amt.toFixed(2)}</div>
                      <button className="del" onClick={async()=>{ setTxns(ts=>ts.filter(t=>t.id!==tx.id)); await supabase.from("transactions").delete().eq("id",tx.id); showToast("Removed"); }}
                        style={{ background:"none", color:T.red, fontSize:14, padding:"0 3px", borderRadius:4, opacity:0, transition:"opacity 0.15s", flexShrink:0 }}>×</button>
                    </div>
                  ); })}
                  <div style={{ marginTop:8, padding:"10px 12px", borderRadius:10, background:`linear-gradient(135deg,${T.accentDim},${T.pinkDim})`, border:`1px solid ${T.accent}22` }}>
                    <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Expense Summary</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                      {[
                        { l:"Total In",  v:`$${income.toFixed(2)}`,   c:T.green },
                        { l:"Total Out", v:`$${expenses.toFixed(2)}`, c:T.red },
                        { l:"Net",       v:`${income-expenses>=0?"+":"-"}$${Math.abs(income-expenses).toFixed(2)}`, c:income-expenses>=0?T.green:T.red },
                      ].map(s=>(
                        <div key={s.l} style={{ textAlign:"center", padding:"6px 4px", borderRadius:8, background:"rgba(0,0,0,0.2)" }}>
                          <div style={{ fontSize:9, color:T.muted, marginBottom:3 }}>{s.l}</div>
                          <div style={{ fontSize:13, fontWeight:800, color:s.c }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:10, color:T.muted }}>{txns.length} transaction{txns.length!==1?"s":""} this month</span>
                      <span style={{ fontSize:10, fontWeight:700, color:income-expenses>=0?T.green:T.red }}>
                        {income-expenses>=0?"▲ Saving":"▼ Overspent"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Edit Goal Modal */}
      {editGoal&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
          onClick={e=>e.target===e.currentTarget&&setEditGoal(null)}>
          <div className="fu" style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:16, padding:26, width:310, boxShadow:"0 28px 60px rgba(0,0,0,0.8)" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:"1.5px", marginBottom:4 }}>Update Goal</div>
            <div style={{ fontSize:13, color:T.muted, marginBottom:18 }}>{editGoal.text}</div>
            <input type="range" min="0" max="100" value={editGoal.progress} onChange={e=>setEditGoal({...editGoal,progress:parseInt(e.target.value)})}
              style={{ width:"100%", accentColor:editGoal.color, marginBottom:12, cursor:"pointer" }} />
            <div style={{ textAlign:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:36, letterSpacing:"2px", color:editGoal.color, marginBottom:18, textShadow:`0 0 20px ${editGoal.color}66` }}>{editGoal.progress}%</div>
            <Bar2 pct={editGoal.progress} color={editGoal.color} h={6} />
            <div style={{ display:"flex", gap:9, marginTop:18 }}>
              <button onClick={()=>setEditGoal(null)} style={{ flex:1, padding:"10px", background:T.raised, border:`1px solid ${T.border2}`, borderRadius:9, color:T.muted, fontSize:13, fontWeight:600 }}>Cancel</button>
              <button onClick={()=>saveGoal(editGoal,editGoal.progress)} style={{ flex:1, padding:"10px", background:`linear-gradient(135deg,${T.accent},${T.pink})`, borderRadius:9, color:"white", fontSize:13, fontWeight:700, boxShadow:`0 0 14px ${T.accentGlow}` }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
