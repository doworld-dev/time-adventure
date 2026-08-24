const $=(s)=>document.querySelector(s);
const bank=$('#tokenBank');
const clocks=$('#clocks');
const message=$('#message');
const answerBox=$('#answerBox');
let difficulty=1,score=0,streak=0,currentProblem=null,selected=null,used=new Set(),placements={},selectedChoice=null,lastKeys=[];

function rand(arr){return arr[Math.floor(Math.random()*arr.length)]}
function randInt(min,max,step=10){const count=Math.floor((max-min)/step);return min+Math.floor(Math.random()*(count+1))*step}
function uniqueKey(p){return `${p.type}-${p.minutes}-${p.label}`}

function generateProblem(){
  let p,key,tries=0;
  do{
    const type=Math.random()<0.5?'minutesToTime':'timeToMinutes';
    if(type==='minutesToTime'){
      let minutes;
      if(difficulty===1) minutes=rand([60,90,120,150,180]);
      else if(difficulty===2) minutes=randInt(70,240,10);
      else minutes=randInt(70,360,10);
      p={type,minutes,label:`${minutes}분`};
    }else{
      let hours,mins;
      if(difficulty===1){hours=rand([1,2,3]);mins=rand([0,30]);}
      else if(difficulty===2){hours=rand([1,2,3]);mins=rand([0,10,20,30,40,50]);}
      else {hours=rand([1,2,3,4,5]);mins=rand([0,10,20,30,40,50]);}
      const label=mins===30?`${hours}시간 반`:mins===0?`${hours}시간`:`${hours}시간 ${mins}분`;
      p={type,minutes:hours*60+mins,hours,mins,label};
    }
    key=uniqueKey(p);tries++;
  }while(lastKeys.includes(key)&&tries<20);
  lastKeys.push(key);if(lastKeys.length>6) lastKeys.shift();
  return p;
}

function makeToken(i){
  const b=document.createElement('button');
  b.type='button';b.className='token';b.draggable=true;b.dataset.id=String(i);b.textContent='10분';b.setAttribute('aria-label','10분 블록');
  b.addEventListener('click',()=>selectToken(b));
  b.addEventListener('dragstart',e=>{selected=String(i);e.dataTransfer.setData('text/plain',String(i));});
  return b;
}

function selectToken(btn){
  document.querySelectorAll('.token.selected').forEach(x=>x.classList.remove('selected'));
  selected=btn.dataset.id;btn.classList.add('selected');
  message.className='message';message.textContent='좋아요! 이제 넣고 싶은 시계를 눌러 보세요.';
}

function makeClock(slot,type='hour'){
  const c=document.createElement('button');
  c.type='button';c.className=`clock${type==='rest'?' remainder':''}`;c.dataset.slot=slot;c.dataset.type=type;
  c.innerHTML=type==='hour'
    ? '<div class="dial" style="--fill:0deg;--hand:0deg"><span class="hand"></span><span class="dot"></span></div><div class="clock-label">0 / 60분</div><div class="clock-sub">10분 블록 6개</div>'
    : '<div class="mini">🎒</div><div class="clock-label">남은 0분</div><div class="clock-sub">60분이 되지 않은 블록</div>';
  c.addEventListener('click',()=>{if(selected!==null) place(selected,c)});
  c.addEventListener('dragover',e=>{e.preventDefault();c.classList.add('dragover')});
  c.addEventListener('dragleave',()=>c.classList.remove('dragover'));
  c.addEventListener('drop',e=>{e.preventDefault();c.classList.remove('dragover');place(e.dataTransfer.getData('text/plain'),c)});
  return c;
}

function place(id,target){
  if(used.has(id)) return;
  const slot=target.dataset.slot,type=target.dataset.type;
  placements[slot]=placements[slot]||[];
  const rem=currentProblem.minutes%60;
  const cap=type==='hour'?6:Math.max(1,Math.ceil(rem/10));
  if(placements[slot].length>=cap){
    message.className='message try';
    message.textContent=type==='hour'?'여기는 이미 60분이 꽉 찼어요!':'남은 분 자리도 꽉 찼어요.';
    return;
  }
  placements[slot].push(id);used.add(id);
  const token=bank.querySelector(`[data-id="${id}"]`);
  if(token){token.disabled=true;token.classList.remove('selected')}
  selected=null;updateClock(target);
  $('#remainingText').textContent=`${Math.ceil(currentProblem.minutes/10)-used.size}개 남음`;
}

function updateClock(c){
  const arr=placements[c.dataset.slot]||[];
  if(c.dataset.type==='hour'){
    const mins=arr.length*10,fill=Math.min(360,mins/60*360),dial=c.querySelector('.dial');
    dial.style.setProperty('--fill',`${fill}deg`);dial.style.setProperty('--hand',`${fill}deg`);
    c.querySelector('.clock-label').textContent=`${mins} / 60분`;
    if(mins===60){c.classList.add('done');message.className='message success';message.textContent='딩동! 60분이 모여서 1시간이 되었어요! 🎉';}
  }else{
    c.querySelector('.clock-label').textContent=`남은 ${arr.length*10}분`;
  }
}

