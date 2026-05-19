import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { createClient } from "@supabase/supabase-js";

/* ── Supabase ────────────────────────────────────────────────────────── */
const supabase = createClient(
  "https://zpbsoehvlblfkmvzuyjf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYnNvZWh2bGJsZmttdnp1eWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDcxNDIsImV4cCI6MjA5NDY4MzE0Mn0.pkSoMbc0r3PFJxqi6raV2GHXhAOXAMH8tb1o8zB61LU"
);

/* ── Tokens ─────────────────────────────────────────────────────────── */
const T = {
  bg:        "#0c0c0c",
  surface:   "#131313",
  raised:    "#181818",
  card:      "#1c1c1c",
  border:    "#222222",
  border2:   "#2c2c2c",
  orange:    "#e06d20",
  orangeB:   "#f07830",
  orangeDim: "rgba(224,109,32,0.15)",
  orangeGlow:"rgba(224,109,32,0.28)",
  green:     "#4aba72",
  greenDim:  "rgba(74,186,114,0.14)",
  red:       "#e05555",
  redDim:    "rgba(224,85,85,0.14)",
  yellow:    "#e0a020",
  yellowDim: "rgba(224,160,32,0.14)",
  text:      "#f2f2f2",
  muted:     "#777",
  faint:     "#3a3a3a",
};

/* ── Static Data ─────────────────────────────────────────────────────── */
const SPEND_DATA = [
  { name:"Shopping",      value:27, color:T.orange },
  { name:"Subscriptions", value:35, color:T.green  },
  { name:"Dining",        value:18, color:T.yellow },
  { name:"Other",         value:20, color:"#666"   },
];

const DAYS_S  = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const NAV     = ["Dashboard","Tasks","Calendar","Finance","Goals","Settings","Help Center"];
const NAV_ICO = { Dashboard:"⊞", Tasks:"✓", Calendar:"📅", Finance:"◈", Goals:"🎯", Settings:"⚙", "Help Center":"?" };

/* ── Helpers ─────────────────────────────────────────────────────────── */
function Pill({ children, color }) {
  return <span style={{ fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:20,
    background:`${color}22`, color, whiteSpace:"nowrap" }}>{children}</span>;
}

