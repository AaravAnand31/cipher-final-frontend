// js/screens/setup.js  — 4-step profile setup
import { navigate, getState, setState, toast, LOOKING, OPEN_TO, YEARS, DEPTS } from '../helpers.js';
import API_URL from '../api.js';

let step = 1;
let _avatarBase64 = '', _coverBase64 = '';
let _name = '', _year = '', _dept = '';
let _bio = '', _icebreaker = '', _interests = '';
let _lookingFor = [], _openTo = ['Everyone'];

// Convert a File object to base64 string
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = ()  => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function renderSetup() {
  const u = getState().currentUser || {};
  step = 1;
  _avatarBase64 = u.photoURL || '';
  _coverBase64  = u.coverURL || '';
  _name        = u.name || '';
  _year        = u.year || '';
  _dept        = u.department || '';
  _bio         = u.bio || '';
  _icebreaker  = u.icebreaker || '';
  _interests   = (u.interests || []).join(', ');
  _lookingFor  = u.lookingFor || [];
  _openTo      = u.openTo || ['Everyone'];

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="auth-screen" id="setup-inner"></div>
    </div>`;

  renderStep();
}

function header(title, sub = '') {
  return `
    <div style="padding-top:52px;margin-bottom:20px">
      <div style="font-size:12px;color:var(--label-secondary);font-weight:500;letter-spacing:.6px;text-transform:uppercase;margin-bottom:6px">Step ${step} of 4</div>
      <div style="font-size:26px;font-weight:700;letter-spacing:-0.5px;color:var(--label-primary);line-height:1.2">${title}</div>
      ${sub ? `<div style="font-size:14px;color:var(--label-secondary);margin-top:6px">${sub}</div>` : ''}
    </div>
    <div style="display:flex;gap:6px;margin-bottom:28px">
      ${[1,2,3,4].map(i => `
        <div style="height:4px;flex:1;border-radius:4px;background:${i <= step ? 'var(--accent)' : 'var(--fill-tertiary)'}"></div>
      `).join('')}
    </div>`;
}

function renderStep() {
  const inner = document.getElementById('setup-inner');

  /* ── STEP 1: Photos ── */
  if (step === 1) {
    inner.innerHTML = `
      ${header('Add your photos', 'Helps people recognise you on campus')}
      <div id="step-body">
        <!-- Cover -->
        <div id="cover-pick" style="
          height:110px;border-radius:var(--r-lg);margin-bottom:16px;
          position:relative;cursor:pointer;overflow:hidden;
          ${_coverBase64 ? `background:url('${_coverBase64}') center/cover` : 'background:var(--fill-tertiary);border:1.5px dashed var(--gray3)'}">
          <div id="cover-label" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${_coverBase64 ? 'background:rgba(0,0,0,.25)' : ''}">
            <div style="background:rgba(0,0,0,.4);backdrop-filter:blur(4px);border-radius:20px;padding:7px 14px;font-size:13px;color:#fff">
              🖼️ ${_coverBase64 ? 'Change' : 'Add'} cover photo
            </div>
          </div>
        </div>
        <input type="file" id="cover-file" accept="image/*" style="display:none" />

        <!-- Avatar -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px">
          <div id="avatar-pick" style="
            width:80px;height:80px;border-radius:50%;flex-shrink:0;cursor:pointer;
            overflow:hidden;position:relative;
            ${_avatarBase64 ? `background:url('${_avatarBase64}') center/cover` : 'background:var(--fill-tertiary);border:1.5px dashed var(--gray3);display:flex;align-items:center;justify-content:center'}">
            ${!_avatarBase64 ? `<span style="font-size:28px">👤</span>` : ''}
          </div>
          <div style="font-size:13px;color:var(--label-secondary);line-height:1.6">
            Profile photo (shown on your card)<br>
            <span style="color:var(--label-tertiary)">Tap the circle to choose</span>
          </div>
        </div>
        <input type="file" id="avatar-file" accept="image/*" style="display:none" />

        <button class="btn btn-primary" id="step-btn">Continue →</button>
      </div>`;

    document.getElementById('cover-pick').onclick  = () => document.getElementById('cover-file').click();
    document.getElementById('avatar-pick').onclick = () => document.getElementById('avatar-file').click();

    document.getElementById('cover-file').onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        _coverBase64 = await fileToBase64(file);
        const pick = document.getElementById('cover-pick');
        pick.style.background = `url('${_coverBase64}') center/cover`;
        document.getElementById('cover-label').querySelector('div').textContent = '🖼️ Change cover photo';
        toast('Cover photo selected ✓', 'success');
      } catch { toast('Could not read file', 'error'); }
    };

    document.getElementById('avatar-file').onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        _avatarBase64 = await fileToBase64(file);
        const pick = document.getElementById('avatar-pick');
        pick.style.background = `url('${_avatarBase64}') center/cover`;
        pick.style.border = 'none';
        pick.innerHTML = '';
        toast('Photo selected ✓', 'success');
      } catch { toast('Could not read file', 'error'); }
    };

    document.getElementById('step-btn').onclick = () => { step = 2; renderStep(); };
  }

  /* ── STEP 2: Basic info ── */
  else if (step === 2) {
    inner.innerHTML = `
      ${header('About you', 'Others see this on your profile')}
      <div id="step-body">
        <div class="form-label-above" style="margin-top:0">Full name</div>
        <input class="input-field" id="inp-name" type="text" placeholder="Aarav Anand" value="${_name}" />

        <div class="form-label-above">Year</div>
        <div class="chip-wrap" id="year-chips">
          ${YEARS.map(y => `<button class="chip ${_year===y?'selected':''}" data-y="${y}">${y}</button>`).join('')}
        </div>

        <div class="form-label-above">Department</div>
        <div class="chip-wrap" id="dept-chips" style="margin-bottom:28px">
          ${DEPTS.map(d => `<button class="chip ${_dept===d?'selected':''}" data-d="${d}">${d}</button>`).join('')}
        </div>

        <div style="display:flex;gap:10px">
          <button class="btn btn-secondary-fill" id="back-btn" style="flex:1">← Back</button>
          <button class="btn btn-primary" id="step-btn" style="flex:2;margin-top:0">Continue →</button>
        </div>
      </div>`;

    document.getElementById('year-chips').onclick = e => {
      const b = e.target.closest('[data-y]'); if (!b) return;
      _year = b.dataset.y;
      document.querySelectorAll('#year-chips .chip').forEach(c => c.classList.remove('selected'));
      b.classList.add('selected');
    };
    document.getElementById('dept-chips').onclick = e => {
      const b = e.target.closest('[data-d]'); if (!b) return;
      _dept = b.dataset.d;
      document.querySelectorAll('#dept-chips .chip').forEach(c => c.classList.remove('selected'));
      b.classList.add('selected');
    };
    document.getElementById('back-btn').onclick = () => { step = 1; renderStep(); };
    document.getElementById('step-btn').onclick = () => {
      _name = document.getElementById('inp-name').value.trim();
      if (!_name) { toast('Enter your name', 'error'); return; }
      if (!_year) { toast('Pick your year', 'error'); return; }
      if (!_dept) { toast('Pick your department', 'error'); return; }
      step = 3; renderStep();
    };
  }

  /* ── STEP 3: Bio & interests ── */
  else if (step === 3) {
    inner.innerHTML = `
      ${header('Tell your story', 'Shows on your profile card')}
      <div id="step-body">
        <div class="form-label-above" style="margin-top:0">Bio <span style="color:var(--label-tertiary);font-weight:400">(required)</span></div>
        <textarea class="input-field" id="bio" rows="3" maxlength="160" style="border-radius:var(--r-md);resize:none"
          placeholder="e.g. Chess nerd who loves hackathons">${_bio}</textarea>
        <div style="text-align:right;font-size:12px;color:var(--label-tertiary);margin-top:-8px" id="bio-count">${_bio.length}/160</div>

        <div class="form-label-above">Icebreaker <span style="color:var(--label-tertiary);font-weight:400">(optional)</span></div>
        <textarea class="input-field" id="icebreaker" rows="2" maxlength="200" style="border-radius:var(--r-md);resize:none"
          placeholder="e.g. I once pitched to 300 people and it worked">${_icebreaker}</textarea>

        <div class="form-label-above">Interests <span style="color:var(--label-tertiary);font-weight:400">(comma separated)</span></div>
        <input class="input-field" id="interests" type="text" value="${_interests}"
          placeholder="e.g. Chess, Coding, Badminton, Music" />

        <div style="display:flex;gap:10px;margin-top:24px">
          <button class="btn btn-secondary-fill" id="back-btn" style="flex:1">← Back</button>
          <button class="btn btn-primary" id="step-btn" style="flex:2;margin-top:0">Continue →</button>
        </div>
      </div>`;

    const bioEl = document.getElementById('bio');
    bioEl.oninput = () => document.getElementById('bio-count').textContent = `${bioEl.value.length}/160`;
    document.getElementById('back-btn').onclick = () => { step = 2; renderStep(); };
    document.getElementById('step-btn').onclick = () => {
      _bio        = document.getElementById('bio').value.trim();
      _icebreaker = document.getElementById('icebreaker').value.trim();
      _interests  = document.getElementById('interests').value.trim();
      if (!_bio) { toast('Add a short bio — just a sentence!', 'error'); return; }
      step = 4; renderStep();
    };
  }

  /* ── STEP 4: What you're here for ── */
  else if (step === 4) {
    inner.innerHTML = `
      ${header("What are you here for?", 'Pick everything that applies')}
      <div id="step-body">
        <div class="form-label-above" style="margin-top:0">I'm here to</div>
        <div class="chip-wrap" id="looking-chips" style="margin-bottom:20px">
          ${LOOKING.map(l => `<button class="chip ${_lookingFor.includes(l)?'selected':''}" data-l="${l}">${l}</button>`).join('')}
        </div>

        <div class="form-label-above">Show me</div>
        <div class="chip-wrap" id="opento-chips" style="margin-bottom:32px">
          ${OPEN_TO.map(o => `<button class="chip ${_openTo.includes(o)?'selected':''}" data-o="${o}">${o}</button>`).join('')}
        </div>

        <div style="display:flex;gap:10px">
          <button class="btn btn-secondary-fill" id="back-btn" style="flex:1">← Back</button>
          <button class="btn btn-primary" id="finish-btn" style="flex:2;margin-top:0">Go to Fliqr 🎉</button>
        </div>
      </div>`;

    document.getElementById('looking-chips').onclick = e => {
      const b = e.target.closest('[data-l]'); if (!b) return;
      const v = b.dataset.l;
      _lookingFor = _lookingFor.includes(v) ? _lookingFor.filter(x => x !== v) : [..._lookingFor, v];
      b.classList.toggle('selected', _lookingFor.includes(v));
    };
    document.getElementById('opento-chips').onclick = e => {
      const b = e.target.closest('[data-o]'); if (!b) return;
      _openTo = [b.dataset.o];
      document.querySelectorAll('#opento-chips .chip').forEach(c => c.classList.remove('selected'));
      b.classList.add('selected');
    };
    document.getElementById('back-btn').onclick = () => { step = 3; renderStep(); };

    document.getElementById('finish-btn').onclick = async () => {
      if (!_lookingFor.length) { toast('Pick at least one option', 'error'); return; }

      const btn = document.getElementById('finish-btn');
      btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Saving…`;

      const interestArr = _interests.split(',').map(s => s.trim()).filter(Boolean);

      const updatedUser = {
        ...(getState().currentUser || {}),
        name:        _name,
        year:        _year,
        department:  _dept,
        bio:         _bio,
        icebreaker:  _icebreaker,
        interests:   interestArr,
        lookingFor:  _lookingFor,
        openTo:      _openTo,
        photoURL:    _avatarBase64,   // base64 — persists in DB
        coverURL:    _coverBase64,    // base64 — persists in DB
        profileDone: true,
      };

      setState({ currentUser: updatedUser });

      // Save EVERYTHING to backend including photos as base64
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/auth/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            username:   _name,
            year:       _year,
            department: _dept,
            bio:        _bio,
            icebreaker: _icebreaker,
            interests:  interestArr,
            lookingFor: _lookingFor,
            openTo:     _openTo,
            photoURL:   _avatarBase64,
            coverURL:   _coverBase64,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.message);
        }
        toast('Profile saved! ✓', 'success');
      } catch (err) {
        console.error('Profile save error:', err);
        toast('Profile saved locally (backend sync failed)', 'error');
      }

      navigate('/discover');
    };
  }
}