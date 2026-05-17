(function () {
'use strict';
const STORAGE_KEY = 'roq_current', HISTORY_KEY = 'roq_history', MAX_HISTORY = 20;
const $ = s => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const NODE_KEYS = ['position','object','others','known','unknown'];
const NODE_LABELS = {position:'Your Position',object:'The Object',others:'Others Position(s)',known:'Known',unknown:'Unknown'};
const NODE_COLORS = {position:'#e0e0e0',object:'#42a5f5',others:'#ffd54f',known:'#4caf50',unknown:'#ff6b6b'};
const ARROW_COLORS = [
    {name:'White',val:'#e0e0e0'},{name:'Blue',val:'#42a5f5'},{name:'Yellow',val:'#ffd54f'},
    {name:'Green',val:'#4caf50'},{name:'Red',val:'#ff6b6b'},{name:'Cyan',val:'#4fc3f7'},{name:'Orange',val:'#ff8a50'}
];
const LINE_STYLES = [{name:'Solid',val:''},{name:'Dashed',val:'8 5'},{name:'Dotted',val:'3 4'}];

const fields = {position:$('#input-position'),object:$('#input-object'),others:$('#input-others'),known:$('#input-known'),unknown:$('#input-unknown'),notes:$('#input-notes')};
const svg = $('#roq-svg');
let connections = []; // {id,from,to,label,color,dash}
let nodeScale = 1.0;
let dirty = false;

// Toast
function toast(msg,type='info'){const e=document.createElement('div');e.className=`toast toast-${type}`;e.textContent=msg;$('#toast-container').appendChild(e);setTimeout(()=>e.remove(),3100);}

// Confirm
function showConfirm(title,message){return new Promise(r=>{$('#confirm-title').textContent=title;$('#confirm-msg').textContent=message;$('#confirm-overlay').classList.remove('hidden');const ok=()=>{cl();r(true);},ca=()=>{cl();r(false);},cl=()=>{$('#confirm-overlay').classList.add('hidden');$('#confirm-ok').removeEventListener('click',ok);$('#confirm-cancel').removeEventListener('click',ca);};$('#confirm-ok').addEventListener('click',ok);$('#confirm-cancel').addEventListener('click',ca);});}

function escHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

// Data
function getFormData(){return{position:fields.position.value.trim(),object:fields.object.value.trim(),others:fields.others.value.trim(),known:fields.known.value.trim(),unknown:fields.unknown.value.trim(),notes:fields.notes.value.trim(),connections:JSON.parse(JSON.stringify(connections)),nodeScale};}
function setFormData(d){if(!d)return;fields.position.value=d.position||'';fields.object.value=d.object||'';fields.others.value=d.others||'';fields.known.value=d.known||'';fields.unknown.value=d.unknown||'';fields.notes.value=d.notes||'';connections=d.connections||[];nodeScale=d.nodeScale||1;$('#node-scale-slider').value=nodeScale;$('#scale-val').textContent=nodeScale.toFixed(1)+'x';renderConnections();drawDiagram();}

// Storage
function saveCurrent(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(getFormData()));$('#autosave-badge').classList.add('visible');setTimeout(()=>$('#autosave-badge').classList.remove('visible'),2000);}catch(e){}}
function loadCurrent(){try{const r=localStorage.getItem(STORAGE_KEY);if(r)setFormData(JSON.parse(r));}catch(e){}}
function getHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY))||[];}catch{return[];}}
function saveHistory(l){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(l));}catch(e){}}

// Connections UI
function addConnection(){
    connections.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),from:'position',to:'object',label:'',color:'#e0e0e0',dash:''});
    renderConnections();drawDiagram();dirty=true;
}