function blockCorrect(){
  const h=Math.floor(currentProblem.minutes/60),r=currentProblem.minutes%60;
  for(let i=0;i<h;i++) if((placements[`h${i}`]||[]).length!==6) return false;
  if(r>0&&(placements.rest||[]).length!==r/10) return false;
  return used.size===Math.ceil(currentProblem.minutes/10);
}

function makeChoices(){
  const correct=currentProblem.minutes;
  const vals=new Set([correct]);
  const offsets=difficulty===1?[30,60,-30,-60]:[10,20,30,60,-10,-20,-30,-60];
  while(vals.size<4){const v=correct+rand(offsets);if(v>0&&v<=420) vals.add(v)}
  const shuffled=[...vals].sort(()=>Math.random()-.5);
  const box=$('#answerChoices');box.innerHTML='';
  shuffled.forEach(v=>{
    const b=document.createElement('button');b.type='button';b.className='choice-btn';b.dataset.value=String(v);b.textContent=`${v}분`;
    b.addEventListener('click',()=>{
      box.querySelectorAll('.choice-btn').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');selectedChoice=v;message.className='message';message.textContent='좋아요! 정답이라고 생각하면 확인해 보세요.';
    });
    box.appendChild(b);
  });
}

function renderProblem(){
  currentProblem=generateProblem();selected=null;used=new Set();placements={};selectedChoice=null;
  bank.innerHTML='';clocks.innerHTML='';answerBox.hidden=true;$('#nextBtn').hidden=true;$('#checkBtn').hidden=false;
  $('#scoreText').textContent=score;$('#streakText').textContent=streak;$('#questionBig').textContent=currentProblem.label;

  if(currentProblem.type==='minutesToTime'){
    $('#typePill').textContent='분 → 시간';$('#questionEyebrow').textContent='60분씩 묶어 볼까요?';$('#questionAsk').textContent='몇 시간 몇 분일까요?';
    $('#helperText').textContent='10분 블록을 옮겨서 60분짜리 시계를 완성해 보세요.';$('#blockGame').hidden=false;$('#choiceGame').hidden=true;
    const count=Math.ceil(currentProblem.minutes/10);for(let i=0;i<count;i++) bank.appendChild(makeToken(i));
    const h=Math.floor(currentProblem.minutes/60),r=currentProblem.minutes%60;for(let i=0;i<h;i++) clocks.appendChild(makeClock(`h${i}`,'hour'));if(r>0) clocks.appendChild(makeClock('rest','rest'));
    $('#remainingText').textContent=`${count}개 남음`;message.className='message';message.textContent='10분 블록 6개가 모이면 60분, 즉 1시간이에요.';
  }else{
    $('#typePill').textContent='시간 → 분';$('#questionEyebrow').textContent='이번엔 거꾸로 생각해 볼까요?';$('#questionAsk').textContent='모두 몇 분일까요?';
    $('#helperText').textContent='1시간은 60분이에요. 시간과 남은 분을 더해 보세요.';$('#blockGame').hidden=true;$('#choiceGame').hidden=false;makeChoices();
    message.className='message';message.textContent=currentProblem.mins===30?'힌트: 반 시간은 30분이에요.':'힌트: 시간 하나마다 60분이에요.';
  }
}

function finish(correct){
  if(correct){
    score+=10+difficulty*5;streak++;message.className='message success';message.textContent='정답이에요! 🌟';
    const h=Math.floor(currentProblem.minutes/60),r=currentProblem.minutes%60;
    $('#answerText').textContent=currentProblem.type==='minutesToTime'?`${currentProblem.minutes}분 = ${h?`${h}시간`:''}${r?` ${r}분`:''}`:`${currentProblem.label} = ${currentProblem.minutes}분`;
    $('#formulaText').textContent=currentProblem.type==='minutesToTime'?`${currentProblem.minutes}분 = ${Array(h).fill('60분').concat(r?[`${r}분`]:[]).join(' + ')}`:`${currentProblem.label} = ${Array(h).fill('60분').concat(r?[`${r}분`]:[]).join(' + ')}`;
    answerBox.hidden=false;$('#checkBtn').hidden=true;$('#nextBtn').hidden=false;$('#scoreText').textContent=score;$('#streakText').textContent=streak;
  }else{
    streak=0;$('#streakText').textContent=0;message.className='message try';message.textContent='조금만 다시 생각해 볼까요? 1시간은 60분이에요.';
  }
}

function check(){
  if(currentProblem.type==='minutesToTime') finish(blockCorrect());
  else{
    if(selectedChoice===null){message.className='message try';message.textContent='먼저 답을 하나 골라 보세요.';return;}
    const buttons=$('#answerChoices').querySelectorAll('.choice-btn');
    buttons.forEach(b=>{const v=Number(b.dataset.value);if(v===currentProblem.minutes)b.classList.add('correct');else if(v===selectedChoice)b.classList.add('wrong')});
    finish(selectedChoice===currentProblem.minutes);
  }
}

document.querySelectorAll('.diff-btn').forEach(btn=>btn.addEventListener('click',()=>{
  difficulty=Number(btn.dataset.diff);document.querySelectorAll('.diff-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');streak=0;renderProblem();
}));
$('#checkBtn').addEventListener('click',check);
$('#resetBtn').addEventListener('click',renderProblem);
$('#nextBtn').addEventListener('click',renderProblem);
renderProblem();
