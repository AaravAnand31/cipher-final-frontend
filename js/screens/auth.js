// js/screens/auth.js
import { navigate, setState, toast, spinnerHTML, DUMMY_USER } from '../helpers.js';

export function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="auth-screen">
        <div class="auth-logo-wrap">
          <div class="auth-logo-icon">⚡</div>
          <div class="auth-logo-name">Cipher</div>
          <div class="auth-logo-sub">Christ University · Ghaziabad</div>
        </div>

        <div class="auth-notice">
          <span>🔒</span>
          <span>Only <b>@christuniversity.in</b> email addresses are accepted</span>
        </div>

        <input class="input-field" id="email" type="email"
          placeholder="College email" autocomplete="email" />
        <input class="input-field" id="password" type="password"
          placeholder="Password" autocomplete="current-password" />

        <button class="btn btn-primary" id="login-btn" style="margin-top:4px">Sign in</button>
        <button class="btn btn-ghost" id="to-register" style="margin-top:4px">
          New to Cipher? Create account
        </button>
        <button class="btn btn-ghost" id="forgot" style="font-size:14px;color:var(--label-secondary)">
          Forgot password?
        </button>
      </div>
    </div>`;

  const btn = document.getElementById('login-btn');

  // Enter key
  document.getElementById('password').addEventListener('keydown', e => {
    if (e.key === 'Enter') btn.click();
  });

  btn.addEventListener('click', () => {
    const email = document.getElementById('email').value.trim();
    const pass  = document.getElementById('password').value;

    if (!email || !pass) { toast('Please fill all fields', 'error'); return; }
    if (!email.endsWith('@christuniversity.in')) {
      toast('Only @christuniversity.in emails allowed', 'error'); return;
    }

    btn.disabled = true;
    btn.innerHTML = spinnerHTML;

    // Simulate login — replace with real API call
    setTimeout(() => {
      setState({ currentUser: { ...DUMMY_USER, email } });
      navigate('/discover');
    }, 1000);
  });

  document.getElementById('to-register').addEventListener('click', () => navigate('/register'));
  document.getElementById('forgot').addEventListener('click', () => {
    const email = document.getElementById('email').value.trim();
    if (!email) { toast('Enter your email first', 'error'); return; }
    toast('Password reset link sent! Check your inbox ✉️', 'success');
  });
}

/* ─── REGISTER ─────────────────────────────────────────── */
import { YEARS, LOOKING, DEPTS } from '../helpers.js';

let regStep = 1;
let regData = { name: '', email: '', password: '', year: '', department: '', lookingFor: [] };

export function renderRegister() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="auth-screen">
        <div style="padding-top:52px;display:flex;align-items:center;gap:4px;margin-bottom:28px">
          <button class="nav-back" id="back-btn">
            <svg viewBox="0 0 10 17" fill="none"><path d="M9 1L1.5 8.5L9 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Back
          </button>
        </div>

        <div style="margin-bottom:24px">
          <div style="font-size:28px;font-weight:700;letter-spacing:-0.5px">Create account</div>
          <div style="font-size:15px;color:var(--label-secondary);margin-top:6px">Join Cipher · Christ Univ Gzb</div>
        </div>

        <div class="step-dots" id="step-dots">
          <div class="step-dot active" id="dot-1"></div>
          <div class="step-dot" id="dot-2"></div>
          <div class="step-dot" id="dot-3"></div>
        </div>

        <div id="step-content"></div>
      </div>
    </div>`;

  document.getElementById('back-btn').addEventListener('click', () => {
    if (regStep === 1) navigate('/login');
    else { regStep--; renderRegStep(); }
  });

  regStep = 1;
  renderRegStep();
}

