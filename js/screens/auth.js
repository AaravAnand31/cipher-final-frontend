// js/screens/auth.js
import { navigate, setState, toast, isGmailAddress, GMAIL_ONLY_MESSAGE } from '../helpers.js';
import API_URL from '../api.js';

/* ══════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════ */
export function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter auth-wrap">
      <div class="auth-orb auth-orb-1"></div>
      <div class="auth-orb auth-orb-2"></div>

      <div class="auth-hero">
        <div class="auth-mark">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="5" y="11" width="14" height="9" rx="2" stroke="#fff" stroke-width="1.8"/>
            <path d="M8 11V7a4 4 0 018 0v4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="12" cy="15.5" r="1.4" fill="#fff"/>
          </svg>
        </div>
        <div class="auth-title">Cipher</div>
        <div class="auth-tag">🎓 Christ University · Ghaziabad</div>
      </div>

      <div class="auth-card">
        <div class="auth-field">
          <label class="auth-field-label" for="loginEmail">Email</label>
          <div class="auth-input-shell">
            <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="1.7"/>
              <path d="M4 7l7 5.5a1.6 1.6 0 002 0L20 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <input id="loginEmail" type="email" placeholder="example@gmail.com" autocomplete="email" />
          </div>
        </div>

        <div class="auth-field">
          <label class="auth-field-label" for="loginPassword">Password</label>
          <div class="auth-input-shell">
            <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.7"/>
              <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
            <input id="loginPassword" type="password" placeholder="••••••••" autocomplete="current-password" />
            <svg class="auth-toggle-pw" id="loginPwToggle" viewBox="0 0 24 24" fill="none">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/>
            </svg>
          </div>
        </div>

        <button class="btn btn-primary auth-submit" id="loginBtn">Sign in</button>
      </div>

      <div class="auth-footer">
        Don't have an account?
        <span id="goRegister" class="auth-footer-link">Register</span>
      </div>
    </div>`;

  document.getElementById('loginBtn').addEventListener('click', loginUser);
  document.getElementById('loginEmail').addEventListener('input', e => {
    e.target.closest('.auth-input-shell')?.classList.remove('input-error');
  });
  document.getElementById('loginEmail').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('loginPassword').focus(); });
  document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') loginUser(); });
  document.getElementById('goRegister').addEventListener('click', () => navigate('/register'));
  bindPasswordToggle('loginPassword', 'loginPwToggle');
}

/* ══════════════════════════════════════════════════
   REGISTER
══════════════════════════════════════════════════ */
export function renderRegister() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter auth-wrap">
      <div class="auth-orb auth-orb-1"></div>
      <div class="auth-orb auth-orb-2"></div>

      <div class="auth-hero">
        <div class="auth-mark">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="#fff" stroke-width="1.8"/>
            <path d="M4.5 20c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M18.5 8.5v4M16.5 10.5h4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="auth-title">Cipher</div>
        <div class="auth-tag">✨ Create your account</div>
      </div>

      <div class="auth-card">
        <div class="auth-field">
          <label class="auth-field-label" for="regName">Full name</label>
          <div class="auth-input-shell">
            <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.7"/>
              <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
            <input id="regName" type="text" placeholder="Aarav Anand" autocomplete="name" />
          </div>
        </div>

        <div class="auth-field">
          <label class="auth-field-label" for="regEmail">Email</label>
          <div class="auth-input-shell">
            <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="1.7"/>
              <path d="M4 7l7 5.5a1.6 1.6 0 002 0L20 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <input id="regEmail" type="email" placeholder="example@gmail.com" autocomplete="email" />
          </div>
        </div>

        <div class="auth-field">
          <label class="auth-field-label" for="regPassword">Password</label>
          <div class="auth-input-shell">
            <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.7"/>
              <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
            <input id="regPassword" type="password" placeholder="Min. 6 characters" autocomplete="new-password" />
            <svg class="auth-toggle-pw" id="regPwToggle" viewBox="0 0 24 24" fill="none">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/>
            </svg>
          </div>
        </div>

        <button class="btn btn-primary auth-submit" id="registerBtn">Continue →</button>
      </div>

      <div class="auth-footer">
        Already have an account?
        <span id="goLogin" class="auth-footer-link">Sign in</span>
      </div>
    </div>`;

  document.getElementById('registerBtn').addEventListener('click', registerUser);
  document.getElementById('regEmail').addEventListener('input', e => {
    e.target.closest('.auth-input-shell')?.classList.remove('input-error');
  });
  document.getElementById('regName').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('regEmail').focus(); });
  document.getElementById('regEmail').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('regPassword').focus(); });
  document.getElementById('regPassword').addEventListener('keydown', e => { if (e.key === 'Enter') registerUser(); });
  document.getElementById('goLogin').addEventListener('click', () => navigate('/login'));
  bindPasswordToggle('regPassword', 'regPwToggle');
}

