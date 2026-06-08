// js/screens/auth.js
import { navigate, setState, toast } from '../helpers.js';
import API_URL from '../api.js';

/* ══════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════ */
export function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;padding:40px 24px;min-height:100dvh;
      background:var(--bg-secondary)">

      <div style="text-align:center;margin-bottom:40px">
        <div style="font-size:40px;font-weight:800;color:var(--accent);letter-spacing:-1px">Cipher</div>
        <div style="font-size:14px;color:var(--label-secondary);margin-top:4px">Christ University · Gzb</div>
      </div>

      <div class="form-section" style="width:100%;max-width:380px;margin-bottom:16px">
        <div class="form-row">
          <div class="form-row-label">Email</div>
          <input id="loginEmail" type="email" placeholder="you@christuniversity.in" autocomplete="email" />
        </div>
        <div class="form-row" style="border-bottom:none">
          <div class="form-row-label">Password</div>
          <input id="loginPassword" type="password" placeholder="••••••••" autocomplete="current-password" />
        </div>
      </div>

      <button class="btn btn-primary" id="loginBtn" style="max-width:380px">Sign in</button>

      <div style="margin-top:24px;font-size:14px;color:var(--label-secondary)">
        Don't have an account?
        <span id="goRegister" style="color:var(--accent);font-weight:600;cursor:pointer"> Register</span>
      </div>
    </div>`;

  document.getElementById('loginBtn').addEventListener('click', loginUser);
  document.getElementById('loginEmail').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('loginPassword').focus(); });
  document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') loginUser(); });
  document.getElementById('goRegister').addEventListener('click', () => navigate('/register'));
}

/* ══════════════════════════════════════════════════
   REGISTER
══════════════════════════════════════════════════ */
export function renderRegister() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;padding:40px 24px;min-height:100dvh;
      background:var(--bg-secondary)">

      <div style="text-align:center;margin-bottom:40px">
        <div style="font-size:40px;font-weight:800;color:var(--accent);letter-spacing:-1px">Cipher</div>
        <div style="font-size:14px;color:var(--label-secondary);margin-top:4px">Create your account</div>
      </div>

      <div class="form-section" style="width:100%;max-width:380px;margin-bottom:16px">
        <div class="form-row">
          <div class="form-row-label">Full name</div>
          <input id="regName" type="text" placeholder="Aarav Anand" autocomplete="name" />
        </div>
        <div class="form-row">
          <div class="form-row-label">Email</div>
          <input id="regEmail" type="email" placeholder="you@christuniversity.in" autocomplete="email" />
        </div>
        <div class="form-row" style="border-bottom:none">
          <div class="form-row-label">Password</div>
          <input id="regPassword" type="password" placeholder="Min. 6 characters" autocomplete="new-password" />
        </div>
      </div>

      <button class="btn btn-primary" id="registerBtn" style="max-width:380px">Continue →</button>

      <div style="margin-top:24px;font-size:14px;color:var(--label-secondary)">
        Already have an account?
        <span id="goLogin" style="color:var(--accent);font-weight:600;cursor:pointer"> Sign in</span>
      </div>
    </div>`;

  document.getElementById('registerBtn').addEventListener('click', registerUser);
  document.getElementById('goLogin').addEventListener('click', () => navigate('/login'));
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
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!name || !email || !password) { toast('Please fill in all fields', 'error'); return; }
  if (password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

  const btn = document.getElementById('registerBtn');
  btn.disabled = true; btn.textContent = 'Creating account…';

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
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) { toast('Please enter your email and password', 'error'); return; }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Signing in…';

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