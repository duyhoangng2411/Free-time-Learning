(function(){
const STORAGE_KEY = 'routine-data';
const TOD_LABELS = { sang:'Sáng', chieu:'Chiều', toi:'Tối', khac:'Khác' };
const TOD_ORDER = ['sang','chieu','toi','khac'];
const WEEKDAY_LABELS = ['CN','T2','T3','T4','T5','T6','T7'];

let data = { routines: [], completions: {} };

function todayStr(d){
const dt = d || new Date();
const y = dt.getFullYear();
const m = String(dt.getMonth()+1).padStart(2,'0');
const day = String(dt.getDate()).padStart(2,'0');
return `${y}-${m}-${day}`;
}
function addDays(dateStr, delta){
const [y,m,d] = dateStr.split('-').map(Number);
const dt = new Date(y, m-1, d);
dt.setDate(dt.getDate()+delta);
return todayStr(dt);
}
function compKey(routineId, dateStr){ return routineId + '::' + dateStr; }
function uid(){ return Math.random().toString(36).slice(2,10); }

async function load(){
try{
    const res = await window.storage.get(STORAGE_KEY, false);
    if(res && res.value){
    data = JSON.parse(res.value);
    } else {
    seedDefaults();
    await save();
    }
} catch(e){
    seedDefaults();
    await save();
}
render();
}

function seedDefaults(){
data = {
    routines: [
    { id: uid(), name: 'Uống một cốc nước', timeOfDay:'sang' },
    { id: uid(), name: 'Vận động 15 phút', timeOfDay:'chieu' },
    { id: uid(), name: 'Đọc vài trang sách', timeOfDay:'toi' }
    ],
    completions: {}
};
}

async function save(){
try{
    await window.storage.set(STORAGE_KEY, JSON.stringify(data), false);
} catch(e){
    console.error('Không thể lưu dữ liệu:', e);
}
}

function dayComplete(dateStr){
if(data.routines.length === 0) return false;
return data.routines.every(r => !!data.completions[compKey(r.id, dateStr)]);
}

function computeStreak(){
const today = todayStr();
let cursor = dayComplete(today) ? today : addDays(today, -1);
let streak = 0;
while(dayComplete(cursor)){
    streak++;
    cursor = addDays(cursor, -1);
}
return streak;
}

function checkmarkSVG(){
return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12.5L9.5 18L20 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color:var(--stamp-red)"/></svg>';
}

function render(){
const today = todayStr();

const dl = document.getElementById('dateLine');
dl.textContent = new Date().toLocaleDateString('vi-VN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

document.getElementById('streakNum').textContent = computeStreak();

const total = data.routines.length;
const done = data.routines.filter(r => data.completions[compKey(r.id, today)]).length;
document.getElementById('progressFill').style.width = total ? `${(done/total)*100}%` : '0%';
document.getElementById('progressText').textContent = `${done}/${total}`;
document.getElementById('footerLeft').textContent = total ? `${total} việc đang theo dõi` : 'chưa có việc nào';

const blocksEl = document.getElementById('blocks');
blocksEl.innerHTML = '';

const grouped = {};
TOD_ORDER.forEach(k => grouped[k] = []);
data.routines.forEach(r => grouped[r.timeOfDay || 'khac'].push(r));

TOD_ORDER.forEach(tod => {
    const list = grouped[tod];
    if(list.length === 0) return;

    const section = document.createElement('section');
    section.className = 'block';

    const titleEl = document.createElement('div');
    titleEl.className = 'block-title';
    titleEl.textContent = TOD_LABELS[tod];
    section.appendChild(titleEl);

    list.forEach(routine => {
    const isDone = !!data.completions[compKey(routine.id, today)];

    const row = document.createElement('div');
    row.className = 'routine-row' + (isDone ? ' done' : '');

    const stampBtn = document.createElement('button');
    stampBtn.type = 'button';
    stampBtn.className = 'stamp' + (isDone ? ' done' : '');
    stampBtn.style.setProperty('--stamp-rot', (Math.random()*10-5).toFixed(1)+'deg');
    stampBtn.setAttribute('aria-label', (isDone ? 'Bỏ đánh dấu: ' : 'Đánh dấu hoàn thành: ') + routine.name);
    stampBtn.innerHTML = checkmarkSVG();
    stampBtn.addEventListener('click', () => toggleCompletion(routine.id));
    row.appendChild(stampBtn);

    const nameEl = document.createElement('span');
    nameEl.className = 'routine-name';
    nameEl.textContent = routine.name;
    row.appendChild(nameEl);

    const dotsEl = document.createElement('div');
    dotsEl.className = 'week-dots';
    for(let i=6; i>=0; i--){
        const ds = addDays(today, -i);
        const dot = document.createElement('span');
        const filled = !!data.completions[compKey(routine.id, ds)];
        dot.className = 'week-dot' + (filled ? ' filled' : '') + (ds === today ? ' today' : '');
        dot.title = new Date(ds+'T00:00:00').toLocaleDateString('vi-VN', {weekday:'short', day:'numeric', month:'numeric'});
        dotsEl.appendChild(dot);
    }
    row.appendChild(dotsEl);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn';
    delBtn.innerHTML = '✕';
    delBtn.setAttribute('aria-label', 'Xoá việc: ' + routine.name);
    delBtn.addEventListener('click', () => deleteRoutine(routine.id));
    row.appendChild(delBtn);

    section.appendChild(row);
    });

    blocksEl.appendChild(section);
});

if(data.routines.length === 0){
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'Chưa có thói quen nào — thêm việc đầu tiên bạn muốn làm mỗi ngày ở trên.';
    blocksEl.appendChild(note);
}
}

async function toggleCompletion(routineId){
const today = todayStr();
const key = compKey(routineId, today);
data.completions[key] = !data.completions[key];
render();
const btn = document.querySelector(`.stamp[aria-label*="${data.routines.find(r=>r.id===routineId).name}"]`);
await save();
}

async function addRoutine(name, timeOfDay){
data.routines.push({ id: uid(), name: name.trim(), timeOfDay });
render();
await save();
}

async function deleteRoutine(routineId){
data.routines = data.routines.filter(r => r.id !== routineId);
Object.keys(data.completions).forEach(k => {
    if(k.startsWith(routineId + '::')) delete data.completions[k];
});
render();
await save();
}

document.getElementById('addForm').addEventListener('submit', (e) => {
e.preventDefault();
const input = document.getElementById('routineInput');
const tod = document.getElementById('timeOfDay').value;
if(input.value.trim()){
    addRoutine(input.value, tod);
    input.value = '';
    input.focus();
}
});

load();
})();