function renderRegStep() {
  // Update dots
  [1,2,3].forEach(i => {
    const dot = document.getElementById(`dot-${i}`);
    dot.className = `step-dot ${i < regStep ? 'done' : i === regStep ? 'active' : ''}`;
  });

  const el = document.getElementById('step-content');

  if (regStep === 1) {
    el.innerHTML = `
      <div class="auth-notice" style="margin-bottom:20px">
        🔒 Only @christuniversity.in emails are accepted
      </div>
      <input class="input-field" id="r-name" type="text"
        placeholder="Full name" value="${regData.name}" />
      <input class="input-field" id="r-email" type="email"
        placeholder="College email (yourname@christuniversity.in)" value="${regData.email}" />
      <input class="input-field" id="r-pass" type="password"
        placeholder="Password (min 6 chars)" />
      <input class="input-field" id="r-confirm" type="password"
        placeholder="Confirm password" />
      <button class="btn btn-primary" id="step-btn" style="margin-top:8px">Continue</button>`;

    document.getElementById('step-btn').addEventListener('click', () => {
      const name    = document.getElementById('r-name').value.trim();
      const email   = document.getElementById('r-email').value.trim();
      const pass    = document.getElementById('r-pass').value;
      const confirm = document.getElementById('r-confirm').value;

      if (!name || !email || !pass)   { toast('Fill all fields', 'error'); return; }
      if (!email.endsWith('@christuniversity.in')) {
        toast('Only @christuniversity.in emails allowed', 'error'); return;
      }
      if (pass.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
      if (pass !== confirm) { toast('Passwords don\'t match', 'error'); return; }

      regData = { ...regData, name, email, password: pass };
      regStep = 2; renderRegStep();
    });
  }

  else if (regStep === 2) {
    el.innerHTML = `
      <div style="font-size:17px;font-weight:600;margin-bottom:16px">About you</div>

      <div style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:var(--label-secondary);margin-bottom:8px">Department</div>
      <div class="chip-wrap" id="dept-chips" style="margin-bottom:20px">
        ${DEPTS.map(d => `<button class="chip ${regData.department === d ? 'selected':''}" data-d="${d}">${d}</button>`).join('')}
      </div>

      <div style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:var(--label-secondary);margin-bottom:8px">Year</div>
      <div class="chip-wrap" id="year-chips" style="margin-bottom:24px">
        ${YEARS.map(y => `<button class="chip ${regData.year === y ? 'selected':''}" data-y="${y}">${y}</button>`).join('')}
      </div>

      <button class="btn btn-primary" id="step-btn">Continue</button>`;

    document.getElementById('dept-chips').addEventListener('click', e => {
      const btn = e.target.closest('[data-d]'); if (!btn) return;
      regData.department = btn.dataset.d;
      document.querySelectorAll('#dept-chips .chip').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
    });
    document.getElementById('year-chips').addEventListener('click', e => {
      const btn = e.target.closest('[data-y]'); if (!btn) return;
      regData.year = btn.dataset.y;
      document.querySelectorAll('#year-chips .chip').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
    });
    document.getElementById('step-btn').addEventListener('click', () => {
      if (!regData.department) { toast('Pick your department', 'error'); return; }
      if (!regData.year)       { toast('Pick your year', 'error'); return; }
      regStep = 3; renderRegStep();
    });
  }

  else if (regStep === 3) {
    el.innerHTML = `
      <div style="font-size:17px;font-weight:600;margin-bottom:6px">What are you looking for?</div>
      <div style="font-size:14px;color:var(--label-secondary);margin-bottom:16px">Pick all that apply</div>
      <div class="chip-wrap" id="looking-chips" style="margin-bottom:24px">
        ${LOOKING.map(l => `<button class="chip ${regData.lookingFor.includes(l) ? 'selected':''}" data-l="${l}">${l}</button>`).join('')}
      </div>
      <button class="btn btn-primary" id="finish-btn">Create account 🎉</button>`;

    document.getElementById('looking-chips').addEventListener('click', e => {
      const btn = e.target.closest('[data-l]'); if (!btn) return;
      const val = btn.dataset.l;
      if (regData.lookingFor.includes(val)) regData.lookingFor = regData.lookingFor.filter(v => v !== val);
      else regData.lookingFor.push(val);
      btn.classList.toggle('selected', regData.lookingFor.includes(val));
    });

    const finBtn = document.getElementById('finish-btn');
    finBtn.addEventListener('click', () => {
      if (!regData.lookingFor.length) { toast('Pick at least one option', 'error'); return; }
      finBtn.disabled = true;
      finBtn.innerHTML = spinnerHTML;
      // Simulate API call — replace with real call
      setTimeout(() => {
        toast('Account created! Please verify your email 📧', 'success');
        setTimeout(() => navigate('/login'), 1500);
      }, 1000);
    });
  }
}
