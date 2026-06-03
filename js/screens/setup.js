// js/screens/setup.js  — 4-step profile setup after registration
import {
  navigate, getState, setState,
  toast, LOOKING, OPEN_TO, YEARS, DEPTS,
} from '../helpers.js';
import API_URL from '../api.js';

let step = 1;
let _avatar = null, _cover = null;
let _name = '', _year = '', _dept = '';
let _bio = '', _icebreaker = '', _interests = '';
let _lookingFor = [], _openTo = ['Everyone'];

export function renderSetup() {
  const u = getState().currentUser || {};
  step = 1;
  _avatar = null; _cover = null;
  _name = u.name || '';
  _year = u.year || ''; _dept = u.department || '';
  _bio = u.bio || ''; _icebreaker = u.icebreaker || '';
  _interests = (u.interests || []).join(', ');
  _lookingFor = u.lookingFor || []; _openTo = u.openTo || ['Everyone'];

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="auth-screen" id="setup-inner"></div>
    </div>`;

  renderStep();
}

function header(title, subtitle = '') {
  return `
    <div style="padding-top:52px;margin-bottom:20px">
      <div style="font-size:13px;color:var(--label-secondary);font-weight:500;letter-spacing:.4px;text-transform:uppercase;margin-bottom:6px">
        Step ${step} of 4
      </div>
      <div style="font-size:26px;font-weight:700;letter-spacing:-0.5px;color:var(--label-primary);line-height:1.2">${title}</div>
      ${subtitle ? `<div style="font-size:14px;color:var(--label-secondary);margin-top:6px">${subtitle}</div>` : ''}
    </div>
    <div class="step-dots">
      ${[1,2,3,4].map(i => `<div class="step-dot ${i < step ? 'done' : i === step ? 'active' : ''}"></div>`).join('')}
    </div>`;
}

function renderStep() {
  const inner = document.getElementById('setup-inner');

  /* ── STEP 1: Photos ── */
  if (step === 1) {
    inner.innerHTML = `
      ${header('Add your photos', 'A cover photo + profile pic helps people recognise you')}
      <div id="step-body">
        <div id="cover-pick" style="
          height:110px;border-radius:var(--r-lg);
          background:var(--fill-tertiary);
          border:1.5px dashed var(--gray3);
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;overflow:hidden;margin-bottom:16px;position:relative">
          <img id="cover-preview" style="display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />
          <div id="cover-label" style="font-size:14px;color:var(--label-secondary);text-align:center;line-height:1.6">
            🖼️ Cover photo<br><span style="font-size:12px;color:var(--label-tertiary)">3:1 ratio looks best</span>
          </div>
        </div>
        <input type="file" id="cover-file" accept="image/*" style="display:none" />

        <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px">
          <div id="avatar-pick" style="
            width:80px;height:80px;border-radius:50%;flex-shrink:0;
            background:var(--fill-tertiary);
            border:1.5px dashed var(--gray3);
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;overflow:hidden;position:relative">
            <img id="avatar-preview" style="display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />
            <div id="avatar-label" style="font-size:11px;color:var(--label-secondary);text-align:center;padding:6px;line-height:1.4">
              👤<br>Photo
            </div>
          </div>
          <div style="font-size:13px;color:var(--label-secondary);line-height:1.6">
            Your profile photo is shown to other students.<br>
            <span style="color:var(--label-tertiary)">Tap the circle to choose.</span>
          </div>
        </div>
        <input type="file" id="avatar-file" accept="image/*" style="display:none" />

        <button class="btn btn-primary" id="step-btn">Continue →</button>
      </div>`;

    document.getElementById('cover-pick').onclick  = () => document.getElementById('cover-file').click();
    document.getElementById('avatar-pick').onclick = () => document.getElementById('avatar-file').click();

    document.getElementById('cover-file').onchange = e => {
      _cover = e.target.files[0];
      if (_cover) {
        const img = document.getElementById('cover-preview');
        img.src = URL.createObjectURL(_cover); img.style.display = 'block';
        document.getElementById('cover-label').style.display = 'none';
      }
    };
    document.getElementById('avatar-file').onchange = e => {
      _avatar = e.target.files[0];
      if (_avatar) {
        const img = document.getElementById('avatar-preview');
        img.src = URL.createObjectURL(_avatar); img.style.display = 'block';
        document.getElementById('avatar-label').style.display = 'none';
      }
    };
    document.getElementById('step-btn').onclick = () => { step = 2; renderStep(); };
  }

  /* ── STEP 2: Basic info ── */
  else if (step === 2) {
    inner.innerHTML = `
      ${header('About you', 'Help others know who they\'re talking to')}
      <div id="step-body">
        <div class="form-label-above" style="margin-top:0">Full name</div>
        <input class="input-field" id="inp-name" type="text" placeholder="Aarav Anand" value="${_name}" />

        <div class="form-label-above">Year</div>
        <div class="chip-wrap" id="year-chips" style="margin-bottom:16px">
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
      const btn = e.target.closest('[data-y]'); if (!btn) return;
      _year = btn.dataset.y;
      document.querySelectorAll('#year-chips .chip').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
    };
    document.getElementById('dept-chips').onclick = e => {
      const btn = e.target.closest('[data-d]'); if (!btn) return;
      _dept = btn.dataset.d;
      document.querySelectorAll('#dept-chips .chip').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
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
      ${header('Tell your story', 'This shows up on your profile card')}
      <div id="step-body">
        <div class="form-label-above" style="margin-top:0">Bio <span style="color:var(--label-tertiary);font-weight:400">(required)</span></div>
        <textarea class="input-field" id="bio" rows="3" maxlength="160"
          style="border-radius:var(--r-md);resize:none"
          placeholder="e.g. Chess nerd who loves hackathons and late-night debugging">${_bio}</textarea>
        <div style="text-align:right;font-size:12px;color:var(--label-tertiary);margin-top:-8px" id="bio-count">${_bio.length}/160</div>

        <div class="form-label-above">Icebreaker <span style="color:var(--label-tertiary);font-weight:400">(optional)</span></div>
        <textarea class="input-field" id="icebreaker" rows="2" maxlength="200"
          style="border-radius:var(--r-md);resize:none"
          placeholder="e.g. I once pitched a startup to 300 people and it actually worked">${_icebreaker}</textarea>

        <div class="form-label-above">Interests <span style="color:var(--label-tertiary);font-weight:400">(comma separated)</span></div>
        <input class="input-field" id="interests" type="text" value="${_interests}"
          placeholder="e.g. Chess, Coding, Badminton, Music, Design" />

        <div style="display:flex;gap:10px;margin-top:24px">
          <button class="btn btn-secondary-fill" id="back-btn" style="flex:1">← Back</button>
          <button class="btn btn-primary" id="step-btn" style="flex:2;margin-top:0">Continue →</button>
        </div>
      </div>`;

    const bioEl = document.getElementById('bio');
    bioEl.oninput = () => { document.getElementById('bio-count').textContent = `${bioEl.value.length}/160`; };
    document.getElementById('back-btn').onclick = () => { step = 2; renderStep(); };
    document.getElementById('step-btn').onclick = () => {
      _bio        = document.getElementById('bio').value.trim();
      _icebreaker = document.getElementById('icebreaker').value.trim();
      _interests  = document.getElementById('interests').value.trim();
      if (!_bio) { toast('Add a short bio', 'error'); return; }
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
          <button class="btn btn-primary" id="finish-btn" style="flex:2;margin-top:0">Go to Cipher 🎉</button>
        </div>
      </div>`;

    document.getElementById('looking-chips').onclick = e => {
      const btn = e.target.closest('[data-l]'); if (!btn) return;
      const val = btn.dataset.l;
      if (_lookingFor.includes(val)) _lookingFor = _lookingFor.filter(v => v !== val);
      else _lookingFor.push(val);
      btn.classList.toggle('selected', _lookingFor.includes(val));
    };
    document.getElementById('opento-chips').onclick = e => {
      const btn = e.target.closest('[data-o]'); if (!btn) return;
      _openTo = [btn.dataset.o];
      document.querySelectorAll('#opento-chips .chip').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
    };
    document.getElementById('back-btn').onclick = () => { step = 3; renderStep(); };

    document.getElementById('finish-btn').onclick = async () => {
      if (!_lookingFor.length) { toast('Pick at least one option', 'error'); return; }

      const btn2 = document.getElementById('finish-btn');
      btn2.disabled = true; btn2.innerHTML = `<span class="spinner"></span> Setting up…`;

      const current = getState().currentUser || {};
      const updatedUser = {
        ...current,
        name:       _name,
        year:       _year,
        department: _dept,
        bio:        _bio,
        icebreaker: _icebreaker,
        interests:  _interests.split(',').map(s => s.trim()).filter(Boolean),
        lookingFor: _lookingFor,
        openTo:     _openTo,
        photoURL:   _avatar ? URL.createObjectURL(_avatar) : (current.photoURL || ''),
        coverURL:   _cover  ? URL.createObjectURL(_cover)  : (current.coverURL  || ''),
        profileDone: true,
      };

      if (_avatar) localStorage.setItem('cipher_photoURL', updatedUser.photoURL);
      if (_cover)  localStorage.setItem('cipher_coverURL',  updatedUser.coverURL);

      setState({ currentUser: updatedUser });

      // Save to backend
      try {
        const token = localStorage.getItem('token');
        if (token) {
          await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              username:   _name,
              year:       _year,
              department: _dept,
              bio:        _bio,
              icebreaker: _icebreaker,
              interests:  updatedUser.interests,
              lookingFor: _lookingFor,
              openTo:     _openTo,
            }),
          });
        }
      } catch (_) { /* silent */ }

      navigate('/discover');
    };
  }
}