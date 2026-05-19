import { useState, useEffect, useCallback } from "react";
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

  // Days that have events this month
  const eventDays = new Set(events
    .filter(e=>{ const d=new Date(e.event_date); return d.getMonth()===cal.getMonth()&&d.getFullYear()===cal.getFullYear(); })
    .map(e=>new Date(e.event_date).getDate()));

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
            {hasE&&<div style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background:T.pink }} />}
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
                style={{ padding:"6px 14px", background:`linear-gradient(135deg,${T.accent},${T.accentB})`, borderRadius:7, color:"white", fontSize:12, fontWeight:700, opacity:saving?0.6:1 }}>Save</button>
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
              style={{ padding:"7px 12px", background:`linear-gradient(135deg,${T.accent},${T.accentB})`, borderRadius:8, color:"white", fontSize:12, fontWeight:700 }}>
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


export default function Dashboard() {
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
  const [showCardForm,setShowCardForm]= useState(false);
  const [activeNav,   setActiveNav]   = useState("Dashboard");
  const [editGoal,    setEditGoal]    = useState(null);
  const [baseBalance, setBaseBalance] = useState(14560.75);
  const [weatherLocName, setWeatherLocName] = useState("Alpharetta");
  const [editBalance, setEditBalance] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState("");

  const showToast = m => { setToast(m); setTimeout(()=>setToast(""),2400); };

  const loadAll = useCallback(async () => {
    const [{ data:t },{ data:g },{ data:tx },{ data:c }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at",{ascending:true}),
      supabase.from("goals").select("*").order("created_at",{ascending:true}),
      supabase.from("transactions").select("*").order("created_at",{ascending:false}).limit(6),
      supabase.from("cards").select("*").order("created_at",{ascending:true}),
    ]);
    setTasks(t||[]); setGoals(g||[]); setTxns(tx||[]); setCards(c||[]);
    setLoading({ tasks:false, goals:false, txns:false, cards:false });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const s1 = supabase.channel("t").on("postgres_changes",{event:"*",schema:"public",table:"tasks"},()=>supabase.from("tasks").select("*").order("created_at",{ascending:true}).then(({data})=>setTasks(data||[]))).subscribe();
    const s2 = supabase.channel("g").on("postgres_changes",{event:"*",schema:"public",table:"goals"},()=>supabase.from("goals").select("*").order("created_at",{ascending:true}).then(({data})=>setGoals(data||[]))).subscribe();
    const s3 = supabase.channel("tx").on("postgres_changes",{event:"*",schema:"public",table:"transactions"},()=>supabase.from("transactions").select("*").order("created_at",{ascending:false}).limit(6).then(({data})=>setTxns(data||[]))).subscribe();
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
  const addTxn      = async() => { if(!newTxn.name.trim()||!newTxn.amount) return; setSaving(true); const amt=newTxn.type==="expense"?-Math.abs(parseFloat(newTxn.amount)):Math.abs(parseFloat(newTxn.amount)); const{data}=await supabase.from("transactions").insert({name:newTxn.name,amount:amt,icon:newTxn.icon,date_label:"Just now",type:newTxn.type}).select().single(); if(data) setTxns(tx=>[data,...tx.slice(0,5)]); setNewTxn({name:"",amount:"",type:"expense",icon:"💳"}); setShowTxnForm(false); setSaving(false); showToast("Transaction saved ✓"); };
  const addCard     = async() => { if(!newCard.name.trim()||!newCard.number.trim()) return; setSaving(true); const{data}=await supabase.from("cards").insert({name:newCard.name,number:newCard.number,balance:parseFloat(newCard.balance)||0,type:newCard.type,color:newCard.color}).select().single(); if(data) setCards(c=>[...c,data]); setNewCard({name:"",number:"",balance:"",type:"visa",color:T.accent}); setShowCardForm(false); setSaving(false); showToast("Card added ✓"); };
  const deleteCard  = async(id) => { setCards(c=>c.filter(x=>x.id!==id)); await supabase.from("cards").delete().eq("id",id); showToast("Card removed"); };

  const done     = tasks.filter(t=>t.done).length;
  const pct      = tasks.length?Math.round((done/tasks.length)*100):0;
  const income   = txns.filter(t=>t.type==="income").reduce((a,t)=>a+Math.abs(parseFloat(t.amount)),0);
  const expenses = txns.filter(t=>t.type==="expense").reduce((a,t)=>a+Math.abs(parseFloat(t.amount)),0);
  const balance  = baseBalance+income-expenses;
  const pColor   = p=>p==="high"?T.red:p==="medium"?T.yellow:T.faint;
  const activeCard = cards[selectedCard] || null;

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, fontFamily:"'Plus Jakarta Sans',sans-serif", color:T.text, overflow:"hidden", fontSize:13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;scrollbar-width:thin;scrollbar-color:#2a2a4a transparent}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#2a2a4a;border-radius:2px}
        input,select,button{font-family:'Plus Jakarta Sans',sans-serif}
        input::placeholder{color:#3a3a5a}input:focus,select:focus{outline:none}
        button{cursor:pointer;border:none;outline:none}
        .nb:hover{background:rgba(124,58,237,0.12)!important}
        .task-row:hover{background:rgba(124,58,237,0.06)!important}
        .task-row:hover .del{opacity:1!important}
        .txn-row:hover{background:rgba(255,255,255,0.03)!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        .fu{animation:fadeUp 0.3s ease}
        .pulse{animation:pulse 2s infinite}
      `}</style>

      {toast&&<div style={{ position:"fixed",top:18,right:18,zIndex:9999,
        background:`linear-gradient(135deg,${T.accent},${T.pink})`,color:"white",
        padding:"9px 18px",borderRadius:10,fontSize:13,fontWeight:700,
        boxShadow:`0 4px 24px ${T.accentGlow}`,animation:"toastIn 0.28s ease" }}>{toast}</div>}

      {/* SIDEBAR */}
      <div style={{ width:218, background:T.surface, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", padding:"20px 13px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 8px", marginBottom:28 }}>
         <div style={{ width:34, height:34, borderRadius:10, overflow:"hidden",
  border:`1.5px solid ${T.accent}`, boxShadow:`0 0 16px ${T.accentGlow}`, flexShrink:0 }}>
  <img src="https://i.imgur.com/AWWs5jM.png" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
</div>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:"2px" }}>TaskFlow</span>
          <div className="pulse" style={{ width:6, height:6, borderRadius:"50%", background:T.green, marginLeft:"auto", boxShadow:`0 0 6px ${T.green}` }} />
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
          <div style={{ fontSize:9, color:T.faint, fontWeight:800, letterSpacing:"1.4px", textTransform:"uppercase", padding:"0 9px", marginBottom:6 }}>MAIN</div>
          {NAV.slice(0,5).map(item=>{
            const active=activeNav===item;
            return <div key={item} className="nb" onClick={()=>setActiveNav(item)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:9, cursor:"pointer", transition:"all 0.15s", marginBottom:2, background:active?T.accentDim:"transparent", borderLeft:active?`2.5px solid ${T.accent}`:"2.5px solid transparent" }}>
              <span style={{ fontSize:14, color:active?T.accent:T.faint }}>{NAV_ICO[item]}</span>
              <span style={{ fontSize:13, fontWeight:active?700:400, color:active?T.text:T.muted }}>{item}</span>
            </div>;
          })}
          <div style={{ fontSize:9, color:T.faint, fontWeight:800, letterSpacing:"1.4px", textTransform:"uppercase", padding:"16px 9px 6px" }}>TOOLS</div>
          {NAV.slice(5).map(item=>{
            const active=activeNav===item;
            return <div key={item} className="nb" onClick={()=>setActiveNav(item)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:9, cursor:"pointer", transition:"all 0.15s", marginBottom:2, background:active?T.accentDim:"transparent", borderLeft:active?`2.5px solid ${T.accent}`:"2.5px solid transparent" }}>
              <span style={{ fontSize:14, color:active?T.accent:T.faint }}>{NAV_ICO[item]}</span>
              <span style={{ fontSize:13, fontWeight:active?700:400, color:active?T.text:T.muted }}>{item}</span>
            </div>;
          })}
        </div>
        <div style={{ padding:"12px 10px", borderRadius:12, background:T.raised, border:`1px solid ${T.border2}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${T.accent},${T.pink})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"white" }}>MD</div>
            <div><div style={{ fontSize:13, fontWeight:700 }}>Marty Dickerson</div><div style={{ fontSize:10, color:T.muted }}>Premium</div></div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div className="pulse" style={{ width:5, height:5, borderRadius:"50%", background:T.green }} />
            <span style={{ fontSize:10, color:T.green }}>Live · Supabase</span>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 22px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:"2px", lineHeight:1 }}>Dashboard</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{loading.tasks?"Loading...":`${tasks.filter(t=>!t.done).length} tasks remaining · Mon, May 18 2026`}</div>
          </div>
          <div style={{ display:"flex", gap:9, alignItems:"center" }}>
            <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:9, fontSize:13, fontWeight:700, background:`linear-gradient(135deg,${T.accent},${T.accentB})`, border:"none", color:"white", boxShadow:`0 0 16px ${T.accentGlow}` }}
              onClick={()=>document.getElementById("newTaskInput")?.focus()}>+ New Task</button>
            <div style={{ width:34, height:34, borderRadius:9, background:T.raised, border:`1px solid ${T.border2}`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", cursor:"pointer" }}>
              🔔<span style={{ position:"absolute", top:7, right:7, width:6, height:6, borderRadius:"50%", background:T.pink, border:`1.5px solid ${T.bg}` }} className="pulse" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:"auto", padding:"18px 22px", display:"flex", flexDirection:"column", gap:14, minWidth:0 }}>

          {/* ROW 1: Completion | Weekly | Weather | My Cards */}
          <div style={{ display:"grid", gridTemplateColumns:"190px 1fr 1fr 280px", gap:14, alignItems:"stretch" }}>

            {/* Completion Ring */}
            <div style={{ background:T.surface, borderRadius:14, padding:"16px 18px", border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Task Completion</div>
              {loading.tasks?<Spinner/>:(
                <>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1 }}>
                    <Ring pct={pct} color={T.accent} center={<div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:T.text, lineHeight:1 }}>{pct}%</div><div style={{ fontSize:9, color:T.muted, marginTop:2 }}>DONE</div></div>}/>
                  </div>
                  <div style={{ marginTop:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}><span style={{ color:T.muted }}>Tasks done</span><span style={{ fontWeight:700 }}>{done}/{tasks.length}</span></div>
                    {["high","medium","low"].map(p=>{ const tot=tasks.filter(t=>t.priority===p).length,dn=tasks.filter(t=>t.priority===p&&t.done).length; return tot>0?(<div key={p} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}><div style={{ width:6,height:6,borderRadius:2,background:pColor(p),flexShrink:0 }}/><Bar2 pct={tot?(dn/tot)*100:0} color={pColor(p)} h={4}/><span style={{ fontSize:10,color:T.muted,width:24,textAlign:"right" }}>{dn}/{tot}</span></div>):null; })}
                  </div>
                </>
              )}
            </div>

            {/* Weekly Bar */}
            <div style={{ background:`linear-gradient(145deg,#14143a,${T.surface})`, borderRadius:14, padding:"16px 18px", border:`1px solid ${T.accent}33`, boxShadow:`0 0 20px ${T.accentGlow}` }}>
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
                        <YAxis tick={{fill:"#6b6b9a",fontSize:11}} axisLine={false} tickLine={false}/>
                        <Tooltip content={<CustomTip/>} cursor={{fill:"rgba(124,58,237,0.08)"}}/>
                        <Bar dataKey="done" radius={[5,5,0,0]}>
                          {weekBars.map((e,i)=><Cell key={i} fill={e.isToday?T.accent:e.done>0?T.accent+"66":T.faint}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Per-day task summary */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5, marginTop:8 }}>
                      {weekBars.map((d,i)=>(
                        <div key={i} style={{ padding:"8px 6px", borderRadius:9, minHeight:70,
                          background: d.isToday ? T.accentDim : d.done>0 ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)",
                          border:`1px solid ${d.isToday?T.accent+"44":d.done>0?"rgba(124,58,237,0.18)":T.border}` }}>
                          {d.done > 0 ? (
                            <>
                              <div style={{ fontSize:9, fontWeight:700, color:d.isToday?T.accentLight:T.muted,
                                textTransform:"uppercase", letterSpacing:0.5, marginBottom:5 }}>
                                {d.done} task{d.done!==1?"s":""}
                              </div>
                              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                {d.taskNames.slice(0,3).map((name,j)=>(
                                  <div key={j} style={{ display:"flex", alignItems:"flex-start", gap:4 }}>
                                    <div style={{ width:4, height:4, borderRadius:"50%", background:d.isToday?T.accentLight:T.accent+"88", marginTop:3, flexShrink:0 }} />
                                    <div style={{ fontSize:9, color:d.isToday?T.text:"rgba(255,255,255,0.55)", lineHeight:1.3,
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
                  </div>
                );
              })()}
            </div>

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
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
                    <input value={newCard.name} onChange={e=>setNewCard({...newCard,name:e.target.value})} placeholder="Card name"
                      style={{ background:"rgba(0,0,0,0.3)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, padding:"7px 9px", color:"white", fontSize:11 }} />
                    <input value={newCard.number} onChange={e=>setNewCard({...newCard,number:e.target.value})} placeholder="Last 4 digits"
                      style={{ background:"rgba(0,0,0,0.3)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, padding:"7px 9px", color:"white", fontSize:11 }} />
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <input value={newCard.balance} onChange={e=>setNewCard({...newCard,balance:e.target.value})} placeholder="Balance" type="number"
                      style={{ flex:1, background:"rgba(0,0,0,0.3)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, padding:"7px 9px", color:"white", fontSize:11 }} />
                    <select value={newCard.color} onChange={e=>setNewCard({...newCard,color:e.target.value})}
                      style={{ width:80, background:"rgba(0,0,0,0.4)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, padding:"7px 6px", color:"white", fontSize:11 }}>
                      <option value={T.accent}>Purple</option>
                      <option value={T.pink}>Pink</option>
                      <option value="#1e40af">Blue</option>
                      <option value="#065f46">Green</option>
                      <option value="#7c2d12">Red</option>
                    </select>
                    <button onClick={addCard} disabled={saving} style={{ padding:"7px 12px", background:"rgba(255,255,255,0.25)", borderRadius:7, color:"white", fontSize:12, fontWeight:700, border:"1px solid rgba(255,255,255,0.3)", opacity:saving?0.6:1 }}>Save</button>
                  </div>
                </div>
              )}

              {loading.cards?<Spinner/>:(
                <>
                  {cards.length === 0 && <div style={{ textAlign:"center", color:"rgba(255,255,255,0.4)", fontSize:12, padding:"20px 0" }}>No cards yet — add one above!</div>}
                  {cards.length > 0 && (() => {
                    const c = cards[selectedCard];
                    return (
                      <div>
                        {/* Single card */}
                        <div style={{ borderRadius:14, overflow:"hidden", position:"relative",
                          background:"linear-gradient(135deg,#2d1b5e 0%,#1a1a3e 60%,#0d0d1e 100%)",
                          border:"1px solid rgba(255,255,255,0.12)",
                          boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
                          {/* Blobs */}
                          <div style={{ position:"absolute", top:-30, right:-30, width:100, height:100, borderRadius:"50%", background:"rgba(124,58,237,0.18)", pointerEvents:"none" }} />
                          <div style={{ position:"absolute", bottom:-20, left:-20, width:80, height:80, borderRadius:"50%", background:"rgba(236,72,153,0.1)", pointerEvents:"none" }} />

                          <div style={{ padding:"16px", position:"relative", zIndex:1 }}>
                            {/* Top row */}
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                              <div style={{ display:"flex" }}>
                                <div style={{ width:24, height:24, borderRadius:"50%", background:"rgba(255,200,50,0.75)" }} />
                                <div style={{ width:24, height:24, borderRadius:"50%", background:"rgba(255,100,50,0.55)", marginLeft:-10 }} />
                              </div>
                              <div style={{ width:34, height:24, borderRadius:4, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
                                  {[...Array(4)].map((_,k)=><div key={k} style={{ width:6,height:4,background:"rgba(255,255,255,0.35)",borderRadius:1 }}/>)}
                                </div>
                              </div>
                            </div>

                            {/* Card number */}
                            <div style={{ fontFamily:"monospace", fontSize:13, letterSpacing:"3px", color:"rgba(255,255,255,0.65)", marginBottom:16 }}>
                              •••• •••• •••• {c.number}
                            </div>

                            {/* Balance + holder */}
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                              <div>
                                <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", letterSpacing:1, marginBottom:3 }}>AVAILABLE BALANCE</div>
                                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"white", letterSpacing:"0.5px", lineHeight:1 }}>
                                  ${parseFloat(c.balance).toLocaleString("en-US",{minimumFractionDigits:2})}
                                </div>
                                <div style={{ fontSize:10, color:T.green, marginTop:3 }}>▲ 4.12%</div>
                              </div>
                              <div style={{ textAlign:"right" }}>
                                <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginBottom:2 }}>Card Holder</div>
                                <div style={{ fontSize:11, fontWeight:600, color:"white" }}>Marty Dickerson</div>
                                <div style={{ fontStyle:"italic", fontWeight:900, fontSize:15, color:"white", marginTop:2 }}>
                                  {c.type?.toUpperCase()||"VISA"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Nav + delete row */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
                          <button onClick={()=>setSelectedCard(i=>(i-1+cards.length)%cards.length)}
                            style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"white", width:28, height:28, borderRadius:8, fontSize:14, cursor:"pointer" }}>‹</button>
                          <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                            {cards.map((_,i)=>(
                              <div key={i} onClick={()=>setSelectedCard(i)}
                                style={{ width:i===selectedCard?16:6, height:6, borderRadius:3,
                                  background:i===selectedCard?"white":"rgba(255,255,255,0.3)", cursor:"pointer", transition:"all 0.2s" }} />
                            ))}
                          </div>
                          <button onClick={()=>setSelectedCard(i=>(i+1)%cards.length)}
                            style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"white", width:28, height:28, borderRadius:8, fontSize:14, cursor:"pointer" }}>›</button>
                        </div>

                        {/* Delete card */}
                        <button onClick={()=>deleteCard(c.id)}
                          style={{ width:"100%", marginTop:8, padding:"9px", background:`linear-gradient(135deg,${T.red},#dc2626)`, border:"none", borderRadius:9, color:"white", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 14px rgba(239,68,68,0.35)`, letterSpacing:"0.5px" }}>
                          🗑 Remove Card
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

          </div>

          {/* ROW 2: Tasks | Goals | Calendar | Finance */}
          <div style={{ display:"grid", gridTemplateColumns:"1.1fr 0.9fr 0.85fr 0.9fr", gap:14, minHeight:380 }}>

            {/* TO-DO */}
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 18px", border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>To Do List</div>
                <Pill color={T.accent}>{tasks.filter(t=>!t.done).length} remaining</Pill>
              </div>
              <div style={{ display:"flex", gap:7, marginBottom:12 }}>
                <input id="newTaskInput" value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="Add task… Enter to save"
                  style={{ flex:1, background:T.raised, border:`1px solid ${T.border2}`, borderRadius:9, padding:"8px 12px", color:T.text, fontSize:12 }} />
                <button onClick={addTask} disabled={saving} style={{ padding:"8px 14px", background:`linear-gradient(135deg,${T.accent},${T.accentB})`, borderRadius:9, color:"white", fontSize:16, fontWeight:900, boxShadow:`0 0 12px ${T.accentGlow}`, opacity:saving?0.6:1 }}>+</button>
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
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 18px", border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>Weekly Goals</div>
                <span style={{ fontSize:10, color:T.muted }}>May 18–24</span>
              </div>
              {loading.goals?<Spinner/>:(
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16, padding:"12px 14px", background:T.raised, borderRadius:12, border:`1px solid ${T.border2}` }}>
                    <Ring pct={goals.length?Math.round(goals.reduce((a,g)=>a+g.progress,0)/goals.length):0} size={60} stroke={6} color={T.accent}
                      center={<div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:T.text }}>{goals.length?Math.round(goals.reduce((a,g)=>a+g.progress,0)/goals.length):0}%</div>}/>
                    <div><div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>Overall Progress</div><div style={{ fontSize:11, color:T.muted }}>{goals.filter(g=>g.progress===100).length} of {goals.length} complete</div></div>
                  </div>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12, overflowY:"auto" }}>
                    {goals.map(g=>(
                      <div key={g.id}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, alignItems:"center" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}><div style={{ width:7, height:7, borderRadius:2, background:g.color, flexShrink:0 }}/><span style={{ fontSize:12, fontWeight:500 }}>{g.text}</span></div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ fontSize:12, fontWeight:700, color:g.color }}>{g.progress}%</span>
                            <button onClick={()=>setEditGoal({...g})} style={{ background:"none", fontSize:11, color:T.muted, padding:"1px 4px", borderRadius:4 }}
                              onMouseEnter={e=>e.target.style.color=T.accentLight} onMouseLeave={e=>e.target.style.color=T.muted}>✎</button>
                          </div>
                        </div>
                        <Bar2 pct={g.progress} color={g.color} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:12, color:T.muted }}>Budget Used</span>
                      <span style={{ fontSize:12, fontWeight:700, color:T.accentLight }}>{Math.round((expenses/3000)*100)}%</span>
                    </div>
                    <Bar2 pct={(expenses/3000)*100} color={T.accent} h={5} />
                  </div>
                </>
              )}
            </div>

            {/* CALENDAR */}
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 18px", border:`1px solid ${T.border}`, overflowY:"auto" }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", marginBottom:12 }}>Calendar</div>
              <Calendar />
            </div>

            {/* FINANCE */}
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 18px", border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>Finance Tracker</div>
                <button onClick={()=>setShowTxnForm(!showTxnForm)} style={{ fontSize:11, padding:"4px 10px", borderRadius:7, fontWeight:700,
                  background:showTxnForm?T.accentDim:`linear-gradient(135deg,${T.accent},${T.accentB})`,
                  border:showTxnForm?`1px solid ${T.accent}44`:"none", color:showTxnForm?T.accentLight:"white" }}>
                  {showTxnForm?"✕":"+ Add"}
                </button>
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
                    <button onClick={addTxn} disabled={saving} style={{ padding:"7px 12px", background:`linear-gradient(135deg,${T.accent},${T.accentB})`, borderRadius:7, color:"white", fontSize:12, fontWeight:700, opacity:saving?0.6:1 }}>Save</button>
                  </div>
                </div>
              )}
              {loading.txns?<Spinner/>:(
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
                    {[{l:"Income",v:`$${income.toFixed(0)}`,c:T.green,i:"⬆"},{l:"Spent",v:`$${expenses.toFixed(0)}`,c:T.red,i:"⬇"}].map(s=>(
                      <div key={s.l} style={{ padding:"9px 11px", background:T.raised, borderRadius:9, border:`1px solid ${T.border2}` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}><span style={{ fontSize:11, color:s.c }}>{s.i}</span><span style={{ fontSize:10, color:T.muted }}>{s.l}</span></div>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:s.c }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {txns.map(tx=>{ const amt=Math.abs(parseFloat(tx.amount)),isIncome=tx.type==="income"; return (
                    <div key={tx.id} className="txn-row" style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 10px", borderRadius:10, transition:"background 0.13s", background:T.raised, border:`1px solid ${T.border}` }}>
                      <div style={{ width:29, height:29, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0, background:isIncome?T.greenDim:T.redDim, color:isIncome?T.green:T.red }}>{tx.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.name}</div><div style={{ fontSize:10, color:T.muted }}>{tx.date_label}</div></div>
                      <div style={{ fontSize:13, fontWeight:800, flexShrink:0, color:isIncome?T.green:T.red }}>{isIncome?"+":"-"}${amt.toFixed(2)}</div>
                      <button className="del" onClick={async()=>{ setTxns(ts=>ts.filter(t=>t.id!==tx.id)); await supabase.from("transactions").delete().eq("id",tx.id); showToast("Removed"); }}
                        style={{ background:"none", color:T.red, fontSize:14, padding:"0 3px", borderRadius:4, opacity:0, transition:"opacity 0.15s", flexShrink:0 }}>×</button>
                    </div>
                  ); })}
                  <div style={{ marginTop:8, padding:"9px 12px", borderRadius:10, background:`linear-gradient(135deg,${T.accentDim},${T.pinkDim})`, border:`1px solid ${T.accent}22` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:5 }}><span style={{ color:T.muted }}>Monthly Budget</span><span style={{ fontWeight:700, color:T.accentLight }}>{Math.min(Math.round((expenses/3000)*100),100)}% used</span></div>
                    <Bar2 pct={(expenses/3000)*100} color={T.accent} h={5} />
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
              <button onClick={()=>saveGoal(editGoal,editGoal.progress)} style={{ flex:1, padding:"10px", background:`linear-gradient(135deg,${T.accent},${T.accentB})`, borderRadius:9, color:"white", fontSize:13, fontWeight:700, boxShadow:`0 0 14px ${T.accentGlow}` }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
