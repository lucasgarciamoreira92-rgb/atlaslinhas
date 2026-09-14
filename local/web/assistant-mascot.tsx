import {useEffect,useRef,type RefObject} from 'react';
import mascotArt from './atlinhas-art.svg?raw';

type Props={open:boolean;onToggle:()=>void;rootRef:RefObject<HTMLElement|null>;panelRef:RefObject<HTMLElement|null>};
const gestures=['gesture-curious','gesture-nod','gesture-settle','gesture-scan','double-blink'];
const sequence=[
 {front:false,gesture:'gesture-curious',duration:4600},
 {front:true,gesture:'wave',duration:5800},
 {front:false,gesture:'gesture-settle',duration:7000},
 {front:true,gesture:'double-blink',duration:5600},
 {front:false,gesture:'gesture-scan',duration:6200},
 {front:true,gesture:'gesture-nod',duration:6000},
 {front:false,gesture:null,duration:7400},
 {front:true,gesture:'wave',duration:5600},
 {front:false,gesture:null,duration:6600},
];

export default function AssistantMascot({open,onToggle,rootRef,panelRef}:Props){
 const launchRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const root=rootRef.current,panel=panelRef.current,launch=launchRef.current;
  if(!root||!panel||!launch)return;
  const hello=root.querySelector<HTMLElement>('.mascot-hello')!;
  const link=root.querySelector<SVGSVGElement>('.speech-link')!;
  const tail=root.querySelector<SVGPathElement>('.speech-tail')!;
  const anchor=root.querySelector<SVGCircleElement>('.face-anchor')!;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const timers=new Set<ReturnType<typeof setTimeout>>();
  let hovering=launch.matches(':hover'),focused=document.activeElement===launch,index=0,frameId:number|undefined;
  let idleTimer:ReturnType<typeof setTimeout>|undefined,gestureTimer:ReturnType<typeof setTimeout>|undefined;
  let startTimer:ReturnType<typeof setTimeout>|undefined,waveTimer:ReturnType<typeof setTimeout>|undefined;
  let disposed=false;
  const later=(action:()=>void,delay:number)=>{const id=setTimeout(()=>{timers.delete(id);if(!disposed)action()},delay);timers.add(id);return id;};
  const cancel=(id:ReturnType<typeof setTimeout>|undefined)=>{if(id!==undefined){clearTimeout(id);timers.delete(id)}};
  const face=()=>root.classList.toggle('face-front',hovering||focused||open||root.classList.contains('idle-front'));
  const canIdle=()=>!disposed&&!document.hidden&&!reduced.matches&&!hovering&&!focused&&!open;
  function blink(double=false){
   if(reduced.matches||!root!.classList.contains('face-front'))return;
   root!.classList.remove('blinking','double-blink');void launch!.offsetWidth;
   root!.classList.add(double?'double-blink':'blinking');
   later(()=>root!.classList.remove('blinking','double-blink'),460);
  }
  function wave(){
   if(reduced.matches)return;
   cancel(waveTimer);root!.classList.remove('waving');void launch!.offsetWidth;
   root!.classList.add('waving');waveTimer=later(()=>root!.classList.remove('waving'),2200);
  }
  function pauseIdle(){
   cancel(idleTimer);cancel(gestureTimer);cancel(startTimer);
   root!.classList.remove(...gestures,'idle-front','idle-mode');face();
  }
  function scheduleIdle(delay=2200){cancel(idleTimer);if(canIdle())idleTimer=later(nextIdle,delay)}
  function nextIdle(){
   if(!canIdle())return;
   cancel(startTimer);cancel(gestureTimer);root!.classList.remove(...gestures);
   const step=sequence[index++%sequence.length];
   root!.classList.add('idle-mode');root!.classList.toggle('idle-front',step.front);face();
   startTimer=later(()=>{
    if(!canIdle()||!root!.classList.contains('idle-mode'))return;
    if(step.gesture==='wave')wave();else if(step.gesture==='double-blink')blink(true);else if(step.gesture)root!.classList.add(step.gesture);
    gestureTimer=later(()=>root!.classList.remove(...gestures),3300);
   },520);
   idleTimer=later(nextIdle,step.duration);
  }
  function updateTail(){
   if(disposed||!root!.isConnected)return;
   const showing=open||root!.classList.contains('is-greeting');
   if(!showing){tail.setAttribute('d','');return;}
   const r=root!.getBoundingClientRect(),bubble=(open?panel!:hello).getBoundingClientRect(),matrix=anchor.getScreenCTM();
   if(!matrix||!r.width||!r.height)return;
   const point=new DOMPoint(anchor.cx.baseVal.value,anchor.cy.baseVal.value).matrixTransform(matrix);
   const sx=root!.clientWidth/r.width,sy=root!.clientHeight/r.height,x=(point.x-r.left)*sx,y=(point.y-r.top)*sy;
   const left=(bubble.left-r.left)*sx,right=(bubble.right-r.left)*sx,baseY=(bubble.bottom-r.top)*sy-2;
   const baseX=Math.max(left+24,Math.min(right-27,x-35)),middleY=baseY+(y-baseY)*.59;
   link.setAttribute('viewBox',`0 0 ${root!.clientWidth} ${root!.clientHeight}`);
   tail.setAttribute('d',`M ${baseX-7} ${baseY} C ${baseX-9} ${middleY}, ${x-29} ${y-3}, ${x} ${y} C ${x-19} ${y-10}, ${baseX+10} ${middleY}, ${baseX+7} ${baseY} Z`);
  }
  function frame(){frameId=undefined;if(disposed||document.hidden)return;updateTail();if(!reduced.matches&&(open||root!.classList.contains('is-greeting')))frameId=requestAnimationFrame(frame)}
  function ensureTail(){updateTail();if(frameId===undefined&&!document.hidden&&!reduced.matches&&(open||root!.classList.contains('is-greeting')))frameId=requestAnimationFrame(frame)}
  function greet(on:boolean){
   root!.classList.toggle('is-greeting',on);
   if(on){pauseIdle();face();wave();later(()=>blink(),640)}else{face();scheduleIdle(1600)}
   ensureTail();
  }
  const enter=()=>{hovering=true;greet(true)},leave=()=>{hovering=false;if(!focused)greet(false)};
  const focus=()=>{focused=true;greet(true)},blur=()=>{focused=false;if(!hovering)greet(false)};
  const visibility=()=>{root.classList.toggle('motion-paused',document.hidden);if(document.hidden)pauseIdle();else{ensureTail();scheduleIdle(1800)}};
  const motionChange=()=>{if(reduced.matches)pauseIdle();else scheduleIdle();ensureTail()};
  const focusIn=(event:FocusEvent)=>{if(event.target instanceof HTMLTextAreaElement)root.classList.add('is-listening')};
  const focusOut=()=>root.classList.remove('is-listening');
  root.classList.toggle('is-open',open);face();
  launch.addEventListener('pointerenter',enter);launch.addEventListener('pointerleave',leave);
  launch.addEventListener('focus',focus);launch.addEventListener('blur',blur);
  root.addEventListener('focusin',focusIn);root.addEventListener('focusout',focusOut);
  document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',motionChange);
  window.addEventListener('resize',ensureTail);
  const observer=new ResizeObserver(ensureTail);observer.observe(root);observer.observe(panel);observer.observe(hello);
  if(open){wave();ensureTail()}else if(hovering||focused)greet(true);else scheduleIdle(1800);
  return()=>{
   disposed=true;for(const timer of timers)clearTimeout(timer);if(frameId!==undefined)cancelAnimationFrame(frameId);observer.disconnect();
   launch.removeEventListener('pointerenter',enter);launch.removeEventListener('pointerleave',leave);launch.removeEventListener('focus',focus);launch.removeEventListener('blur',blur);
   root.removeEventListener('focusin',focusIn);root.removeEventListener('focusout',focusOut);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motionChange);window.removeEventListener('resize',ensureTail);
   root.classList.remove(...gestures,'is-open','is-greeting','face-front','idle-front','idle-mode','blinking','waving','motion-paused','is-listening');tail.setAttribute('d','');
  };
 },[open,rootRef,panelRef]);
 return <>
  <div className="mascot-hello" aria-hidden="true">Como posso te ajudar?</div>
  <svg className="speech-link" aria-hidden="true"><path className="speech-tail"/></svg>
  <button ref={launchRef} type="button" className="assistant-launch" onClick={onToggle} aria-label={open?'Fechar assistente Atlinhas':'Abrir assistente Atlinhas'} aria-expanded={open} aria-controls="assistant-panel">
   <span className="mascot-shadow" aria-hidden="true"/>
   <span className="mascot-art" aria-hidden="true" dangerouslySetInnerHTML={{__html:mascotArt}}/>
   <span className="mascot-name" aria-hidden="true">Atlinhas</span>
  </button>
 </>;
}
