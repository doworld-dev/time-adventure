const $=(s)=>document.querySelector(s);
const message=$('#message'),answerBox=$('#answerBox');
let difficulty=1,score=0,streak=0,currentProblem=null,bundles=0,selectedChoice=null,lastKeys=[];
function rand(a){return a[Math.floor(Math.random()*a.length)]}
function randInt(min,max,step=10){return min+Math.floor(Math.random()*(Math.floor((max-min)/step)+1))*step}
function key(p){return `${p.type}-${p.minutes}`}
function generateProblem(){
  let p,k,tries=0;
  do{
    const type=Math.random()<.5?'minutesToTime':'timeToMinutes';
    if(type==='minutesToTime'){
      const minutes=difficulty===1?rand([60,90,120,150,180]):difficulty===2?randInt(70,240):randInt(70,360);
      p={type,minutes,label:`${minutes}분`};
    }else{
      const hours=difficulty===1?rand([1,2,3]):difficulty===2?rand([1,2,3]):rand([1,2,3,4,5]);
      const mins=difficulty===1?rand([0,30]):rand([0,10,20,30,40,50]);
      p={type,minutes:hours*60+mins,hours,mins,label:mins===30?`${hours}시간 반`:mins?`${hours}시간 ${mins}분`:`${hours}시간`};
    }
    k=key(p);tries++;
  }while(lastKeys.includes(k)&&tries<20);
  lastKeys.push(k);if(lastKeys.length>6)lastKeys.shift();return p;
}
function maxBundles(){return Math.floor(currentProblem.minutes/60)}
function renderBundles(){
  const list=$('#bundleList');list.innerHTML='';
  for(let i=0;i<bundles;i++){
    const el=document.createElement('div');el.className='hour-bundle';el.innerHTML='<span class="clock-icon">🕐</span><strong>1시간</strong><small>60분 묶음</small>';list.appendChild(el);
  }
  const left=currentProblem.minutes-bundles*60;$('#remainderValue').textContent=`${left}분`;
  $('#bundleBtn').disabled=left<60;$('#undoBtn').disabled=bundles===0;
  if(bundles===maxBundles()&&left<60){message.className='message success';message.textContent=left===0?`60분 묶음이 ${bundles}개예요!`:`좋아요! ${bundles}시간을 만들고 ${left}분이 남았어요.`}
}
function makeChoices(){
  const correct=currentProblem.minutes,vals=new Set([correct]),offsets=difficulty===1?[30,60,-30,-60]:[10,20,30,60,-10,-20,-30,-60];
  while(vals.size<4){const v=correct+rand(offsets);if(v>0&&v<=420)vals.add(v)}
  const box=$('#answerChoices');box.innerHTML='';[...vals].sort(()=>Math.random()-.5).forEach(v=>{
    const b=document.createElement('button');b.type='button';b.className='choice-btn';b.dataset.value=v;b.textContent=`${v}분`;
    b.addEventListener('click',()=>{box.querySelectorAll('.choice-btn').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selectedChoice=v;message.className='message';message.textContent='이 답이 맞을까요? 정답 확인을 눌러 보세요.'});box.appendChild(b);
  });
}
function renderTimeVisual(){
  const box=$('#timeVisual');box.innerHTML='';
  for(let i=0;i<currentProblem.hours;i++){const e=document.createElement('div');e.className='given-hour';e.innerHTML='🕐<br>60분';box.appendChild(e)}
  if(currentProblem.mins){const e=document.createElement('div');e.className='given-rest';e.innerHTML=`➕<br>${currentProblem.mins}분`;box.appendChild(e)}
}
function renderProblem(){
  currentProblem=generateProblem();bundles=0;selectedChoice=null;answerBox.hidden=true;$('#nextBtn').hidden=true;$('#checkBtn').hidden=false;
  $('#scoreText').textContent=score;$('#streakText').textContent=streak;$('#questionBig').textContent=currentProblem.label;
  if(currentProblem.type==='minutesToTime'){
    $('#typePill').textContent='분 → 시간';$('#questionEyebrow').textContent='60분씩 묶어 볼까요?';$('#questionAsk').textContent='몇 시간 몇 분일까요?';$('#minutesGame').hidden=false;$('#timeGame').hidden=true;$('#sourceMinutes').textContent=currentProblem.label;
    message.className='message';message.textContent='60분을 하나씩 묶어 보세요.';renderBundles();
  }else{
    $('#typePill').textContent='시간 → 분';$('#questionEyebrow').textContent='이번에는 분으로 바꿔 볼까요?';$('#questionAsk').textContent='모두 몇 분일까요?';$('#minutesGame').hidden=true;$('#timeGame').hidden=false;renderTimeVisual();makeChoices();
    message.className='message';message.textContent=currentProblem.mins===30?'반 시간은 30분이에요.':'시계 하나는 60분이에요.';
  }
}
function finish(correct){
  if(!correct){streak=0;$('#streakText').textContent=0;message.className='message try';message.textContent=currentProblem.type==='minutesToTime'?'60분씩 더 묶을 수 있는지 살펴보세요.':'시계 하나를 60분으로 바꿔서 다시 더해 보세요.';return}
  score+=10+difficulty*5;streak++;$('#scoreText').textContent=score;$('#streakText').textContent=streak;message.className='message success';message.textContent='정답! 잘했어요! 🌟';
  const h=Math.floor(currentProblem.minutes/60),r=currentProblem.minutes%60;
  $('#answerText').textContent=currentProblem.type==='minutesToTime'?`${currentProblem.minutes}분 = ${h}시간${r?` ${r}분`:''}`:`${currentProblem.label} = ${currentProblem.minutes}분`;
  $('#formulaText').textContent=`${currentProblem.minutes}분 = ${Array(h).fill('60분').concat(r?[`${r}분`]:[]).join(' + ')}`;
  answerBox.hidden=false;$('#checkBtn').hidden=true;$('#nextBtn').hidden=false;
}
function check(){
  if(currentProblem.type==='minutesToTime') finish(bundles===maxBundles());
  else{
    if(selectedChoice===null){message.className='message try';message.textContent='먼저 답을 하나 골라 보세요.';return}
    $('#answerChoices').querySelectorAll('.choice-btn').forEach(b=>{const v=Number(b.dataset.value);if(v===currentProblem.minutes)b.classList.add('correct');else if(v===selectedChoice)b.classList.add('wrong')});finish(selectedChoice===currentProblem.minutes);
  }
}
$('#bundleBtn').addEventListener('click',()=>{if(currentProblem&&currentProblem.type==='minutesToTime'&&bundles<maxBundles()){bundles++;renderBundles()}});
$('#undoBtn').addEventListener('click',()=>{if(bundles>0){bundles--;message.className='message';message.textContent='하나를 다시 풀었어요.';renderBundles()}});
document.querySelectorAll('.diff-btn').forEach(btn=>btn.addEventListener('click',()=>{difficulty=Number(btn.dataset.diff);document.querySelectorAll('.diff-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');streak=0;renderProblem()}));
$('#checkBtn').addEventListener('click',check);$('#resetBtn').addEventListener('click',()=>{bundles=0;selectedChoice=null;if(currentProblem.type==='minutesToTime')renderBundles();else renderProblem()});$('#nextBtn').addEventListener('click',renderProblem);renderProblem();