function renderConnections(){
    const list=$('#connections-list');
    list.innerHTML='';
    connections.forEach((c,i)=>{
        const div=document.createElement('div');div.className='conn-item';
        div.innerHTML=`<button class="btn-del-conn" data-idx="${i}" title="Remove">&times;</button>
<div class="conn-row">
<select class="conn-from" data-idx="${i}">${NODE_KEYS.map(k=>`<option value="${k}"${c.from===k?' selected':''}>${NODE_LABELS[k]}</option>`).join('')}</select>
<span class="conn-arrow-icon">→</span>
<select class="conn-to" data-idx="${i}">${NODE_KEYS.map(k=>`<option value="${k}"${c.to===k?' selected':''}>${NODE_LABELS[k]}</option>`).join('')}</select>
</div>
<div class="conn-row">
<input class="conn-label-input" data-idx="${i}" placeholder="Label (e.g. Using, Remote Access)" value="${escHtml(c.label)}">
<select class="conn-style" data-idx="${i}">${LINE_STYLES.map(s=>`<option value="${s.val}"${c.dash===s.val?' selected':''}>${s.name}</option>`).join('')}</select>
<select class="conn-color" data-idx="${i}">${ARROW_COLORS.map(a=>`<option value="${a.val}"${c.color===a.val?' selected':''}>${a.name}</option>`).join('')}</select>
</div>`;
        list.appendChild(div);
    });
}

$('#connections-list').addEventListener('input',e=>{
    const t=e.target, i=parseInt(t.dataset.idx);
    if(isNaN(i)||!connections[i])return;
    if(t.classList.contains('conn-from'))connections[i].from=t.value;
    if(t.classList.contains('conn-to'))connections[i].to=t.value;
    if(t.classList.contains('conn-label-input'))connections[i].label=t.value;
    if(t.classList.contains('conn-style'))connections[i].dash=t.value;
    if(t.classList.contains('conn-color'))connections[i].color=t.value;
    dirty=true;drawDiagram();
});
$('#connections-list').addEventListener('change',e=>{
    const t=e.target, i=parseInt(t.dataset.idx);
    if(isNaN(i)||!connections[i])return;
    if(t.classList.contains('conn-from'))connections[i].from=t.value;
    if(t.classList.contains('conn-to'))connections[i].to=t.value;
    if(t.classList.contains('conn-style'))connections[i].dash=t.value;
    if(t.classList.contains('conn-color'))connections[i].color=t.value;
    dirty=true;drawDiagram();
});
$('#connections-list').addEventListener('click',e=>{
    if(e.target.classList.contains('btn-del-conn')){
        connections.splice(parseInt(e.target.dataset.idx),1);
        renderConnections();drawDiagram();dirty=true;
    }
});
$('#btn-add-conn').addEventListener('click',addConnection);

// Scale
$('#node-scale-slider').addEventListener('input',e=>{
    nodeScale=parseFloat(e.target.value);
    $('#scale-val').textContent=nodeScale.toFixed(1)+'x';
    drawDiagram();
});

// SVG helpers
function el(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}

// Node positions (viewBox 800x600)
function getNodePos(){return{position:{x:120,y:300},object:{x:400,y:300},others:{x:680,y:300},known:{x:400,y:90},unknown:{x:400,y:510}};}