function ProgressBar({ pct, color, h=5 }) {
  return (
    <div style={{ height:h, background:T.faint, borderRadius:h, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:color,
        borderRadius:h, boxShadow:`0 0 8px ${color}66`, transition:"width 1s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

function Ring({ pct, size=96, stroke=9, color=T.orange, center }) {
  const r = (size-stroke)/2, circ = 2*Math.PI*r, dash = (Math.min(pct,100)/100)*circ;
  return (
    <div style={{ position:"relative", width:size, height:size,
      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)", position:"absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#242424" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 7px ${color})`, transition:"stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ zIndex:1, textAlign:"center" }}>{center}</div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"20px 0" }}>
      <div style={{ width:18, height:18, border:`2px solid ${T.border2}`,
        borderTop:`2px solid ${T.orange}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
    </div>
  );
}

const CustomTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.card, border:`1px solid ${T.border2}`, borderRadius:9, padding:"9px 13px", fontSize:12 }}>
      <div style={{ color:T.muted, marginBottom:4 }}>{payload[0]?.payload?.day}</div>
      <div style={{ color:T.green, fontWeight:700 }}>Done: {payload[0]?.value}</div>
    </div>
  );
};

/* ── Calendar ────────────────────────────────────────────────────────── */
function Calendar() {
  const [cal, setCal] = useState(new Date(2026,4,1));
  const today = new Date(2026,4,18);
  const fd  = new Date(cal.getFullYear(), cal.getMonth(), 1).getDay();
  const dim = new Date(cal.getFullYear(), cal.getMonth()+1, 0).getDate();
  const cells = [...Array(fd).fill(null), ...Array.from({length:dim},(_,i)=>i+1)];
  const evDays = [3,7,12,18,22,26,30];
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <button onClick={()=>setCal(new Date(cal.getFullYear(),cal.getMonth()-1))}
          style={{ background:T.faint, border:"none", color:T.muted, width:26, height:26, borderRadius:7, cursor:"pointer", fontSize:13 }}>‹</button>
        <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{MONTHS[cal.getMonth()].slice(0,3)} {cal.getFullYear()}</span>
        <button onClick={()=>setCal(new Date(cal.getFullYear(),cal.getMonth()+1))}
          style={{ background:T.faint, border:"none", color:T.muted, width:26, height:26, borderRadius:7, cursor:"pointer", fontSize:13 }}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {DAYS_S.map(d=><div key={d} style={{ textAlign:"center", fontSize:9, color:T.faint,
          fontWeight:700, padding:"2px 0", textTransform:"uppercase", letterSpacing:0.5 }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((day,i)=>{
          const isT = day===today.getDate()&&cal.getMonth()===today.getMonth()&&cal.getFullYear()===today.getFullYear();
          const hasE = day&&evDays.includes(day)&&!isT;
          return (
            <div key={i} style={{ textAlign:"center", fontSize:12, padding:"5px 0", borderRadius:7,
              cursor:day?"pointer":"default",
              background:isT?T.orange:"transparent",
              color:!day?"transparent":isT?"white":T.text,
              fontWeight:isT?800:400,
              boxShadow:isT?`0 0 12px ${T.orangeGlow}`:"none",
              position:"relative", transition:"background 0.15s" }}>
              {day||"·"}
              {hasE&&<div style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)",
                width:3, height:3, borderRadius:"50%", background:T.orange, opacity:0.7 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
        <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:1,
          textTransform:"uppercase", marginBottom:8 }}>Today's Schedule</div>
        {[{t:"10:00 AM",l:"Team Standup",c:T.orange},{t:"2:30 PM",l:"Client Call",c:T.green},{t:"5:00 PM",l:"Goal Review",c:"#a78bfa"}].map((e,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8,
            padding:"7px 9px", borderRadius:9, background:T.raised, border:`1px solid ${T.border}` }}>
            <div style={{ width:3, height:28, borderRadius:2, background:e.c, boxShadow:`0 0 6px ${e.c}`, flexShrink:0 }} />
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{e.l}</div>
              <div style={{ fontSize:10, color:T.muted }}>{e.t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Weather Data & Component ────────────────────────────────────────── */
const WEATHER_ICONS = {
  clear: "☀️", sunny: "☀️", "mostly sunny": "🌤️", "partly cloudy": "⛅",
  cloudy: "☁️", overcast: "☁️", rain: "🌧️", "light rain": "🌦️",
  thunderstorm: "⛈️", snow: "❄️", fog: "🌫️", windy: "💨",
};

const getWeatherIcon = (condition) => {
  if (!condition) return "🌤️";
  const c = condition.toLowerCase();
  for (const [key, icon] of Object.entries(WEATHER_ICONS)) {
    if (c.includes(key)) return icon;
  }
  return "🌤️";
};

function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Open-Meteo API — free, no key needed — Atlanta, GA
    const url = "https://api.open-meteo.com/v1/forecast?latitude=33.749&longitude=-84.388&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&daily=temperature_2m_max,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=5";
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const wmo = {
          0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
          45:"Foggy",48:"Foggy",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",
          61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",
          75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",
          95:"Thunderstorm",96:"Thunderstorm",99:"Thunderstorm",
        };
        const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
        const forecast = data.daily.time.slice(0,5).map((date,i) => ({
          day: days[new Date(date).getDay()],
          high: Math.round(data.daily.temperature_2m_max[i]),
          rain: data.daily.precipitation_probability_max[i],
          code: data.daily.weathercode[i],
          condition: wmo[data.daily.weathercode[i]] || "Clear",
        }));
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          condition: wmo[data.current.weathercode] || "Clear sky",
          wind: Math.round(data.current.windspeed_10m),
          humidity: data.current.relativehumidity_2m,
          forecast,
        });
        setLoading(false);
      })
      .catch(() => {
        // Fallback to known Atlanta data if API fails
        setWeather({
          temp: 84, condition: "Mostly sunny", wind: 8, humidity: 52,
          forecast: [
            { day:"Mon", high:87, rain:0,  condition:"Clear" },
            { day:"Tue", high:86, rain:5,  condition:"Partly cloudy" },
            { day:"Wed", high:86, rain:15, condition:"Partly cloudy" },
            { day:"Thu", high:83, rain:85, condition:"Rain" },
            { day:"Fri", high:78, rain:30, condition:"Light rain" },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", gap:16, alignItems:"center" }}>
      {/* Current temp */}
      <div style={{ display:"flex", alignItems:"center", gap:14,
        padding:"0 20px 0 4px", borderRight:`1px solid ${T.border2}` }}>
        <div style={{ fontSize:52, lineHeight:1 }}>{getWeatherIcon(weather.condition)}</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:42,
            letterSpacing:"1px", lineHeight:1, color:T.text }}>
            {weather.temp}°<span style={{ fontSize:22, color:T.muted }}>F</span>
          </div>
          <div style={{ fontSize:13, color:T.muted, marginTop:2 }}>{weather.condition}</div>
          <div style={{ fontSize:11, color:T.faint, marginTop:1 }}>📍 Atlanta, GA</div>
        </div>
      </div>

      {/* 5-day forecast */}
      <div style={{ display:"flex", gap:8 }}>
        {weather.forecast.map((d, i) => (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
            gap:5, padding:"10px 8px", borderRadius:11,
            background: i===0 ? T.orangeDim : T.raised,
            border:`1px solid ${i===0 ? T.orange+"44" : T.border2}` }}>
            <div style={{ fontSize:10, fontWeight:700, color:i===0?T.orange:T.muted,
              textTransform:"uppercase", letterSpacing:0.5 }}>{d.day}</div>
            <div style={{ fontSize:20 }}>{getWeatherIcon(d.condition)}</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18,
              letterSpacing:"0.5px", color:T.text }}>{d.high}°</div>
            <div style={{ display:"flex", alignItems:"center", gap:3 }}>
              <span style={{ fontSize:9 }}>💧</span>
              <span style={{ fontSize:10, color:d.rain>50?T.green:T.faint }}>{d.rain}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display:"flex", flexDirection:"column", gap:10,
        padding:"0 4px 0 20px", borderLeft:`1px solid ${T.border2}` }}>
        {[
          { icon:"💨", label:"Wind",     value:`${weather.wind} mph` },
          { icon:"💧", label:"Humidity", value:`${weather.humidity}%` },
          { icon:"🌅", label:"Sunrise",  value:"6:18 AM" },
          { icon:"🌇", label:"Sunset",   value:"8:24 PM" },
        ].map(s => (
          <div key={s.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:T.raised,
              border:`1px solid ${T.border2}`, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:13, flexShrink:0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:10, color:T.muted }}>{s.label}</div>
              <div style={{ fontSize:13, fontWeight:600 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────────── */
export default function Dashboard() {
  const [tasks,     setTasks]     = useState([]);
  const [goals,     setGoals]     = useState([]);
  const [txns,      setTxns]      = useState([]);
  const [loading,   setLoading]   = useState({ tasks:true, goals:true, txns:true });
  const [newTask,   setNewTask]   = useState("");
  const [newTxn,    setNewTxn]    = useState({ name:"", amount:"", type:"expense", icon:"💳" });
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [editGoal,  setEditGoal]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState("");
  const [baseBalance, setBaseBalance] = useState(14560.75);
  const [editBalance, setEditBalance] = useState(false);

  const showToast = m => { setToast(m); setTimeout(()=>setToast(""), 2400); };

  /* ── Load from Supabase ── */
  const loadAll = useCallback(async () => {
    const [{ data: t }, { data: g }, { data: tx }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: true }),
      supabase.from("goals").select("*").order("created_at", { ascending: true }),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(6),
    ]);
    setTasks(t || []);
    setGoals(g || []);
    setTxns(tx || []);
    setLoading({ tasks:false, goals:false, txns:false });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Realtime subscriptions ── */
  useEffect(() => {
    const taskSub = supabase.channel("tasks-changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"tasks" }, () => {
        supabase.from("tasks").select("*").order("created_at", { ascending:true })
          .then(({ data }) => setTasks(data || []));
      }).subscribe();

    const goalSub = supabase.channel("goals-changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"goals" }, () => {
        supabase.from("goals").select("*").order("created_at", { ascending:true })
          .then(({ data }) => setGoals(data || []));
      }).subscribe();

    const txnSub = supabase.channel("txns-changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"transactions" }, () => {
        supabase.from("transactions").select("*").order("created_at", { ascending:false }).limit(6)
          .then(({ data }) => setTxns(data || []));
      }).subscribe();

    return () => {
      supabase.removeChannel(taskSub);
      supabase.removeChannel(goalSub);
      supabase.removeChannel(txnSub);
    };
  }, []);

  /* ── Task actions ── */
  const toggleTask = async (task) => {
    setTasks(ts => ts.map(t => t.id===task.id ? {...t, done:!t.done} : t));
    await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id);
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("tasks")
      .insert({ text: newTask.trim(), done: false, priority: "medium" })
      .select().single();
    if (data) setTasks(ts => [...ts, data]);
    setNewTask(""); setSaving(false); showToast("Task added ✓");
  };

  const deleteTask = async (id) => {
    setTasks(ts => ts.filter(t => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
    showToast("Task removed");
  };

  /* ── Transaction actions ── */
  const addTxn = async () => {
    if (!newTxn.name.trim() || !newTxn.amount) return;
    setSaving(true);
    const amt = newTxn.type === "expense"
      ? -Math.abs(parseFloat(newTxn.amount))
      :  Math.abs(parseFloat(newTxn.amount));
    const { data } = await supabase.from("transactions")
      .insert({ name: newTxn.name, amount: amt, icon: newTxn.icon,
        date_label: "Just now", type: newTxn.type })
      .select().single();
    if (data) setTxns(tx => [data, ...tx.slice(0, 5)]);
    setNewTxn({ name:"", amount:"", type:"expense", icon:"💳" });
    setShowTxnForm(false); setSaving(false); showToast("Transaction saved ✓");
  };

  /* ── Goal actions ── */
  const saveGoal = async (goal, pct) => {
    setGoals(gs => gs.map(g => g.id===goal.id ? {...g, progress:pct} : g));
    await supabase.from("goals").update({ progress: pct }).eq("id", goal.id);
    setEditGoal(null); showToast("Goal updated ✓");
  };

  /* ── Derived stats ── */
  const done     = tasks.filter(t => t.done).length;
  const pct      = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const income   = txns.filter(t => t.type==="income") .reduce((a,t) => a + Math.abs(parseFloat(t.amount)), 0);
  const expenses = txns.filter(t => t.type==="expense").reduce((a,t) => a + Math.abs(parseFloat(t.amount)), 0);
  const balance  = baseBalance + income - expenses;
  const pColor   = p => p==="high" ? T.red : p==="medium" ? T.yellow : T.faint;

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg,
      fontFamily:"'Plus Jakarta Sans',sans-serif", color:T.text, overflow:"hidden", fontSize:13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;scrollbar-width:thin;scrollbar-color:#2a2a2a transparent}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
        input,select,button{font-family:'Plus Jakarta Sans',sans-serif}
        input::placeholder{color:#3a3a3a}input:focus,select:focus{outline:none}
        button{cursor:pointer;border:none;outline:none}
        .nb:hover{background:rgba(224,109,32,0.12)!important}
        .task-row:hover{background:rgba(255,255,255,0.03)!important}
        .task-row:hover .del{opacity:1!important}
        .txn-row:hover{background:rgba(255,255,255,0.03)!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        .fu{animation:fadeUp 0.3s ease}
        .pulse{animation:pulse 2s infinite}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:18, right:18, zIndex:9999,
          background:`linear-gradient(135deg,${T.orange},#f59e0b)`, color:"white",
          padding:"9px 18px", borderRadius:10, fontSize:13, fontWeight:700,
          boxShadow:`0 4px 24px ${T.orangeGlow}`, animation:"toastIn 0.28s ease" }}>{toast}</div>
      )}

      {/* ── SIDEBAR ── */}
      <div style={{ width:218, background:T.surface, borderRight:`1px solid ${T.border}`,
        display:"flex", flexDirection:"column", padding:"20px 13px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 8px", marginBottom:28 }}>
          <div style={{ width:34, height:34, background:T.orangeDim, border:`1.5px solid ${T.orange}55`,
            borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <rect x="1" y="1" width="6.5" height="6.5" rx="2" fill={T.orange}/>
              <rect x="9.5" y="1" width="6.5" height="6.5" rx="2" fill={T.orange} opacity="0.45"/>
              <rect x="1" y="9.5" width="6.5" height="6.5" rx="2" fill={T.orange} opacity="0.45"/>
              <rect x="9.5" y="9.5" width="6.5" height="6.5" rx="2" fill={T.orange}/>
            </svg>
          </div>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:"2px" }}>TaskFlow</span>
          <div className="pulse" style={{ width:6, height:6, borderRadius:"50%", background:T.green,
            marginLeft:"auto", boxShadow:`0 0 6px ${T.green}` }} />
        </div>

        <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
          <div style={{ fontSize:9, color:T.faint, fontWeight:800, letterSpacing:"1.4px",
            textTransform:"uppercase", padding:"0 9px", marginBottom:6 }}>MAIN</div>
          {NAV.slice(0,5).map(item => {
            const active = activeNav === item;
            return (
              <div key={item} className="nb" onClick={()=>setActiveNav(item)} style={{
                display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:9,
                cursor:"pointer", transition:"all 0.15s", marginBottom:2,
                background:active ? T.orangeDim : "transparent",
                borderLeft:active ? `2.5px solid ${T.orange}` : "2.5px solid transparent" }}>
                <span style={{ fontSize:14, color:active?T.orange:T.faint }}>{NAV_ICO[item]}</span>
                <span style={{ fontSize:13, fontWeight:active?700:400, color:active?T.text:T.muted }}>{item}</span>
              </div>
            );
          })}
          <div style={{ fontSize:9, color:T.faint, fontWeight:800, letterSpacing:"1.4px",
            textTransform:"uppercase", padding:"16px 9px 6px" }}>TOOLS</div>
          {NAV.slice(5).map(item => {
            const active = activeNav === item;
            return (
              <div key={item} className="nb" onClick={()=>setActiveNav(item)} style={{
                display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:9,
                cursor:"pointer", transition:"all 0.15s", marginBottom:2,
                background:active ? T.orangeDim : "transparent",
                borderLeft:active ? `2.5px solid ${T.orange}` : "2.5px solid transparent" }}>
                <span style={{ fontSize:14, color:active?T.orange:T.faint }}>{NAV_ICO[item]}</span>
                <span style={{ fontSize:13, fontWeight:active?700:400, color:active?T.text:T.muted }}>{item}</span>
              </div>
            );
          })}
        </div>

        <div style={{ padding:"12px 10px", borderRadius:12, background:T.raised, border:`1px solid ${T.border2}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:T.orangeDim,
              border:`2px solid ${T.orange}55`, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:12, fontWeight:800, color:T.orange }}>MD</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>Marty Dickerson</div>
              <div style={{ fontSize:10, color:T.muted }}>Premium</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div className="pulse" style={{ width:5, height:5, borderRadius:"50%", background:T.green }} />
            <span style={{ fontSize:10, color:T.green }}>Live · Supabase</span>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 22px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:"2px", lineHeight:1 }}>Dashboard</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
              {loading.tasks ? "Loading..." : `${tasks.filter(t=>!t.done).length} tasks remaining · Mon, May 18 2026`}
            </div>
          </div>
          <div style={{ display:"flex", gap:9, alignItems:"center" }}>
            <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
              borderRadius:9, fontSize:13, fontWeight:700, background:T.orange, border:"none",
              color:"white", boxShadow:`0 0 16px ${T.orangeGlow}` }}
              onClick={() => document.getElementById("newTaskInput")?.focus()}>
              + New Task
            </button>
            <div style={{ width:34, height:34, borderRadius:9, background:T.raised,
              border:`1px solid ${T.border2}`, display:"flex", alignItems:"center",
              justifyContent:"center", position:"relative", cursor:"pointer" }}>
              🔔
              <span style={{ position:"absolute", top:7, right:7, width:6, height:6, borderRadius:"50%",
                background:T.orange, border:`1.5px solid ${T.bg}` }} className="pulse" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:"auto", padding:"18px 22px", display:"flex", flexDirection:"column", gap:14 }}>

          {/* ── ROW 1 ── */}
          <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto", gap:14, alignItems:"stretch" }}>

            {/* Completion Ring */}
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 20px",
              border:`1px solid ${T.border}`, display:"flex", flexDirection:"column", width:210 }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px",
                textTransform:"uppercase", marginBottom:12 }}>Task Completion</div>
              {loading.tasks ? <Spinner /> : (
                <>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1 }}>
                    <Ring pct={pct} color={T.orange} center={
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30,
                          letterSpacing:"1px", color:T.text, lineHeight:1 }}>{pct}%</div>
                        <div style={{ fontSize:9, color:T.muted, marginTop:2 }}>DONE</div>
                      </div>
                    }/>
                  </div>
                  <div style={{ marginTop:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                      <span style={{ color:T.muted }}>Tasks done</span>
                      <span style={{ fontWeight:700 }}>{done}/{tasks.length}</span>
                    </div>
                    {["high","medium","low"].map(p => {
                      const tot = tasks.filter(t=>t.priority===p).length;
                      const dn  = tasks.filter(t=>t.priority===p&&t.done).length;
                      return tot > 0 ? (
                        <div key={p} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                          <div style={{ width:6, height:6, borderRadius:2, background:pColor(p), flexShrink:0 }} />
                          <ProgressBar pct={tot?(dn/tot)*100:0} color={pColor(p)} h={4} />
                          <span style={{ fontSize:10, color:T.muted, width:24, textAlign:"right" }}>{dn}/{tot}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Weekly Bar */}
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 20px", border:`1px solid ${T.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px",
                    textTransform:"uppercase", marginBottom:4 }}>Weekly Activity</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:"1px" }}>
                    {done} of {tasks.length} tasks done
                  </div>
                </div>
                <Pill color={T.green}>{pct}% complete</Pill>
              </div>
              {(() => {
                const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
                // May 18 2026 is a Monday = index 0
                const todayIdx = 0;
                const weekBars = dayNames.map((day, i) => ({
                  day,
                  done: i === todayIdx ? done : i < todayIdx ? Math.floor(Math.random() * 5) + 2 : 0,
                  total: i === todayIdx ? tasks.length : i < todayIdx ? Math.floor(Math.random() * 3) + 5 : 0,
                  isToday: i === todayIdx,
                }));
                return (
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={weekBars} barSize={18} margin={{top:4,right:4,left:-24,bottom:0}}>
                      <XAxis dataKey="day" tick={{fill:T.faint,fontSize:11,fontFamily:"'Plus Jakarta Sans'"}}
                        axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:T.faint,fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CustomTip/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                      <Bar dataKey="done" radius={[5,5,0,0]}>
                        {weekBars.map((e,i)=><Cell key={i} fill={e.isToday ? T.orange : e.done > 0 ? T.orange+"66" : T.faint}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>

            {/* Balance */}
            <div style={{ background:"linear-gradient(145deg,#1a0e06,#131313)", borderRadius:14,
              padding:"18px 20px", border:`1px solid ${T.orange}33`,
              position:"relative", overflow:"hidden", width:210 }}>
              <div style={{ position:"absolute", top:-20, right:-20, width:90, height:90, borderRadius:"50%",
                background:`radial-gradient(circle,${T.orangeDim},transparent)`, pointerEvents:"none" }} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>Balance</div>
                <button onClick={()=>setEditBalance(true)}
                  style={{ fontSize:10, padding:"2px 8px", borderRadius:6, background:T.orangeDim,
                    border:`1px solid ${T.orange}44`, color:T.orange, fontWeight:700 }}>✎ Edit</button>
              </div>
              {loading.txns ? <Spinner /> : (
                <>
                  {editBalance ? (
                    <div className="fu">
                      <input type="number" defaultValue={baseBalance}
                        id="balanceInput"
                        style={{ width:"100%", background:T.raised, border:`1px solid ${T.orange}`,
                          borderRadius:8, padding:"8px 10px", color:T.text, fontSize:14,
                          fontWeight:700, marginBottom:8 }} />
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>setEditBalance(false)}
                          style={{ flex:1, padding:"6px", background:T.faint, borderRadius:7,
                            color:T.muted, fontSize:12 }}>Cancel</button>
                        <button onClick={()=>{
                          const val = parseFloat(document.getElementById("balanceInput").value);
                          if (!isNaN(val)) { setBaseBalance(val); showToast("Balance updated ✓"); }
                          setEditBalance(false);
                        }} style={{ flex:1, padding:"6px", background:T.orange, borderRadius:7,
                          color:"white", fontSize:12, fontWeight:700 }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:"1px", marginBottom:4 }}>
                        ${balance.toLocaleString("en-US",{minimumFractionDigits:2})}
                      </div>
                      <Pill color={T.green}>▲ 3.48%</Pill>
                      <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:8 }}>
                        {[{l:"Income",v:`+$${income.toFixed(2)}`,c:T.green},{l:"Expenses",v:`-$${expenses.toFixed(2)}`,c:T.red}].map(s=>(
                          <div key={s.l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <span style={{ fontSize:11, color:T.muted }}>{s.l}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:s.c }}>{s.v}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Spending Donut */}
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 20px",
              border:`1px solid ${T.border}`, width:200 }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px",
                textTransform:"uppercase", marginBottom:8 }}>Spending</div>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}>
                <PieChart width={90} height={90}>
                  <Pie data={SPEND_DATA} cx={45} cy={45} innerRadius={28} outerRadius={42}
                    dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {SPEND_DATA.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                </PieChart>
              </div>
              {SPEND_DATA.map(s=>(
                <div key={s.name} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:s.color, flexShrink:0 }} />
                  <ProgressBar pct={s.value} color={s.color} h={4} />
                  <span style={{ fontSize:10, color:T.muted, width:22, textAlign:"right" }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── ROW 2 ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1.1fr 0.9fr 0.85fr 0.9fr", gap:14, flex:1, minHeight:0 }}>

            {/* TO-DO */}
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 18px",
              border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>To Do List</div>
                <Pill color={T.orange}>{tasks.filter(t=>!t.done).length} remaining</Pill>
              </div>
              <div style={{ display:"flex", gap:7, marginBottom:12 }}>
                <input id="newTaskInput" value={newTask}
                  onChange={e=>setNewTask(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addTask()}
                  placeholder="Add task… Enter to save"
                  style={{ flex:1, background:T.raised, border:`1px solid ${T.border2}`,
                    borderRadius:9, padding:"8px 12px", color:T.text, fontSize:12 }} />
                <button onClick={addTask} disabled={saving}
                  style={{ padding:"8px 14px", background:`linear-gradient(135deg,${T.orange},#f59e0b)`,
                    borderRadius:9, color:"white", fontSize:16, fontWeight:900,
                    boxShadow:`0 0 12px ${T.orangeGlow}`, opacity:saving?0.6:1 }}>+</button>
              </div>
              {loading.tasks ? <Spinner /> : (
                <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:3 }}>
                  {tasks.map(task=>(
                    <div key={task.id} className="task-row fu" style={{ display:"flex", alignItems:"center",
                      padding:"8px 10px", borderRadius:9, cursor:"pointer", transition:"background 0.13s",
                      background:task.done?"rgba(74,186,114,0.05)":"transparent",
                      border:`1px solid ${task.done?"rgba(74,186,114,0.12)":"transparent"}` }}>
                      <div onClick={()=>toggleTask(task)} style={{ width:17, height:17, borderRadius:5,
                        flexShrink:0, marginRight:9, border:`2px solid ${task.done?T.green:T.faint}`,
                        background:task.done?T.green:"transparent",
                        display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
                        {task.done&&<span style={{ fontSize:9, color:"white", lineHeight:1 }}>✓</span>}
                      </div>
                      <div style={{ width:6, height:6, borderRadius:2, background:pColor(task.priority),
                        flexShrink:0, marginRight:8 }} />
                      <span onClick={()=>toggleTask(task)} style={{ fontSize:12.5, flex:1,
                        textDecoration:task.done?"line-through":"none",
                        color:task.done?T.muted:T.text, transition:"all 0.2s" }}>{task.text}</span>
                      <button className="del" onClick={()=>deleteTask(task.id)}
                        style={{ background:"none", color:T.red, fontSize:15, padding:"0 4px",
                          borderRadius:4, opacity:0, transition:"opacity 0.15s" }}>×</button>
                    </div>
                  ))}
                  {tasks.length===0&&<div style={{ textAlign:"center", color:T.muted, fontSize:12, padding:"20px 0" }}>
                    No tasks — add one above!
                  </div>}
                </div>
              )}
            </div>

            {/* GOALS */}
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 18px",
              border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>Weekly Goals</div>
                <span style={{ fontSize:10, color:T.muted }}>May 18–24</span>
              </div>
              {loading.goals ? <Spinner /> : (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16,
                    padding:"12px 14px", background:T.raised, borderRadius:12, border:`1px solid ${T.border2}` }}>
                    <Ring pct={goals.length?Math.round(goals.reduce((a,g)=>a+g.progress,0)/goals.length):0}
                      size={60} stroke={6} color={T.orange} center={
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"1px", color:T.text }}>
                        {goals.length?Math.round(goals.reduce((a,g)=>a+g.progress,0)/goals.length):0}%
                      </div>
                    }/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>Overall Progress</div>
                      <div style={{ fontSize:11, color:T.muted }}>{goals.filter(g=>g.progress===100).length} of {goals.length} complete</div>
                    </div>
                  </div>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12, overflowY:"auto" }}>
                    {goals.map(g=>(
                      <div key={g.id}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, alignItems:"center" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <div style={{ width:7, height:7, borderRadius:2, background:g.color, flexShrink:0 }} />
                            <span style={{ fontSize:12, fontWeight:500 }}>{g.text}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ fontSize:12, fontWeight:700, color:g.color }}>{g.progress}%</span>
                            <button onClick={()=>setEditGoal({...g})}
                              style={{ background:"none", fontSize:11, color:T.muted, padding:"1px 4px", borderRadius:4 }}
                              onMouseEnter={e=>e.target.style.color=T.orange}
                              onMouseLeave={e=>e.target.style.color=T.muted}>✎</button>
                          </div>
                        </div>
                        <ProgressBar pct={g.progress} color={g.color} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:12, color:T.muted }}>Budget Used</span>
                      <span style={{ fontSize:12, fontWeight:700, color:T.orange }}>
                        {Math.round((expenses/3000)*100)}%
                      </span>
                    </div>
                    <ProgressBar pct={(expenses/3000)*100} color={T.orange} h={5} />
                  </div>
                </>
              )}
            </div>

            {/* CALENDAR */}
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 18px",
              border:`1px solid ${T.border}`, overflowY:"auto" }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px",
                textTransform:"uppercase", marginBottom:12 }}>Calendar</div>
              <Calendar />
            </div>

            {/* FINANCE */}
            <div style={{ background:T.surface, borderRadius:14, padding:"18px 18px",
              border:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
                <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>Finance Tracker</div>
                <button onClick={()=>setShowTxnForm(!showTxnForm)}
                  style={{ fontSize:11, padding:"4px 10px", borderRadius:7, fontWeight:700,
                    background:showTxnForm?T.orangeDim:`linear-gradient(135deg,${T.orange},#f59e0b)`,
                    border:showTxnForm?`1px solid ${T.orange}44`:"none",
                    color:showTxnForm?T.orange:"white" }}>
                  {showTxnForm?"✕":"+ Add"}
                </button>
              </div>

              {showTxnForm && (
                <div className="fu" style={{ background:T.orangeDim, border:`1px solid ${T.orange}33`,
                  borderRadius:10, padding:11, marginBottom:11 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
                    <input value={newTxn.name} onChange={e=>setNewTxn({...newTxn,name:e.target.value})}
                      placeholder="Name"
                      style={{ background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7,
                        padding:"7px 9px", color:T.text, fontSize:11 }} />
                    <input value={newTxn.amount} onChange={e=>setNewTxn({...newTxn,amount:e.target.value})}
                      placeholder="Amount" type="number"
                      style={{ background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7,
                        padding:"7px 9px", color:T.text, fontSize:11 }} />
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <select value={newTxn.type} onChange={e=>setNewTxn({...newTxn,type:e.target.value})}
                      style={{ flex:1, background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7,
                        padding:"7px 9px", color:T.text, fontSize:11 }}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <select value={newTxn.icon} onChange={e=>setNewTxn({...newTxn,icon:e.target.value})}
                      style={{ width:58, background:T.raised, border:`1px solid ${T.border2}`, borderRadius:7,
                        padding:"7px 6px", color:T.text, fontSize:12 }}>
                      {["💳","💼","🛒","🎬","⚡","💻","🍔","✈️","🏥","🎮"].map(ic=><option key={ic}>{ic}</option>)}
                    </select>
                    <button onClick={addTxn} disabled={saving}
                      style={{ padding:"7px 12px", background:`linear-gradient(135deg,${T.orange},#f59e0b)`,
                        borderRadius:7, color:"white", fontSize:12, fontWeight:700, opacity:saving?0.6:1 }}>Save</button>
                  </div>
                </div>
              )}

              {loading.txns ? <Spinner /> : (
                <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
                  {/* Mini income/expense summary */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
                    {[
                    {l:"Income", v:`$${income.toFixed(0)}`,  c:T.green, i:"⬆"},
                    {l:"Spent",  v:`$${expenses.toFixed(0)}`, c:T.red,   i:"⬇"}
                  ].map(s=>(
                      <div key={s.l} style={{ padding:"9px 11px", background:T.raised, borderRadius:9, border:`1px solid ${T.border2}` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                          <span style={{ fontSize:11, color:s.c }}>{s.i}</span>
                          <span style={{ fontSize:10, color:T.muted }}>{s.l}</span>
                        </div>
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:"0.5px", color:s.c }}>{s.v}</div>
                      </div>
                    ))}
                  </div>

                  {txns.map(tx=>{
                    const amt = Math.abs(parseFloat(tx.amount));
                    const isIncome = tx.type === "income";
                    return (
                    <div key={tx.id} className="txn-row" style={{ display:"flex", alignItems:"center", gap:9,
                      padding:"8px 10px", borderRadius:10, transition:"background 0.13s",
                      background:T.raised, border:`1px solid ${T.border}` }}>
                      <div style={{ width:30, height:30, borderRadius:8, display:"flex", alignItems:"center",
                        justifyContent:"center", fontSize:13, flexShrink:0, fontWeight:900,
                        background:isIncome ? T.greenDim : T.redDim,
                        color:isIncome ? T.green : T.red }}>
                        {tx.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.name}</div>
                        <div style={{ fontSize:10, color:T.muted }}>{tx.date_label}</div>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, flexShrink:0,
                        color: isIncome ? T.green : T.red }}>
                        {isIncome ? "+" : "-"}${amt.toFixed(2)}
                      </div>
                      <button className="del" onClick={async ()=>{
                        setTxns(ts=>ts.filter(t=>t.id!==tx.id));
                        await supabase.from("transactions").delete().eq("id", tx.id);
                        showToast("Transaction removed");
                      }} style={{ background:"none", color:T.red, fontSize:14, padding:"0 3px",
                        borderRadius:4, opacity:0, transition:"opacity 0.15s", flexShrink:0 }}>×</button>
                    </div>
                    );
                  })}
                  {txns.length===0&&<div style={{ textAlign:"center", color:T.muted, fontSize:12, padding:"16px 0" }}>No transactions yet</div>}
                </div>
              )}

              <div style={{ marginTop:12, padding:"10px 12px", borderRadius:10,
                background:`linear-gradient(135deg,rgba(224,109,32,0.1),rgba(224,109,32,0.04))`,
                border:`1px solid ${T.orange}33` }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:5 }}>
                  <span style={{ color:T.muted }}>Monthly Budget</span>
                  <span style={{ fontWeight:700, color:T.orange }}>{Math.min(Math.round((expenses/3000)*100),100)}% used</span>
                </div>
                <ProgressBar pct={(expenses/3000)*100} color={T.orange} h={5} />
              </div>
            </div>
          </div>

          {/* ── ROW 3: Weather ── */}
          <div style={{ background:T.surface, borderRadius:14, padding:"18px 22px",
            border:`1px solid ${T.border}`, flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>
                Weather · Atlanta, GA
              </div>
              <Pill color={T.yellow}>Live Forecast</Pill>
            </div>
            <WeatherWidget />
          </div>

        </div>
      </div>

      {/* Edit Goal Modal */}
      {editGoal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
          onClick={e=>e.target===e.currentTarget&&setEditGoal(null)}>
          <div className="fu" style={{ background:T.card, border:`1px solid ${T.border2}`,
            borderRadius:16, padding:26, width:310, boxShadow:"0 28px 60px rgba(0,0,0,0.8)" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:"1.5px", marginBottom:4 }}>Update Goal</div>
            <div style={{ fontSize:13, color:T.muted, marginBottom:18 }}>{editGoal.text}</div>
            <input type="range" min="0" max="100" value={editGoal.progress}
              onChange={e=>setEditGoal({...editGoal,progress:parseInt(e.target.value)})}
              style={{ width:"100%", accentColor:editGoal.color, marginBottom:12, cursor:"pointer" }} />
            <div style={{ textAlign:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:36,
              letterSpacing:"2px", color:editGoal.color, marginBottom:18,
              textShadow:`0 0 20px ${editGoal.color}66` }}>{editGoal.progress}%</div>
            <ProgressBar pct={editGoal.progress} color={editGoal.color} h={6} />
            <div style={{ display:"flex", gap:9, marginTop:18 }}>
              <button onClick={()=>setEditGoal(null)}
                style={{ flex:1, padding:"10px", background:T.raised,
                  border:`1px solid ${T.border2}`, borderRadius:9, color:T.muted, fontSize:13, fontWeight:600 }}>Cancel</button>
              <button onClick={()=>saveGoal(editGoal, editGoal.progress)}
                style={{ flex:1, padding:"10px", background:`linear-gradient(135deg,${T.orange},#f59e0b)`,
                  borderRadius:9, color:"white", fontSize:13, fontWeight:700,
                  boxShadow:`0 0 14px ${T.orangeGlow}` }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
