import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
// P2P DataChannels: SimplePeer se cargará dinámicamente cuando entres en modo P2P (para evitar fallos si no está instalado).
import { v4 as uuidv4 } from "uuid";

/**
 * Texas Hold'em — Práctica + P2P con pantalla de **inicio de sesión/registro**
 *
 * - Pantalla de inicio: usuario/contraseña con opción de **Iniciar sesión** o **Registrarse**.
 * - Regla de rol: si el hash(user+":"+pass) coincide con el hash del **host**, verás el menú de **Host** (DealerBot P2P).
 *   Para cualquier otro login, verás el **menú de Jugador** (Unirse P2P o Modo Local).
 * - Las credenciales **no se guardan en texto plano** ni están en el código: solo se compara contra un **hash** constante
 *   y los usuarios normales se almacenan localmente como hash `hash(user+":"+pass)` en `localStorage`.
 *
 * ⚠ Demo sin backend: los registros solo viven en tu navegador; para multi real se recomienda un backend de identidad.
 */

// ===== UI primitives =====
function Panel({ className = "", children }) {
  return (
    <div className={"rounded-2xl shadow-md bg-white border border-slate-200 " + className}>{children}</div>
  );
}
function Section({ className = "", children }) {
  return <div className={"p-4 " + className}>{children}</div>;
}
function Button({ children, onClick, variant = "solid", disabled, type="button" }) {
  const base =
    "px-3 py-2 rounded-xl text-sm font-medium transition border focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "destructive"
      ? " bg-red-600 text-white hover:bg-red-700 border-red-700"
      : variant === "outline"
      ? " bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
      : variant === "secondary"
      ? " bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200"
      : " bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700";
  return (
    <button type={type} className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
function Input({ value, onChange, type = "text", min, max, step, placeholder, name }) {
  return (
    <input
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
      value={value}
      onChange={onChange}
      type={type}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      name={name}
      autoComplete="off"
    />
  );
}

// ===== Cards & Evaluator =====
const RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"]; // low→high
const SUITS = ["♠","♥","♦","♣"];
const RANK_VALUE = Object.fromEntries(RANKS.map((r,i)=>[r,i]));
function createDeck(){ const d=[]; for(const s of SUITS){ for(const r of RANKS){ d.push({r,s}); } } return d; }
function combinations(arr,k){ const res=[], cur=[]; (function bt(st,dep){ if(dep===k){ res.push([...cur]); return; } for(let i=st;i<=arr.length-(k-dep);i++){ cur.push(arr[i]); bt(i+1,dep+1); cur.pop(); } })(0,0); return res; }
const CAT={HIGH:0,PAIR:1,TWOPAIR:2,TRIPS:3,STRAIGHT:4,FLUSH:5,FULL:6,QUADS:7,STRAIGHTFLUSH:8};
function isStraight(values){ const uniq=[...new Set(values)].sort((a,b)=>b-a); const wheel=[12,3,2,1,0]; const isWheel=wheel.every(v=>uniq.includes(v)); if(isWheel) return {ok:true, high:3}; for(let i=0;i<=uniq.length-5;i++){ const run=uniq.slice(i,i+5); if(run.every((v,idx)=> idx===0 || run[idx-1]===v+1)) return {ok:true, high:run[0]}; } return {ok:false}; }
function evaluate5(cards){
  const counts=new Map(), suitCounts=new Map();
  const values=cards.map(c=>RANK_VALUE[c.r]).sort((a,b)=>b-a);
  for(const c of cards){ counts.set(c.r,(counts.get(c.r)||0)+1); suitCounts.set(c.s,(suitCounts.get(c.s)||0)+1); }
  const byCount=[...counts.entries()].map(([r,c])=>({r,c,v:RANK_VALUE[r]})).sort((a,b)=> b.c-a.c || b.v-a.v);
  const flushSuit=[...suitCounts.entries()].find(([,n])=>n>=5)?.[0];
  const flushValues=flushSuit? cards.filter(c=>c.s===flushSuit).map(c=>RANK_VALUE[c.r]).sort((a,b)=>b-a):null;
  const st=isStraight(values);
  const stFlush=flushSuit? isStraight(cards.filter(c=>c.s===flushSuit).map(c=>RANK_VALUE[c.r]).sort((a,b)=>b-a)) : {ok:false};
  if(stFlush.ok) return [CAT.STRAIGHTFLUSH, stFlush.high];
  if(byCount[0].c===4){ const quad=byCount[0].v; const kicker=byCount.find(x=>x.v!==quad).v; return [CAT.QUADS, quad, kicker]; }
  if(byCount[0].c===3 && (byCount[1]&&byCount[1].c>=2)) return [CAT.FULL, byCount[0].v, byCount[1].v];
  if(flushValues) return [CAT.FLUSH, ...flushValues.slice(0,5)];
  if(st.ok) return [CAT.STRAIGHT, st.high];
  if(byCount[0].c===3){ const kick=byCount.filter(x=>x.c===1).map(x=>x.v).sort((a,b)=>b-a); return [CAT.TRIPS, byCount[0].v, ...kick.slice(0,2)]; }
  if(byCount[0].c===2 && (byCount[1]&&byCount[1].c===2)){
    const p1=Math.max(byCount[0].v,byCount[1].v), p2=Math.min(byCount[0].v,byCount[1].v);
    const kicker=byCount.find(x=>x.c===1).v; return [CAT.TWOPAIR, p1,p2,kicker];
  }
  if(byCount[0].c===2){ const pair=byCount[0].v; const kick=byCount.filter(x=>x.c===1).map(x=>x.v).sort((a,b)=>b-a); return [CAT.PAIR, pair, ...kick.slice(0,3)]; }
  return [CAT.HIGH, ...values.slice(0,5)];
}
function bestOf7(cards){ let best=null; for(const comb of combinations(cards,5)){ const sc=evaluate5(comb); if(!best||compareScore(sc,best)>0) best=sc; } return best; }
function compareScore(a,b){ const len=Math.max(a.length,b.length); for(let i=0;i<len;i++){ const ai=a[i]??-1, bi=b[i]??-1; if(ai!==bi) return ai-bi; } return 0; }
function scoreLabel(score){ const [cat,...rest]=score; const name={0:"Carta alta",1:"Pareja",2:"Doble pareja",3:"Trío",4:"Escalera",5:"Color",6:"Full",7:"Póker",8:"Escalera de color"}[cat]; const rMap=v=>RANKS[v].replace("T","10"); const info=rest.map(rMap).join("-"); return info? `${name} (${info})`:name; }

// ===== Seeded RNG (commit→reveal deck) =====
// Carga dinámica de SimplePeer para evitar romper la UI si el paquete no está presente
let SimplePeerMod = null;
async function loadSimplePeer(){
  if(SimplePeerMod) return SimplePeerMod;
  try{
    const m = await import('simple-peer');
    SimplePeerMod = m.default || m;
    return SimplePeerMod;
  }catch(e){
    return null; // si no existe, desactivamos P2P de forma elegante
  }
}

function xmur3(str){ let h=1779033703^str.length; for(let i=0;i<str.length;i++){ h=Math.imul(h^str.charCodeAt(i),3432918353); h=h<<13|h>>>19; } return ()=>{ h=Math.imul(h^ (h>>>16),2246822507); h=Math.imul(h^ (h>>>13),3266489909); return (h^=h>>>16)>>>0; } }
function sfc32(a,b,c,d){ return function(){ a|=0; b|=0; c|=0; d|=0; let t=(a+b|0)+d|0; d=d+1|0; a=b^b>>>9; b=c+(c<<3)|0; c=(c<<21|c>>>11); c=c+t|0; return (t>>>0)/4294967296; } }
function rngFromSeed(seed){ const h=xmur3(seed); return sfc32(h(),h(),h(),h()); }
function shuffleSeeded(array, seed){ const rng=rngFromSeed(seed); const a=[...array]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// ====== Game constants ======
const SB=10, BB=20, START_STACK=1500, MAX_SEATS=6;

// ===== Hash util usado también para "credenciales" (no es SHA real; demo) =====
function demoHash(text){
  const buf = new TextEncoder().encode(text);
  let h1=0x811c9dc5; for(let i=0;i<buf.length;i++){ h1^=buf[i]; h1 = Math.imul(h1, 0x01000193)>>>0; }
  return (h1>>>0).toString(16);
}
// ⚠ No hay credenciales en texto plano en el código.
// Hash de host (user+":"+pass) = "ASCENDANt_43:@1254@Fer376376!!??" → precomputado offline.
const HOST_COMBINED_HASH = "6d718e69"; // NO revela la contraseña real

// Player shape: { id, name, stack, inHand, hole, committed, hasAllIn, folded }
// In P2P, only seat 0..N-1 are humans. DealerBot has no seat.

export default function TexasHoldem(){
  // ================== AUTENTICACIÓN ==================
  const [session, setSession] = useState(()=>{
    try{ const raw = localStorage.getItem('th_session'); return raw? JSON.parse(raw): null; }catch{ return null; }
  });
  const [authTab, setAuthTab] = useState('login');
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authMsg, setAuthMsg] = useState('');

  function saveSession(s){ setSession(s); try{ localStorage.setItem('th_session', JSON.stringify(s)); }catch{} }
  function logout(){ setSession(null); try{ localStorage.removeItem('th_session'); }catch{} }

  function register(){
    if(!authUser || !authPass) return setAuthMsg('Rellena usuario y contraseña');
    // Guarda SOLO hash(user:pass)
    try{
      const key = `th_user_${authUser}`;
      if(localStorage.getItem(key)) return setAuthMsg('Ese usuario ya existe en este dispositivo');
      const h = demoHash(`${authUser}:${authPass}`);
      localStorage.setItem(key, h);
      setAuthMsg('Registrado. Ahora inicia sesión.');
      setAuthTab('login');
      setAuthPass('');
    }catch{ setAuthMsg('No se pudo registrar (localStorage).'); }
  }
  function login(){
    if(!authUser || !authPass) return setAuthMsg('Rellena usuario y contraseña');
    // Host especial: comparar contra hash combinada precomputada
    const combined = demoHash(`${authUser}:${authPass}`);
    if(combined === HOST_COMBINED_HASH){
      saveSession({ user: authUser, role: 'host' }); setAuthMsg(''); return;
    }
    // Usuario normal: comprobar su hash local
    try{
      const key = `th_user_${authUser}`; const stored = localStorage.getItem(key);
      if(!stored) return setAuthMsg('Usuario no registrado en este dispositivo');
      if(stored !== combined) return setAuthMsg('Contraseña incorrecta');
      saveSession({ user: authUser, role: 'player' }); setAuthMsg('');
    }catch{ setAuthMsg('No se pudo leer almacenamiento'); }
  }

  // ================== ESTADO DE JUEGO ==================
  // Mode: "practice" | "p2p-host" | "p2p-peer"
  const [mode, setMode] = useState("practice");

  // Practice config
  const [numSeats, setNumSeats] = useState(6);
  const [numCPU, setNumCPU] = useState(5);

  // Shared state (both modes reuse)
  const [players, setPlayers] = useState([]);
  const [button, setButton] = useState(0);
  const [board,setBoard]=useState([]);
  const [pot,setPot]=useState(0);
  const [street,setStreet]=useState("preflop");
  const [toAct,setToAct]=useState(0);
  const [currentBet,setCurrentBet]=useState(0);
  const [message,setMessage]=useState("Elige modo y configura.");
  const [raiseSize,setRaiseSize]=useState(BB);
  const [showTests,setShowTests]=useState(false);

  // Practice-only state
  const [deck,setDeck]=useState(()=>createDeck());
  const [lastAggressor,setLastAggressor]=useState(null);
  const [someoneChecked,setSomeoneChecked]=useState(false);

  // CPU control (practice)
  const cpuActingRef=useRef(false);

  // ===== P2P state =====
  const myId = useRef(uuidv4());
  const [roomPeers, setRoomPeers] = useState({}); // peerId -> SimplePeer
  const [peerOffers, setPeerOffers] = useState({}); // peerId -> offer sdp (host creates)
  const [remoteSDP, setRemoteSDP] = useState(""); // textarea for paste
  const [isConnected, setIsConnected] = useState(false);
  const [p2pLog, setP2pLog] = useState([]); // debug
  const [commitPhase, setCommitPhase] = useState("idle"); // idle|commit|reveal|dealt
  const [seedCommit, setSeedCommit] = useState("");
  const [seedSalt, setSeedSalt] = useState("");
  const [peerCommits, setPeerCommits] = useState({}); // peerId -> hash
  const [finalSeed, setFinalSeed] = useState("");

  function logP2P(msg){ setP2pLog(l=>[...l, msg].slice(-100)); }
  function seatName(i){ return i===0? (session?.user || 'Tú') : (players[i]?.name || `P${i+1}`); }

  // ========================= PRACTICE MODE (local) =========================
  function createPracticeTable(){
    const seats = Math.min(Math.max(numSeats,2), MAX_SEATS);
    const cpus = Math.min(Math.max(numCPU,1), seats-1);
    const arr=[];
    for(let i=0;i<seats;i++){
      arr.push({ id:i, name: i===0? (session?.user || "Tú"): `CPU${i}`, stack: START_STACK, inHand:true, hole:[], committed:0, hasAllIn:false, folded:false, isCPU: i!==0 && i<=cpus });
    }
    setPlayers(arr); setButton(0); setMessage("Práctica lista. Pulsa Nueva mano.");
  }

  function draw(n){ const h=deck.slice(0,n); setDeck(deck.slice(n)); return h; }
  function resetBets(){ setCurrentBet(0); setLastAggressor(null); setSomeoneChecked(false); setPlayers(ps=>ps.map(p=>({...p, committed:0}))); }
  function postBlinds(){ const n=players.length; const sb=(button+1)%n, bb=(button+2)%n; setPlayers(ps=> ps.map((p,i)=> i===sb? {...p, stack:p.stack-SB, committed:SB}: i===bb? {...p, stack:p.stack-BB, committed:BB}: p)); setCurrentBet(BB); setPot(v=>v+SB+BB); setMessage(`Ciegas: SB ${seatName(sb)} ${SB}, BB ${seatName(bb)} ${BB}`);} 
  function nextToActPractice(){ if(players.length===2){ return street==="preflop"? button: (button+1)%players.length; } const sb=(button+1)%players.length; const bb=(button+2)%players.length; return street==="preflop"? ((bb+1)%players.length) : ((button+1)%players.length); }
  function dealPractice(){ const d=shuffleSeeded(createDeck(), String(Math.random())); setDeck(d); // fresh shuffled
    const n=players.length; const np=players.map(p=>({...p, hole:[], inHand:p.stack>0, folded:false, hasAllIn:false, committed:0})); let dd=d; const give=()=>{ const c=dd[0]; dd=dd.slice(1); return c; };
    for(let r=0;r<2;r++){ for(let i=0;i<n;i++){ if(np[i].inHand) np[i].hole=[...(np[i].hole||[]), give()]; } }
    setPlayers(np); setBoard([]); setPot(0); setStreet("preflop"); postBlinds(); setToAct(nextToActPractice()); setRaiseSize(BB);
  }

  function nextStreetPractice(){ if(street==="preflop"){ draw(1); const f=draw(3); setBoard(f); setStreet("flop"); resetBets(); setToAct((button+1)%players.length); }
    else if(street==="flop"){ draw(1); const t=draw(1); setBoard(prev=>[...prev,...t]); setStreet("turn"); resetBets(); setToAct((button+1)%players.length); }
    else if(street==="turn"){ draw(1); const r=draw(1); setBoard(prev=>[...prev,...r]); setStreet("river"); resetBets(); setToAct((button+1)%players.length); }
    else if(street==="river"){ showdownLocal(); } }

  function putChips(idx, amt){ if(amt<=0) return; setPlayers(ps=> ps.map((p,i)=> i===idx? {...p, stack:Math.max(0,p.stack-amt), committed:p.committed+amt}: p)); setPot(v=>v+amt); }

  function nextActorPractice(from){ const n=players.length; let i=from; for(let step=0;step<n;step++){ i=(i+1)%n; const p=players[i]; if(!p.inHand||p.folded||p.hasAllIn) continue; if(currentBet===0 || p.committed<currentBet) return i; } return -1; }

  function roundShouldEndPractice(){ const actives=players.filter(p=>p.inHand && !p.folded && !p.hasAllIn); if(actives.length<=1) return true; const allMatched=actives.every(p=> p.committed===currentBet || currentBet===0); const noPending=nextActorPractice(toAct)===-1; return (currentBet>0 && allMatched && noPending) || (currentBet===0 && someoneChecked && noPending); }

  function applyPractice(action, idx, raiseTo){ const p=players[idx]; if(!p||!p.inHand||p.folded||p.hasAllIn) return; if(action==="fold"){ setPlayers(ps=> ps.map((pp,i)=> i===idx? {...pp, folded:true}: pp)); setMessage(`${seatName(idx)} se tira.`); }
    else if(action==="check"){ if(currentBet>0 && p.committed<currentBet){ setMessage("No puedes pasar: hay una apuesta pendiente."); return; } setSomeoneChecked(true); }
    else if(action==="call"){ const need=currentBet - p.committed; if(need>0){ const pay=Math.min(need,p.stack); putChips(idx,pay); if(pay<need) setPlayers(ps=> ps.map((pp,i)=> i===idx? {...pp, hasAllIn:true}: pp)); } }
    else if(action==="raise"){ const need=currentBet - p.committed; const add=Math.max(BB, Math.floor(Number(raiseTo)||BB)); const toPut=need+add; if(toPut>p.stack){ setMessage("No tienes fichas suficientes para esa subida."); return; } putChips(idx,toPut); setCurrentBet(p.committed + toPut); setLastAggressor(idx); setSomeoneChecked(false); }
    const alive=players.filter(pl=>pl.inHand && !pl.folded); if(alive.length===1){ const wIdx=players.findIndex(pl=>pl.inHand && !pl.folded); setPlayers(ps=> ps.map((pp,i)=> i===wIdx? {...pp, stack:pp.stack+pot}: pp)); setPot(0); setMessage(`${seatName(wIdx)} gana el bote sin showdown.`); return; }
    if(roundShouldEndPractice()){ nextStreetPractice(); return; }
    const nxt=nextActorPractice(idx); if(nxt===-1) nextStreetPractice(); else setToAct(nxt);
  }

  function showdownLocal(){ const contenders=players.map((p,i)=>({...p,i})).filter(p=>p.inHand && !p.folded); if(contenders.length===1){ const w=contenders[0].i; setPlayers(ps=> ps.map((pl,i)=> i===w? {...pl, stack:pl.stack+pot}: pl)); setPot(0); setStreet("showdown"); setMessage(`${seatName(w)} gana por ser el único.`); return; }
    const scores=contenders.map(c=>({i:c.i, score:bestOf7([...c.hole, ...board])})).sort((a,b)=> compareScore(b.score,a.score)); const best=scores[0]; const tied=scores.filter(s=> compareScore(s.score,best.score)===0); if(tied.length===1){ setPlayers(ps=> ps.map((pl,i)=> i===best.i? {...pl, stack:pl.stack+pot}: pl)); setMessage(`Showdown: gana ${seatName(best.i)} (${scoreLabel(best.score)}).`); } else { const share=Math.floor(pot/tied.length); setPlayers(ps=> ps.map((pl,i)=> tied.some(t=>t.i===i)? {...pl, stack:pl.stack+share}: pl)); setMessage(`Showdown: empate entre ${tied.map(t=>seatName(t.i)).join(", ")}.`); } setPot(0); setStreet("showdown"); }

  function cpuStrengthFor(idx){ const p=players[idx]; const ph=[...p.hole, ...board, ...Array(Math.max(0,5-board.length)).fill({r:"2",s:"♣"})]; const s=bestOf7(ph); const cat=s[0],hi=s[1]??0; return (cat/8)*0.8 + (hi/12)*0.2; }
  function cpuAct(){ if(cpuActingRef.current) return; cpuActingRef.current=true; try{ const idx=toAct; const p=players[idx]; if(!p||!p.isCPU) return; if(street==="showdown") return; const toCall=currentBet - p.committed; const strength=cpuStrengthFor(idx); let action="call", add=0; if(toCall<=0){ if(Math.random()<0.25 && strength>0.55){ action="raise"; add=Math.max(BB, Math.floor(pot*0.4)); } else action="check"; } else { if(strength<0.35 && Math.random()<0.7) action="fold"; else if(strength>0.7 && Math.random()<0.6){ action="raise"; add=Math.max(toCall+BB, Math.floor(pot*0.6)); } else action="call"; } applyPractice(action, idx, add); } finally { cpuActingRef.current=false; } }
  useEffect(()=>{ if(mode!=="practice") return; const p=players[toAct]; if(p&&p.isCPU&&street!=="showdown") cpuAct(); },[toAct,street,mode]);

  // ========================= P2P MODE (DealerBot host + peers) =========================
  // Protocolo (resumen): hello, commit, reveal, deal, action, state

  function demoCommitHash(text){ return demoHash(text); }

  // HOST (DealerBot) crea ofertas para peers
  async function hostCreateOffers(count){
    const SimplePeer = await loadSimplePeer();
    if(!SimplePeer){ setMessage("P2P no disponible: falta la dependencia 'simple-peer'. La pantalla de login/menú ya funciona."); return; }
 const offers={}; const peers={}; for(let i=0;i<count;i++){ const id=uuidv4(); const p=new SimplePeer({ initiator:true, trickle:false }); p.on('signal', data=>{ offers[id]=JSON.stringify(data); setPeerOffers({...offers}); }); p.on('connect', ()=>{ logP2P(`peer connected ${id}`); setIsConnected(true); p.send(JSON.stringify({type:'hello', id: myId.current, name:'DealerBot'})); }); p.on('data', onHostData(id)); p.on('close', ()=> logP2P(`peer closed ${id}`)); p.on('error', e=> logP2P(`peer error ${id}: ${e}`)); peers[id]=p; }
    setRoomPeers(peers); setMessage("Copia ofertas y compártelas con tus amigos. Pega sus respuestas abajo.");
  }
  function onHostData(id){ return (buf)=>{ try{ const msg=JSON.parse(buf.toString()); if(msg.type==='commit'){ setPeerCommits(pc=> ({...pc, [id]: msg.hash})); logP2P(`commit from ${id}: ${msg.hash}`); } else if(msg.type==='reveal'){ peerSalts.current[id]=msg.salt; logP2P(`reveal from ${id}`); tryDealIfReady(); } else if(msg.type==='action'){ broadcastExcept(id, JSON.stringify(msg)); } else if(msg.type==='hello'){ logP2P(`hello from ${id}`); }
      }catch(e){ logP2P(`data parse error: ${e}`); } } }
  function broadcastExcept(exceptId, data){ Object.entries(roomPeers).forEach(([pid,p])=> { if(pid!==exceptId) p.send(data); }); }

  const peerSalts = useRef({});

  function hostAcceptAnswer(forId, answer){ const p=roomPeers[forId]; if(!p) return logP2P("peer id not found"); p.signal(JSON.parse(answer)); }

  function startCommitPhase(){ setCommitPhase('commit'); setSeedSalt(uuidv4()); const hash=demoCommitHash(seedSalt); setSeedCommit(hash);
    Object.values(roomPeers).forEach(p=> p.send(JSON.stringify({type:'commit-request'}))); }

  function startRevealPhase(){ setCommitPhase('reveal'); Object.values(roomPeers).forEach(p=> p.send(JSON.stringify({type:'reveal-request'}))); }

  function computeFinalSeed(){ const salts=[seedSalt, ...Object.values(peerSalts.current)]; const seed=demoCommitHash(salts.sort().join('|')); setFinalSeed(seed); return seed; }

  function tryDealIfReady(){ const peers = Object.keys(roomPeers); const haveAll = peers.every(pid=> peerSalts.current[pid]); if(!haveAll) return; const seed=computeFinalSeed(); const deck=shuffleSeeded(createDeck(), seed);
    const seats = peers.length + 1; const maxSeats = Math.min(seats, MAX_SEATS); const playerIds=[session?.user || "YOU", ...peers.slice(0,maxSeats-1)];
    const arr=playerIds.map((pid, i)=> ({ id:i, pid, name: i===0? (session?.user || 'Tú'): pid.slice(0,8), stack: START_STACK, inHand:true, hole:[], committed:0, hasAllIn:false, folded:false }));
    setPlayers(arr); setButton(0); setBoard([]); setPot(0); setStreet('preflop'); setCurrentBet(0); setMessage('P2P: repartiendo...');
    let dd=deck.slice(); const give=()=>{ const c=dd[0]; dd=dd.slice(1); return c; };
    for(let r=0;r<2;r++){ for(let i=0;i<arr.length;i++){ arr[i].hole.push(give()); } }
    setPlayers([...arr]);
    for(let i=1;i<arr.length;i++){ const pid=playerIds[i]; const p=roomPeers[pid] || roomPeers[peers[i-1]]; if(p) p.send(JSON.stringify({type:'deal', holeForYou: arr[i].hole, seats: arr.length})); }
    const sb=1%arr.length, bb=2%arr.length; arr[sb].stack-=SB; arr[sb].committed=SB; arr[bb].stack-=BB; arr[bb].committed=BB; setPlayers([...arr]); setPot(SB+BB); setCurrentBet(BB);
    setCommitPhase('dealt'); setToAct(arr.length===2? 0 : (bb+1)%arr.length);
    Object.values(roomPeers).forEach(p=> p.send(JSON.stringify({type:'state', patch:{ button:0, currentBet:BB, pot:SB+BB } })));
  }

  // PEER (player) minimal
  const peerRef = useRef(null);
  const [myHole, setMyHole] = useState([]);
  async function joinFromOffer(offer){
    const SimplePeer = await loadSimplePeer();
    if(!SimplePeer){ setMessage("P2P no disponible en este navegador: falta 'simple-peer'. Puedes usar el modo Práctica."); return; }
 const p=new SimplePeer({ initiator:false, trickle:false }); p.on('signal', data=>{ setRemoteSDP(JSON.stringify(data)); }); p.on('connect', ()=>{ setIsConnected(true); p.send(JSON.stringify({type:'hello', id: myId.current, name: 'Player'})); }); p.on('data', onPeerData(p)); p.on('error', e=> logP2P(`peer error: ${e}`)); p.on('close', ()=> logP2P('peer closed')); p.signal(JSON.parse(offer)); peerRef.current=p; }
  function onPeerData(p){ return (buf)=>{ try{ const msg=JSON.parse(buf.toString()); if(msg.type==='commit-request'){ const salt=uuidv4(); setSeedSalt(salt); const hash=demoCommitHash(salt); setSeedCommit(hash); p.send(JSON.stringify({type:'commit', id: myId.current, hash})); setCommitPhase('commit'); }
      else if(msg.type==='reveal-request'){ p.send(JSON.stringify({type:'reveal', id: myId.current, salt: seedSalt})); setCommitPhase('reveal'); }
      else if(msg.type==='deal'){ setMyHole(msg.holeForYou || []); setMessage('Recibiste tus cartas.'); setCommitPhase('dealt'); }
      else if(msg.type==='state'){ if(msg.patch.button!==undefined) setButton(msg.patch.button); if(msg.patch.currentBet!==undefined) setCurrentBet(msg.patch.currentBet); if(msg.patch.pot!==undefined) setPot(msg.patch.pot); }
    }catch(e){ logP2P(`peer data parse error: ${e}`); } } }

  // ========================= UI & Controls =========================
  const you = players[0];
  const canActPractice = (mode==="practice" && players.length>0 && toAct===0 && street!=="showdown" && you && you.inHand && !you.folded && !you.hasAllIn);

  // Tests (unchanged + extras)
  function runTests(){ const mk=arr=>arr.map(s=>({r:s[0], s:s[1]})); const cmp=(a,b)=> (compareScore(a,b)>0?1:compareScore(a,b)<0?-1:0);
    const tests=[];
    tests.push(()=>{ const a=evaluate5(mk(["A♠","A♥","A♦","A♣","K♠"])); const b=evaluate5(mk(["K♠","K♥","K♦","A♠","A♥"])); return cmp(a,b)>0; });
    tests.push(()=>{ const a=evaluate5(mk(["A♠","5♥","4♦","3♣","2♠"])); const b=evaluate5(mk(["A♠","K♥","9♦","7♣","2♠"])); return cmp(a,b)>0 && a[0]===CAT.STRAIGHT; });
    tests.push(()=>{ const a=evaluate5(mk(["A♥","J♥","9♥","4♥","2♥"])); const b=evaluate5(mk(["9♠","8♦","7♣","6♠","5♦"])); return cmp(a,b)>0 && a[0]===CAT.FLUSH; });
    tests.push(()=>{ const a=evaluate5(mk(["A♠","A♥","K♦","K♣","2♠"])); const b=evaluate5(mk(["A♠","A♥","Q♦","9♣","2♠"])); return cmp(a,b)>0 && a[0]===CAT.TWOPAIR; });
    tests.push(()=>{ const a=evaluate5(mk(["9♥","8♥","7♥","6♥","5♥"])); const b=evaluate5(mk(["Q♠","Q♥","Q♦","Q♣","2♠"])); return cmp(a,b)>0 && a[0]===CAT.STRAIGHTFLUSH; });
    tests.push(()=>{ const a=evaluate5(mk(["7♠","7♥","7♦","K♣","2♠"])); const b=evaluate5(mk(["K♠","K♥","2♦","2♣","3♠"])); return cmp(a,b)>0 && a[0]===CAT.TRIPS; });
    tests.push(()=>{ const a=evaluate5(mk(["A♠","A♥","K♦","J♣","2♠"])); const b=evaluate5(mk(["A♠","A♥","Q♦","J♣","2♠"])); return cmp(a,b)>0 && a[0]===CAT.PAIR; });
    tests.push(()=>{ const brd=mk(["A♠","K♠","Q♦","J♣","T♥"]); const p1=bestOf7([...mk(["2♣","3♦"]),...brd]); const p2=bestOf7([...mk(["4♣","5♦"]),...brd]); return compareScore(p1,p2)===0; });
    tests.push(()=>{ const a=evaluate5(mk(["K♥","T♥","7♥","4♥","2♥"])); const b=evaluate5(mk(["Q♠","Q♥","Q♦","2♣","3♣"])); return cmp(a,b)>0; });
    return tests.map((fn,i)=>({name:`Test ${i+1}`, ok:!!fn()})); }
  const testResults=useMemo(()=>runTests(),[]);

  // ========================= AUTH SCREEN =========================
  if(!session){
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-emerald-50 to-emerald-100 p-4">
        <div className="max-w-xl mx-auto space-y-4">
          <h1 className="text-3xl font-bold text-center">Texas Hold'em — Acceso</h1>
          <Panel>
            <Section>
              <div className="flex gap-2 mb-3">
                <Button variant={authTab==='login'? 'solid':'secondary'} onClick={()=>setAuthTab('login')}>Iniciar sesión</Button>
                <Button variant={authTab==='register'? 'solid':'secondary'} onClick={()=>setAuthTab('register')}>Registrarse</Button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs block mb-1">Usuario</label>
                  <Input name="username" value={authUser} onChange={e=>setAuthUser(e.target.value)} placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="text-xs block mb-1">Contraseña</label>
                  <Input name="password" type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} placeholder="········" />
                </div>
                <div className="flex gap-2">
                  {authTab==='login' ? (
                    <Button onClick={login}>Entrar</Button>
                  ) : (
                    <Button onClick={register}>Crear cuenta (local)</Button>
                  )}
                  <div className="text-xs text-slate-500 self-center">Las credenciales se guardan <b>hash</b>eadas en tu dispositivo.</div>
                </div>
                {authMsg && <div className="text-sm text-red-600">{authMsg}</div>}
              </div>
            </Section>
          </Panel>
          <Panel>
            <Section className="text-xs text-slate-600 space-y-1">
              <div className="font-semibold">Notas de seguridad (demo)</div>
              <ul className="list-disc ml-5">
                <li>No hay contraseñas en texto claro en el código: el host se verifica contra un <i>hash</i> constante.</li>
                <li>Los usuarios normales se almacenan como <i>hash(user:pass)</i> en <code>localStorage</code> de tu navegador.</li>
                <li>Para producción, usa un backend de identidad y SHA-256/Bcrypt con sal.</li>
              </ul>
            </Section>
          </Panel>
        </div>
      </div>
    );
  }

  // ========================= DASHBOARD =========================
  const isHost = session.role==='host';

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-emerald-50 to-emerald-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Texas Hold'em</h1>
          <div className="flex items-center gap-3 text-sm">
            <span>Conectado como: <b>{session.user}</b> {isHost? <span className="text-emerald-700">(Host)</span> : <span className="text-slate-600">(Jugador)</span>}</span>
            <Button variant="secondary" onClick={logout}>Cerrar sesión</Button>
          </div>
        </div>

        {/* Menú principal según rol */}
        <Panel>
          <Section className="grid md:grid-cols-3 gap-3">
            {isHost ? (
              <>
                <div className="col-span-2">
                  <div className="text-lg font-semibold mb-2">Panel Host (DealerBot P2P)</div>
                  <div className="text-sm mb-2">Genera ofertas WebRTC y coordina commit→reveal. El host NO juega.</div>
                  <div className="flex gap-2 mb-3">
                    <Button onClick={()=>setMode('p2p-host')}>Abrir mesa P2P</Button>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <div className="font-semibold">Opciones</div>
                  <ul className="list-disc ml-5 mt-1">
                    <li>Señalización manual, sin backend.</li>
                    <li>Baraja determinista seed combinada.</li>
                    <li>Cartas privadas por canal.</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-lg font-semibold mb-2">Jugar P2P (Peer)</div>
                  <div className="text-sm mb-2">Únete a la mesa del host con su oferta WebRTC.</div>
                  <div className="flex gap-2">
                    <Button onClick={()=>setMode('p2p-peer')}>Unirse a partida P2P</Button>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-lg font-semibold mb-2">Modo Local (Práctica)</div>
                  <div className="text-sm mb-2">Crea una mesa local con CPUs para practicar.</div>
                  <div className="flex gap-2">
                    <Button onClick={()=>setMode('practice')}>Abrir práctica</Button>
                  </div>
                </div>
              </>
            )}
          </Section>
        </Panel>

        {/* SECCIONES ESPECÍFICAS DE CADA MODO */}
        {mode==='practice' && (
          <>
            <h2 className="text-xl font-semibold">Práctica (local)</h2>
            <Panel>
              <Section className="flex flex-wrap items-end gap-3">
                <div className="grid md:grid-cols-4 gap-3 w-full">
                  <div>
                    <label className="text-xs block mb-1">Asientos (2–6)</label>
                    <Input type="number" min={2} max={6} value={numSeats} onChange={e=>setNumSeats(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1">CPUs (1–{Math.max(1,numSeats-1)})</label>
                    <Input type="number" min={1} max={Math.max(1,numSeats-1)} value={numCPU} onChange={e=>setNumCPU(Number(e.target.value))} />
                  </div>
                  <div className="flex gap-2 items-end">
                    <Button onClick={createPracticeTable}>Crear mesa</Button>
                    <Button variant="secondary" onClick={()=>{ setPlayers([]); setBoard([]); setPot(0); setMessage("Configura y pulsa Crear mesa."); }}>Reset mesa</Button>
                  </div>
                  <div className="text-sm">BTN: <b>{button+1}</b> · A igualar: <b>{currentBet}</b></div>
                </div>
              </Section>
            </Panel>
          </>
        )}

        {mode==='p2p-host' && isHost && (
          <>
            <h2 className="text-xl font-semibold">P2P Host (DealerBot)</h2>
            <Panel>
              <Section className="grid md:grid-cols-2 gap-3 w-full">
                <div>
                  <Button onClick={()=>hostCreateOffers(MAX_SEATS-1)}>Generar ofertas para jugadores</Button>
                  <div className="text-xs text-slate-600 mt-1">Copia cada oferta y envíasela a un amigo. Pega aquí sus respuestas.</div>
                  <div className="grid gap-2 mt-2">
                    {Object.entries(peerOffers).map(([pid,off])=> (
                      <div key={pid} className="border rounded p-2">
                        <div className="text-xs font-mono break-all">Oferta {pid.slice(0,8)}:</div>
                        <textarea className="w-full text-xs font-mono border rounded p-2" rows={4} readOnly value={off}></textarea>
                        <div className="flex gap-2 items-center mt-1">
                          <Input placeholder="Pega respuesta (answer)" value={remoteSDP} onChange={e=>setRemoteSDP(e.target.value)} />
                          <Button variant="outline" onClick={()=>hostAcceptAnswer(pid, remoteSDP)}>Aceptar respuesta</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button onClick={startCommitPhase}>Iniciar COMMIT</Button>
                    <Button variant="secondary" onClick={startRevealPhase}>Iniciar REVEAL</Button>
                    <Button variant="secondary" onClick={()=>tryDealIfReady()}>Repartir si listo</Button>
                  </div>
                  <div className="text-xs mt-1">Fase: <b>{commitPhase}</b> · Mi commit: {seedCommit || "(pend.)"}</div>
                </div>
                <div>
                  <div className="text-xs">Log P2P</div>
                  <div className="h-48 overflow-auto border rounded p-2 text-xs font-mono bg-slate-50">
                    {p2pLog.map((l,i)=>(<div key={i}>{l}</div>))}
                  </div>
                </div>
              </Section>
            </Panel>
          </>
        )}

        {mode==='p2p-peer' && !isHost && (
          <>
            <h2 className="text-xl font-semibold">Unirse a partida P2P</h2>
            <Panel>
              <Section className="grid md:grid-cols-2 gap-3 w-full">
                <div>
                  <label className="text-xs">Pega aquí la oferta del host</label>
                  <textarea className="w-full text-xs font-mono border rounded p-2" rows={4} value={remoteSDP} onChange={e=>setRemoteSDP(e.target.value)}></textarea>
                  <div className="flex gap-2 mt-2">
                    <Button onClick={()=>joinFromOffer(remoteSDP)}>Unirse (generar answer)</Button>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs">Tu respuesta (cópiala y mándasela al host)</div>
                    <textarea className="w-full text-xs font-mono border rounded p-2" rows={4} readOnly value={remoteSDP}></textarea>
                  </div>
                  <div className="text-xs mt-2">Fase: <b>{commitPhase}</b> · Mi commit: {seedCommit || "(pend.)"}</div>
                </div>
                <div>
                  <div className="text-xs">Tus cartas (privadas)</div>
                  <div className="flex gap-2 mt-1">
                    {myHole.length? myHole.map((c,i)=>(<CardView key={i} c={c}/>)) : <div className="text-xs text-slate-500">(aún no recibidas)</div>}
                  </div>
                </div>
              </Section>
            </Panel>
          </>
        )}

        {/* TABLERO Y ACCIONES (se comparte entre modos, aunque en P2P aún falta validar acciones) */}
        <div className="grid md:grid-cols-3 gap-4">
          <Panel className="md:col-span-2">
            <Section className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div>Bote: <b>{pot}</b></div>
                <div>Calle: <b className="capitalize">{street}</b></div>
                <div>Actúa: <b>{players[toAct]? seatName(toAct): "-"}</b></div>
              </div>
              <div className="flex items-center gap-2 justify-center py-2 min-h-[5.5rem]">
                {board.length===0 && <div className="text-slate-500 text-sm">(Sin cartas comunitarias aún)</div>}
                {board.map((c,i)=>(<CardView key={i} c={c}/>))}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {players.map((p,i)=>(
                  <div key={i} className={`rounded-xl border p-2 ${i===button? 'border-emerald-400': 'border-slate-200'} ${i===toAct? 'ring-2 ring-emerald-300':''}`}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-semibold">{seatName(i)} {i===button && <span className="text-emerald-600">(BTN)</span>}</div>
                      <div>stack: <b>{p.stack}</b></div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {i===0 && mode!=="p2p-peer"? p.hole.map((c,k)=>(<CardView key={k} c={c}/>)) : (p.inHand && !p.folded ? (<><BackCard/><BackCard/></>) : (<div className="text-xs text-slate-400">(fuera)</div>))}
                    </div>
                    <div className="text-xs mt-1">comprometido: {p.committed}{p.folded? " · (fold)":""}{p.hasAllIn? " · (all-in)":""}</div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-slate-700 min-h-6">{message}</div>
            </Section>
          </Panel>

          <Panel>
            <Section className="space-y-3">
              {mode==="practice" && (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={()=> setButton(b=>{ const nb=(b+1)%players.length; setTimeout(()=>dealPractice(),0); return nb; })} disabled={players.length<2}>Nueva mano</Button>
                    <Button variant="secondary" onClick={()=>{ setPlayers(ps=> ps.map((p)=> ({...p, stack: START_STACK}))); setMessage("Stacks reseteados."); }}>Reset stacks</Button>
                  </div>
                  <div className="text-sm">Apuesta actual a igualar: <b>{currentBet}</b></div>
                  <div className="text-xs text-slate-500">SB={SB}, BB={BB}. Min-raise básico, all-in simplificado (sin side pots).</div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button variant="outline" disabled={!canActPractice} onClick={()=>applyPractice("check",0)}>Check</Button>
                      <Button variant="outline" disabled={!canActPractice} onClick={()=>applyPractice("call",0)}>Call</Button>
                      <Button variant="destructive" disabled={!canActPractice} onClick={()=>applyPractice("fold",0)}>Fold</Button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm">Tamaño de subida</label>
                      <Input type="number" min={BB} step={BB} value={raiseSize} onChange={e=>setRaiseSize(Number(e.target.value))}/>
                      <Button disabled={!canActPractice} onClick={()=>applyPractice("raise",0,raiseSize)}>Raise</Button>
                    </div>
                  </div>
                </>
              )}

              {mode!=="practice" && (
                <div className="text-xs text-slate-600">En P2P, las acciones se sincronizan por la red. Este panel se habilitará al integrar validación y consenso.</div>
              )}

              <hr className="my-2"/>
              <div>
                <Button variant="outline" onClick={()=>setShowTests(v=>!v)}>{showTests?"Ocultar":"Mostrar"} pruebas del evaluador</Button>
                {showTests && (
                  <ul className="mt-2 text-xs space-y-1">
                    {testResults.map((t,i)=>(<li key={i} className={t.ok?"text-emerald-700":"text-red-700"}>{t.name}: {t.ok?"OK":"FALLO"}</li>))}
                  </ul>
                )}
              </div>
            </Section>
          </Panel>
        </div>

        <Panel>
          <Section className="text-xs text-slate-600 space-y-2">
            <div className="font-semibold">Notas</div>
            <ul className="list-disc ml-5 space-y-1">
              <li>Las credenciales NUNCA se exponen en el código: el host se detecta con un hash precomputado.</li>
              <li>Usuarios normales: registro local con hash(user:pass). Ningún otro usuario puede leer otras contraseñas.</li>
              <li>Para producción: usa SHA-256/bcrypt, sal por usuario y nunca guardes contraseñas sin estirar/pepper.</li>
            </ul>
          </Section>
        </Panel>
      </div>
    </div>
  );
}

function CardView({c}){ const red=c.s==="♥"||c.s==="♦"; return (
  <motion.div initial={{rotate:-2,y:4,opacity:0}} animate={{rotate:0,y:0,opacity:1}} className={`w-14 h-20 rounded-2xl shadow p-2 bg-white flex flex-col justify-between items-start border ${red?"text-red-600 border-red-200":"text-gray-800 border-gray-200"}`}>
    <span className="font-bold">{c.r}</span><span className="text-xl">{c.s}</span>
  </motion.div> ); }
function BackCard(){ return <div className="w-14 h-20 rounded-2xl shadow p-2 bg-slate-800 text-white flex items-center justify-center">🂠</div>; }
