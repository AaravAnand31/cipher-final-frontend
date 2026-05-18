// js/screens/setup.js
import {
  navigate, getState, setState,
  toast, spinnerHTML,
  LOOKING, OPEN_TO,
} from '../helpers.js';

let step = 1;
let _avatar = null, _cover = null;
let _bio = '', _icebreaker = '', _interests = '';
let _lookingFor = [], _openTo = ['Everyone'];

export function renderSetup() {
  step = 1; _avatar = null; _cover = null;
  _bio = ''; _icebreaker = ''; _interests = '';
  _lookingFor = []; _openTo = ['Everyone'];

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="auth-screen" id="setup-inner"></div>
    </div>`;

  renderStep();
}

function renderStep() {
  const p = getState().currentUser;
  const inner = document.getElementById('setup-inner');

  inner.innerHTML = `
    <div style="padding-top:52px;margin-bottom:20px">
      <div style="font-size:13px;color:var(--label-secondary);font-weight:500;margin-bottom:6px">
        Step ${step} of 3
      </div>
      <div style="font-size:28px;font-weight:700;letter-spacing:-0.5px;color:var(--label-primary)">
        ${step === 1 ? 'Add your photos' : step === 2 ? 'Tell your story' : 'What are you here for?'}
      </div>
    </div>

    <div class="step-dots">
      ${[1,2,3].map(i => `<div class="step-dot ${i < step ? 'done' : i === step ? 'active' : ''}"></div>`).join('')}
    </div>

    <div id="step-body"></div>`;

  const body = document.getElementById('step-body');

  if (step === 1) {
    body.innerHTML = `
      <!-- Cover photo picker -->
      <div id="cover-pick" style="
        height:100px;border-radius:var(--r-lg);
        background:var(--fill-tertiary);
        border:1.5px dashed var(--gray3);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;overflow:hidden;margin-bottom:16px;position:relative">
        <img id="cover-preview" style="display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />
        <div id="cover-label" style="font-size:14px;color:var(--label-secondary);text-align:center;line-height:1.5">
          + Cover photo<br><span style="font-size:12px;color:var(--label-tertiary)">3:1 ratio looks best</span>
        </div>
      </div>
      <input type="file" id="cover-file" accept="image/*" style="display:none" />

      <!-- Avatar picker -->
      <div id="avatar-pick" style="
        width:90px;height:90px;border-radius:50%;
        background:var(--fill-tertiary);
        border:1.5px dashed var(--gray3);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;overflow:hidden;margin:0 auto 24px;position:relative">
        <img id="avatar-preview" style="display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />
        <div id="avatar-label" style="font-size:11px;color:var(--label-secondary);text-align:center;padding:6px;line-height:1.4">
          + Profile<br>photo
        </div>
      </div>
      <input type="file" id="avatar-file" accept="image/*" style="display:none" />

      <button class="btn btn-primary" id="step-btn">Continue</button>`;

    document.getElementById('cover-pick').addEventListener('click', () =>
      document.getElementById('cover-file').click());
    document.getElementById('avatar-pick').addEventListener('click', () =>
      document.getElementById('avatar-file').click());

    document.getElementById('cover-file').addEventListener('change', e => {
      _cover = e.target.files[0];
      if (_cover) {
        const url = URL.createObjectURL(_cover);
        const img = document.getElementById('cover-preview');
        img.src = url; img.style.display = 'block';
        document.getElementById('cover-label').style.display = 'none';
      }
    });
    document.getElementById('avatar-file').addEventListener('change', e => {
      _avatar = e.target.files[0];
      if (_avatar) {
        const url = URL.createObjectURL(_avatar);
        const img = document.getElementById('avatar-preview');
        img.src = url; img.style.display = 'block';
        document.getElementById('avatar-label').style.display = 'none';
      }
    });

    document.getElementById('step-btn').addEventListener('click', () => { step = 2; renderStep(); });
  }

  else if (step === 2) {
    body.innerHTML = `
      <div class="form-label-above" style="margin-top:0">Bio</div>
      <textarea class="input-field" id="bio" rows="3" maxlength="160"
        style="border-radius:var(--r-md);resize:none"
        placeholder="e.g. Chess nerd who loves hackathons and late-night debugging">${_bio}</textarea>

      <div class="form-label-above">Icebreaker</div>
      <textarea class="input-field" id="icebreaker" rows="2" maxlength="200"
        style="border-radius:var(--r-md);resize:none"
        placeholder="e.g. The one thing I want to build at college is...">${_icebreaker}</textarea>

      <div class="form-label-above">Interests</div>
      <input class="input-field" id="interests" type="text"
        value="${_interests}"
        placeholder="e.g. Chess, Coding, Badminton, Music" />
      <div class="form-hint">Separate with commas</div>

      <div class="btn-row" style="display:flex;gap:10px;margin-top:24px">
        <button class="btn btn-secondary-fill" id="back-btn" style="flex:1">← Back</button>
        <button class="btn btn-primary" id="step-btn" style="flex:2;margin-top:0">Continue</button>
      </div>`;

    document.getElementById('back-btn').addEventListener('click', () => { step = 1; renderStep(); });
    document.getElementById('step-btn').addEventListener('click', () => {
      _bio        = document.getElementById('bio').value.trim();
      _icebreaker = document.getElementById('icebreaker').value.trim();
      _interests  = document.getElementById('interests').value.trim();
      if (!_bio) { toast('Add a short bio — just a sentence or two', 'error'); return; }
      step = 3; renderStep();
    });
  }

  else if (step === 3) {
    body.innerHTML = `
      <div class="form-label-above" style="margin-top:0">I'm here to</div>
      <div class="chip-wrap" id="looking-chips" style="margin-bottom:20px">
        ${LOOKING.map(l => `<button class="chip ${_lookingFor.includes(l) ? 'selected' : ''}" data-l="${l}">${l}</button>`).join('')}
      </div>

      <div class="form-label-above">Show me</div>
      <div class="chip-wrap" id="opento-chips" style="margin-bottom:28px">
        ${OPEN_TO.map(o => `<button class="chip ${_openTo.includes(o) ? 'selected' : ''}" data-o="${o}">${o}</button>`).join('')}
      </div>

      <div style="display:flex;gap:10px">
        <button class="btn btn-secondary-fill" id="back-btn" style="flex:1">← Back</button>
        <button class="btn btn-primary" id="finish-btn" style="flex:2;margin-top:0">Go to Cipher 🎉</button>
      </div>`;

    document.getElementById('looking-chips').addEventListener('click', e => {
      const btn = e.target.closest('[data-l]'); if (!btn) return;
      const val = btn.dataset.l;
      if (_lookingFor.includes(val)) _lookingFor = _lookingFor.filter(v => v !== val);
      else _lookingFor.push(val);
      btn.classList.toggle('selected', _lookingFor.includes(val));
    });
    document.getElementById('opento-chips').addEventListener('click', e => {
      const btn = e.target.closest('[data-o]'); if (!btn) return;
      _openTo = [btn.dataset.o];
      document.querySelectorAll('#opento-chips .chip').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
    });
    document.getElementById('back-btn').addEventListener('click', () => { step = 2; renderStep(); });

    const finBtn = document.getElementById('finish-btn');
    finBtn.addEventListener('click', () => {
      if (!_lookingFor.length) { toast('Pick at least one option', 'error'); return; }
      finBtn.disabled = true;
      finBtn.innerHTML = `<span class="spinner"></span> Setting up...`;

      setTimeout(() => {
        const current = getState().currentUser || {};
        setState({
          currentUser: {
            ...current,
            bio: _bio,
            icebreaker: _icebreaker,
            interests: _interests.split(',').map(s => s.trim()).filter(Boolean),
            lookingFor: _lookingFor,
            openTo: _openTo,
            photoURL:  _avatar ? URL.createObjectURL(_avatar) : current.photoURL || '',
            coverURL:  _cover  ? URL.createObjectURL(_cover)  : current.coverURL || '',
            profileDone: true,
          }
        });
        navigate('/discover');
      }, 1200);
    });
  }
}