/* ══════════════════════════════════════════════════
   PASSWORD VISIBILITY TOGGLE — shared by both screens
══════════════════════════════════════════════════ */
function bindPasswordToggle(inputId, toggleId) {
  const input  = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);
  if (!input || !toggle) return;

  toggle.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    toggle.style.opacity = isHidden ? '1' : '0.6';
  });
}

/* ══════════════════════════════════════════════════
   HELPER — map DB user → frontend state
   Called on both register (auto-login) and login
══════════════════════════════════════════════════ */
function dbUserToState(dbUser) {
  return {
    uid:         dbUser._id        || '',
    name:        dbUser.username   || '',
    email:       dbUser.email      || '',
    year:        dbUser.year       || '',
    department:  dbUser.department || '',
    bio:         dbUser.bio        || '',
    icebreaker:  dbUser.icebreaker || '',
    interests:   dbUser.interests  || [],
    lookingFor:  dbUser.lookingFor || [],
    openTo:      dbUser.openTo     || ['Everyone'],
    photoURL:    dbUser.photoURL   || '',   // base64 from DB
    coverURL:    dbUser.coverURL   || '',   // base64 from DB
    profileDone: dbUser.profileDone || false,
  };
}

/* ══════════════════════════════════════════════════
   ACTIONS
══════════════════════════════════════════════════ */
async function registerUser() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  const emailRow = document.getElementById('regEmail').closest('.auth-input-shell');

  emailRow?.classList.remove('input-error');

  if (!name || !email || !password) { toast('Please fill in all fields', 'error'); return; }
  if (password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

  if (!isGmailAddress(email)) {
    emailRow?.classList.add('input-error');
    toast(GMAIL_ONLY_MESSAGE, 'error');
    return;
  }

  const btn = document.getElementById('registerBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Creating account…';

  try {
    // 1 — Register
    const r1 = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, email, password }),
    });
    const d1 = await r1.json();
    if (!r1.ok) throw new Error(d1.message || 'Registration failed');

    // 2 — Auto-login immediately after
    const r2 = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const d2 = await r2.json();
    if (!r2.ok) throw new Error('Registered! Please sign in.');

    localStorage.setItem('token', d2.token);
    setState({ currentUser: dbUserToState(d2.user || {}) });

    toast('Account created! Now set up your profile 🎉', 'success');
    navigate('/setup');

  } catch (err) {
    console.error(err);
    toast(err.message || 'Registration failed', 'error');
    btn.disabled = false; btn.textContent = 'Continue →';
  }
}

async function loginUser() {
  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const emailRow = document.getElementById('loginEmail').closest('.auth-input-shell');

  emailRow?.classList.remove('input-error');

  if (!email || !password) { toast('Please enter your email and password', 'error'); return; }

  if (!isGmailAddress(email)) {
    emailRow?.classList.add('input-error');
    toast(GMAIL_ONLY_MESSAGE, 'error');
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Signing in…';

  try {
    const res  = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    localStorage.setItem('token', data.token);

    // Map ALL DB fields → state (photos come back as base64 from DB)
    const user = dbUserToState(data.user || {});
    setState({ currentUser: user });

    toast('Welcome back! 👋', 'success');

    // Use profileDone flag — if true, go to discover. If false, do setup.
    navigate(user.profileDone ? '/discover' : '/setup');

  } catch (err) {
    console.error(err);
    toast(err.message || 'Login failed', 'error');
    btn.disabled = false; btn.textContent = 'Sign in';
  }
}