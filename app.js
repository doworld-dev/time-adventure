(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const requiredIds = [
    'message','answerBox','scoreText','streakText','typePill','questionEyebrow','questionBig','questionAsk',
    'minutesGame','timeGame','sourceMinutes','bundleList','remainderValue','bundleBtn','undoBtn','timeVisual',
    'answerChoices','answerText','formulaText','resetBtn','checkBtn','nextBtn'
  ];

  const missing = requiredIds.filter((id) => !document.getElementById(id));
  if (missing.length) {
    document.body.insertAdjacentHTML('beforeend', `<p style="padding:16px;color:#b42318">화면을 불러오지 못했어요: ${missing.join(', ')}</p>`);
    return;
  }

  const message = $('#message');
  const answerBox = $('#answerBox');
  let difficulty = 1;
  let score = 0;
  let streak = 0;
  let currentProblem = null;
  let bundles = 0;
  let selectedChoice = null;
  let lastKeys = [];

  function rand(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function randInt(min, max, step = 10) {
    const count = Math.floor((max - min) / step);
    return min + Math.floor(Math.random() * (count + 1)) * step;
  }

  function problemKey(problem) {
    return `${problem.type}-${problem.minutes}`;
  }

  function generateProblem() {
    let problem;
    let key;
    let tries = 0;

    do {
      const type = Math.random() < 0.5 ? 'minutesToTime' : 'timeToMinutes';

      if (type === 'minutesToTime') {
        let minutes;
        if (difficulty === 1) minutes = rand([60, 90, 120, 150, 180, 200]);
        else if (difficulty === 2) minutes = randInt(70, 240, 10);
        else minutes = randInt(70, 360, 10);
        problem = { type, minutes, label: `${minutes}분` };
      } else {
        let hours;
        let mins;
        if (difficulty === 1) {
          hours = rand([1, 2, 3]);
          mins = rand([0, 30]);
        } else if (difficulty === 2) {
          hours = rand([1, 2, 3]);
          mins = rand([0, 10, 20, 30, 40, 50]);
        } else {
          hours = rand([1, 2, 3, 4, 5]);
          mins = rand([0, 10, 20, 30, 40, 50]);
        }

        let label;
        if (mins === 30) label = `${hours}시간 반`;
        else if (mins === 0) label = `${hours}시간`;
        else label = `${hours}시간 ${mins}분`;

        problem = { type, minutes: hours * 60 + mins, hours, mins, label };
      }

      key = problemKey(problem);
      tries += 1;
    } while (lastKeys.includes(key) && tries < 20);

    lastKeys.push(key);
    if (lastKeys.length > 6) lastKeys.shift();
    return problem;
  }

  function maxBundles() {
    return Math.floor(currentProblem.minutes / 60);
  }

  function renderBundles() {
    const list = $('#bundleList');
    list.innerHTML = '';

    for (let i = 0; i < bundles; i += 1) {
      const el = document.createElement('div');
      el.className = 'hour-bundle';
      el.innerHTML = '<span class="clock-icon">🕐</span><strong>1시간</strong><small>60분 묶음</small>';
      list.appendChild(el);
    }

    const left = currentProblem.minutes - bundles * 60;
    $('#remainderValue').textContent = `${left}분`;
    $('#bundleBtn').disabled = left < 60;
    $('#undoBtn').disabled = bundles === 0;

    if (bundles === maxBundles()) {
      message.className = 'message success';
      message.textContent = left === 0
        ? `60분 묶음이 ${bundles}개예요!`
        : `좋아요! ${bundles}시간을 만들고 ${left}분이 남았어요.`;
    }
  }

  function makeChoices() {
    const correct = currentProblem.minutes;
    const values = new Set([correct]);
    const offsets = difficulty === 1
      ? [30, 60, -30, -60, 90, -90]
      : [10, 20, 30, 60, -10, -20, -30, -60];

    let guard = 0;
    while (values.size < 4 && guard < 50) {
      const value = correct + rand(offsets);
      if (value > 0 && value <= 420) values.add(value);
      guard += 1;
    }

    let fallback = 30;
    while (values.size < 4) {
      const value = correct + fallback;
      if (value > 0 && value <= 420) values.add(value);
      fallback += 30;
    }

    const box = $('#answerChoices');
    box.innerHTML = '';
    const shuffled = [...values].sort(() => Math.random() - 0.5);

    shuffled.forEach((value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice-btn';
      button.dataset.value = String(value);
      button.textContent = `${value}분`;
      button.addEventListener('click', () => {
        box.querySelectorAll('.choice-btn').forEach((item) => item.classList.remove('selected'));
        button.classList.add('selected');
        selectedChoice = value;
        message.className = 'message';
        message.textContent = '이 답이 맞을까요? 정답 확인을 눌러 보세요.';
      });
      box.appendChild(button);
    });
  }

  function renderTimeVisual() {
    const box = $('#timeVisual');
    box.innerHTML = '';

    for (let i = 0; i < currentProblem.hours; i += 1) {
      const el = document.createElement('div');
      el.className = 'given-hour';
      el.innerHTML = '<span>🕐</span><strong>60분</strong>';
      box.appendChild(el);
    }

    if (currentProblem.mins > 0) {
      const el = document.createElement('div');
      el.className = 'given-rest';
      el.innerHTML = `<span>➕</span><strong>${currentProblem.mins}분</strong>`;
      box.appendChild(el);
    }
  }

  function renderProblem() {
    currentProblem = generateProblem();
    bundles = 0;
    selectedChoice = null;
    answerBox.hidden = true;
    $('#nextBtn').hidden = true;
    $('#checkBtn').hidden = false;
    $('#scoreText').textContent = String(score);
    $('#streakText').textContent = String(streak);
    $('#questionBig').textContent = currentProblem.label;

    if (currentProblem.type === 'minutesToTime') {
      $('#typePill').textContent = '분 → 시간';
      $('#questionEyebrow').textContent = '60분씩 묶어 볼까요?';
      $('#questionAsk').textContent = '몇 시간 몇 분일까요?';
      $('#minutesGame').hidden = false;
      $('#timeGame').hidden = true;
      $('#sourceMinutes').textContent = currentProblem.label;
      message.className = 'message';
      message.textContent = '60분을 하나씩 묶어 보세요.';
      renderBundles();
    } else {
      $('#typePill').textContent = '시간 → 분';
      $('#questionEyebrow').textContent = '이번에는 분으로 바꿔 볼까요?';
      $('#questionAsk').textContent = '모두 몇 분일까요?';
      $('#minutesGame').hidden = true;
      $('#timeGame').hidden = false;
      renderTimeVisual();
      makeChoices();
      message.className = 'message';
      message.textContent = currentProblem.mins === 30
        ? '반 시간은 30분이에요.'
        : '시계 하나는 60분이에요.';
    }
  }

  function finish(correct) {
    if (!correct) {
      streak = 0;
      $('#streakText').textContent = '0';
      message.className = 'message try';
      message.textContent = currentProblem.type === 'minutesToTime'
        ? '60분씩 더 묶을 수 있는지 살펴보세요.'
        : '시계 하나를 60분으로 바꿔서 다시 더해 보세요.';
      return;
    }

    score += 10 + difficulty * 5;
    streak += 1;
    $('#scoreText').textContent = String(score);
    $('#streakText').textContent = String(streak);
    message.className = 'message success';
    message.textContent = '정답! 잘했어요! 🌟';

    const hours = Math.floor(currentProblem.minutes / 60);
    const remainder = currentProblem.minutes % 60;
    const timeText = `${hours}시간${remainder ? ` ${remainder}분` : ''}`;
    $('#answerText').textContent = currentProblem.type === 'minutesToTime'
      ? `${currentProblem.minutes}분 = ${timeText}`
      : `${currentProblem.label} = ${currentProblem.minutes}분`;

    const parts = Array(hours).fill('60분');
    if (remainder) parts.push(`${remainder}분`);
    $('#formulaText').textContent = `${currentProblem.minutes}분 = ${parts.join(' + ')}`;

    answerBox.hidden = false;
    $('#checkBtn').hidden = true;
    $('#nextBtn').hidden = false;
  }

  function checkAnswer() {
    if (currentProblem.type === 'minutesToTime') {
      finish(bundles === maxBundles());
      return;
    }

    if (selectedChoice === null) {
      message.className = 'message try';
      message.textContent = '먼저 답을 하나 골라 보세요.';
      return;
    }

    $('#answerChoices').querySelectorAll('.choice-btn').forEach((button) => {
      const value = Number(button.dataset.value);
      if (value === currentProblem.minutes) button.classList.add('correct');
      else if (value === selectedChoice) button.classList.add('wrong');
    });
    finish(selectedChoice === currentProblem.minutes);
  }

  $('#bundleBtn').addEventListener('click', () => {
    if (currentProblem.type === 'minutesToTime' && bundles < maxBundles()) {
      bundles += 1;
      renderBundles();
    }
  });

  $('#undoBtn').addEventListener('click', () => {
    if (bundles > 0) {
      bundles -= 1;
      message.className = 'message';
      message.textContent = '60분 묶음 하나를 다시 풀었어요.';
      renderBundles();
    }
  });

  document.querySelectorAll('.diff-btn').forEach((button) => {
    button.addEventListener('click', () => {
      difficulty = Number(button.dataset.diff);
      document.querySelectorAll('.diff-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      streak = 0;
      renderProblem();
    });
  });

  $('#checkBtn').addEventListener('click', checkAnswer);
  $('#resetBtn').addEventListener('click', () => {
    bundles = 0;
    selectedChoice = null;
    answerBox.hidden = true;
    $('#nextBtn').hidden = true;
    $('#checkBtn').hidden = false;
    if (currentProblem.type === 'minutesToTime') {
      message.className = 'message';
      message.textContent = '다시 60분씩 묶어 보세요.';
      renderBundles();
    } else {
      renderTimeVisual();
      makeChoices();
    }
  });
  $('#nextBtn').addEventListener('click', renderProblem);

  try {
    renderProblem();
  } catch (error) {
    console.error(error);
    message.className = 'message try';
    message.textContent = '문제를 불러오지 못했어요. 페이지를 새로고침해 주세요.';
  }
})();