function drawDiagram(){
    const data=getFormData();svg.innerHTML='';
    const ns=nodeScale;
    const defs=el('defs');
    // Arrow markers for each color
    ARROW_COLORS.forEach(c=>{
        const m=el('marker',{id:'arr-'+c.val.slice(1),viewBox:'0 0 10 10',refX:'9',refY:'5',markerWidth:'7',markerHeight:'7',orient:'auto-start-reverse'});
        m.appendChild(el('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:c.val}));defs.appendChild(m);
    });
    const glow=el('filter',{id:'glow',x:'-30%',y:'-30%',width:'160%',height:'160%'});
    glow.appendChild(el('feGaussianBlur',{stdDeviation:'3',result:'blur'}));
    const mg=el('feMerge');mg.appendChild(el('feMergeNode',{in:'blur'}));mg.appendChild(el('feMergeNode',{in:'SourceGraphic'}));
    glow.appendChild(mg);defs.appendChild(glow);svg.appendChild(defs);

    const np=getNodePos();
    const rC=55*ns, rH=61*ns, rW=170*ns, rHt=60*ns;

    // Draw user connections
    connections.forEach(c=>{
        if(c.from===c.to)return;
        const fp=np[c.from],tp=np[c.to];if(!fp||!tp)return;
        // Check if we need curve (for crossing-center avoidance)
        const needsCurve=shouldCurve(c.from,c.to);
        const mid=needsCurve?getCurveCP(c.from,c.to,fp,tp):null;
        // For curves, use control point direction for edge calc
        const s=edgePoint(c.from,fp,mid||tp,ns);
        const e=edgePoint(c.to,tp,mid||fp,ns);
        const markerId='arr-'+c.color.slice(1);
        if(mid){
            const attrs={d:`M${s.x},${s.y} Q${mid.x},${mid.y} ${e.x},${e.y}`,fill:'none',stroke:c.color,'stroke-width':'1.8','marker-end':`url(#${markerId})`};
            if(c.dash)attrs['stroke-dasharray']=c.dash;
            svg.appendChild(el('path',attrs));
            const lx=0.25*s.x+0.5*mid.x+0.25*e.x, ly=0.25*s.y+0.5*mid.y+0.25*e.y;
            if(c.label)placeLabel(lx,ly,c.label,c.color);
        } else {
            // Check for duplicate pairs to offset
            const off=getLineOffset(c,connections);
            const dx=e.x-s.x, dy=e.y-s.y, len=Math.sqrt(dx*dx+dy*dy)||1;
            const nx=-dy/len*off, ny=dx/len*off;
            const attrs={x1:s.x+nx,y1:s.y+ny,x2:e.x+nx,y2:e.y+ny,stroke:c.color,'stroke-width':'1.8','marker-end':`url(#${markerId})`};
            if(c.dash)attrs['stroke-dasharray']=c.dash;
            svg.appendChild(el('line',attrs));
            if(c.label)placeLabel((s.x+e.x)/2+nx,(s.y+e.y)/2+ny-10,c.label,c.color);
        }
    });

    // Draw nodes on top — label outside, user input inside
    drawCircle(np.position.x,np.position.y,52*ns,'#e0e0e0','Your Position',data.position,'above');
    drawHexagon(np.object.x,np.object.y,58*ns,'#42a5f5','The Object',data.object,'above');
    drawCircle(np.others.x,np.others.y,52*ns,'#ffd54f','Others Position(s)',data.others,'above');
    drawRect(np.known.x,np.known.y,rW,rHt,'#4caf50','Known',data.known,'above');
    drawRect(np.unknown.x,np.unknown.y,rW,rHt,'#ff6b6b','Unknown',data.unknown,'below');

    svg.appendChild(el('text',{x:400,y:28,'text-anchor':'middle',fill:'#8b949e','font-size':'11','font-weight':'400','letter-spacing':'2'},'RELATIONSHIP-ORIENTED QUESTIONING MODEL'));
}

function shouldCurve(from,to){
    // Only curve connections that would cross through the center node
    const pairs=[['position','unknown'],['unknown','position'],
                 ['known','unknown'],['unknown','known'],
                 ['unknown','others'],['others','unknown'],
                 ['known','others'],['others','known']];
    return pairs.some(p=>p[0]===from&&p[1]===to);
}

function getCurveCP(from,to,fp,tp){
    const mx=(fp.x+tp.x)/2, my=(fp.y+tp.y)/2;
    // Offset control point away from center (400,300)
    const cx=400, cy=300;
    let ox=mx-cx, oy=my-cy;
    const len=Math.sqrt(ox*ox+oy*oy)||1;
    const push=120;
    if(len<30){// nearly centered, push based on direction
        if(from==='known'&&(to==='unknown'))return{x:mx+push,y:my};
        if(to==='known'&&(from==='unknown'))return{x:mx-push,y:my};
        return{x:mx+push,y:my};
    }
    return{x:mx+ox/len*push,y:my+oy/len*push};
}

function getLineOffset(conn,all){
    // Find other connections between same pair, offset them
    const pairKey=(a,b)=>[a,b].sort().join('-');
    const pk=pairKey(conn.from,conn.to);
    const same=all.filter(c=>pairKey(c.from,c.to)===pk);
    if(same.length<=1)return 0;
    const idx=same.indexOf(conn);
    const spacing=8;
    return(idx-(same.length-1)/2)*spacing;
}

function edgePoint(nodeKey,center,target,ns){
    const a=Math.atan2(target.y-center.y,target.x-center.x);
    if(nodeKey==='position'||nodeKey==='others'){
        const r=55*ns;
        return{x:center.x+r*Math.cos(a),y:center.y+r*Math.sin(a)};
    }
    if(nodeKey==='object'){
        const r=61*ns;
        const angles=[];for(let i=0;i<6;i++)angles.push((Math.PI/3)*i-Math.PI/6);
        let minD=Infinity,px=center.x,py=center.y;
        for(let i=0;i<6;i++){
            const a1=angles[i],a2=angles[(i+1)%6];
            const x1=center.x+r*Math.cos(a1),y1=center.y+r*Math.sin(a1);
            const x2=center.x+r*Math.cos(a2),y2=center.y+r*Math.sin(a2);
            const dx=Math.cos(a),dy=Math.sin(a),ex=x2-x1,ey=y2-y1;
            const den=dx*ey-dy*ex;if(Math.abs(den)<0.001)continue;
            const t=((x1-center.x)*ey-(y1-center.y)*ex)/den;
            const u=((x1-center.x)*dy-(y1-center.y)*dx)/den;
            if(t>0&&u>=0&&u<=1&&t<minD){minD=t;px=center.x+dx*t;py=center.y+dy*t;}
        }
        return{x:px,y:py};
    }
    // Rect (known/unknown)
    const hw=85*ns, hh=30*ns;
    const dx=target.x-center.x, dy=target.y-center.y;
    if(!dx&&!dy)return{x:center.x,y:center.y-hh};
    const s=Math.min(hw/(Math.abs(dx)||0.01),hh/(Math.abs(dy)||0.01));
    return{x:center.x+dx*s,y:center.y+dy*s};
}

function drawCircle(cx,cy,r,color,fixedLabel,userInput,labelPos){
    svg.appendChild(el('circle',{cx,cy,r,fill:'#0d1117',stroke:color,'stroke-width':'2',filter:'url(#glow)'}));
    // Fixed label outside
    const ly=labelPos==='above'?cy-r-14:cy+r+16;
    svg.appendChild(el('text',{x:cx,y:ly,'text-anchor':'middle','dominant-baseline':'central',fill:color,'font-size':'10','font-weight':'600','letter-spacing':'0.5'},fixedLabel));
    // User input inside
    if(userInput)wrapText(cx,cy,userInput,r*1.7,'#ffffff',11);
}
function drawHexagon(cx,cy,r,color,fixedLabel,userInput,labelPos){
    const pts=[];for(let i=0;i<6;i++){const a=(Math.PI/3)*i-Math.PI/6;pts.push(`${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`);}
    svg.appendChild(el('polygon',{points:pts.join(' '),fill:'#0d1117',stroke:color,'stroke-width':'2',filter:'url(#glow)'}));
    const ly=labelPos==='above'?cy-r-14:cy+r+16;
    svg.appendChild(el('text',{x:cx,y:ly,'text-anchor':'middle','dominant-baseline':'central',fill:color,'font-size':'10','font-weight':'600','letter-spacing':'0.5'},fixedLabel));
    if(userInput)wrapText(cx,cy,userInput,r*1.5,'#ffffff',11);
}
function drawRect(cx,cy,w,h,color,fixedLabel,userInput,labelPos){
    svg.appendChild(el('rect',{x:cx-w/2,y:cy-h/2,width:w,height:h,rx:4,fill:'#0d1117',stroke:color,'stroke-width':'2',filter:'url(#glow)'}));
    const ly=labelPos==='above'?cy-h/2-12:cy+h/2+14;
    svg.appendChild(el('text',{x:cx,y:ly,'text-anchor':'middle','dominant-baseline':'central',fill:color,'font-size':'10','font-weight':'600','letter-spacing':'0.5'},fixedLabel));
    if(userInput)wrapText(cx,cy,userInput,w-16,'#ffffff',10);
}
function wrapText(cx,cy,text,maxW,color,fontSize){
    const words=text.split(/[,\s]+/).filter(Boolean),lines=[];let line='';
    const maxC=Math.floor(maxW/(fontSize*0.58));
    for(const w of words){if((line+' '+w).trim().length>maxC&&line){lines.push(line.trim());line=w;}else{line=line?line+' '+w:w;}}
    if(line)lines.push(line.trim());
    const lH=fontSize+3, sY=cy-((lines.length-1)*lH)/2;
    lines.forEach((l,i)=>svg.appendChild(el('text',{x:cx,y:sY+i*lH,'text-anchor':'middle','dominant-baseline':'central',fill:color,'font-size':fontSize,'font-weight':'500'},l)));
}
function placeLabel(lx,ly,label,color){
    const w=label.length*5.8+8;
    svg.appendChild(el('rect',{x:lx-w/2,y:ly-7,width:w,height:14,rx:3,fill:'#0d1117',opacity:'0.9'}));
    svg.appendChild(el('text',{x:lx,y:ly,'text-anchor':'middle','dominant-baseline':'central',fill:color,'font-size':'8.5','font-weight':'400'},label));
}

// Events
function onInput(){dirty=true;drawDiagram();}
Object.values(fields).forEach(f=>f.addEventListener('input',onInput));

$('#btn-save').addEventListener('click',()=>{
    const d=getFormData();if(!d.position&&!d.object){toast('Enter at least Position or Object.','error');return;}
    const list=getHistory();
    list.unshift({id:Date.now().toString(36),name:d.position||d.object||'Untitled',timestamp:new Date().toISOString(),data:d});
    if(list.length>MAX_HISTORY)list.length=MAX_HISTORY;
    saveHistory(list);saveCurrent();dirty=false;toast('Saved!','success');
});

$('#btn-history').addEventListener('click',()=>{renderHistory();$('#history-overlay').classList.remove('hidden');});
$('#modal-close').addEventListener('click',()=>$('#history-overlay').classList.add('hidden'));
$('#history-overlay').addEventListener('click',e=>{if(e.target===$('#history-overlay'))$('#history-overlay').classList.add('hidden');});

function renderHistory(){
    const list=getHistory();
    if(!list.length){$('#history-list').innerHTML='<p class="empty-history">No saved scenarios yet.</p>';return;}
    $('#history-list').innerHTML=list.map(e=>{
        const d=new Date(e.timestamp);
        const ds=d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
        return`<div class="history-item" data-id="${e.id}"><div class="history-info"><div class="history-name">${escHtml(e.name)}</div><div class="history-date">${ds}</div></div><div class="history-actions"><button class="btn-load" data-id="${e.id}">Load</button><button class="btn-export" data-id="${e.id}">JSON</button><button class="btn-delete" data-id="${e.id}">Del</button></div></div>`;
    }).join('');
}

$('#history-list').addEventListener('click',e=>{
    const btn=e.target.closest('button');if(!btn)return;
    const id=btn.dataset.id,list=getHistory(),entry=list.find(h=>h.id===id);
    if(btn.classList.contains('btn-load')&&entry){setFormData(entry.data);saveCurrent();$('#history-overlay').classList.add('hidden');dirty=false;toast('Loaded.','success');}
    if(btn.classList.contains('btn-export')&&entry){navigator.clipboard.writeText(JSON.stringify(entry,null,2)).then(()=>toast('JSON copied.','info')).catch(()=>toast('Copy failed.','error'));}
    if(btn.classList.contains('btn-delete')){saveHistory(list.filter(h=>h.id!==id));renderHistory();toast('Deleted.','error');}
});

$('#btn-reset').addEventListener('click',async()=>{
    if(dirty){const ok=await showConfirm('Reset','Clear all inputs and connections?');if(!ok)return;}
    Object.values(fields).forEach(f=>f.value='');connections=[];nodeScale=1;$('#node-scale-slider').value=1;$('#scale-val').textContent='1.0x';
    renderConnections();drawDiagram();saveCurrent();dirty=false;toast('Reset.','info');
});

$('#btn-export').addEventListener('click',()=>{
    const c=svg.cloneNode(true);const s=document.createElementNS(NS,'style');s.textContent="text{font-family:'JetBrains Mono',monospace;}";
    c.insertBefore(s,c.firstChild);
    const b=new Blob([new XMLSerializer().serializeToString(c)],{type:'image/svg+xml'});
    const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`roq-${Date.now()}.svg`;a.click();
    toast('Exported SVG.','success');
});

document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();$('#btn-save').click();}if(e.key==='Escape'){$('#history-overlay').classList.add('hidden');$('#confirm-overlay').classList.add('hidden');}});
window.addEventListener('beforeunload',saveCurrent);

// Auto-save every 30s
setInterval(()=>{if(dirty){saveCurrent();$('#status-text').textContent='Auto-saved '+new Date().toLocaleTimeString();}},30000);

// Init
loadCurrent();
if(!connections.length)renderConnections();
drawDiagram();
$('#status-text').textContent='Ready';
})();
