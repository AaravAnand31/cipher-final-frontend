// js/screens/auth.js
import { navigate, setState, toast } from '../helpers.js';
import API_URL from '../api.js';

/* ══════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════ */
export function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;min-height:100dvh;background:var(--bg-secondary)">
      <div style="font-size:36px;font-weight:700;color:var(--accent);margin-bottom:8px">Cipher</div>
      <div style="font-size:15px;color:var(--label-secondary);margin-bottom:40px">Christ University · Gzb</div>

      <div class="form-section" style="width:100%;max-width:380px;margin-bottom:16px">
        <div class="form-row">
          <div class="form-row-label">Email</div>
          <input id="loginEmail" type="email" placeholder="you@christuniversity.in" />
        </div>
        <div class="form-row" style="border-bottom:none">
          <div class="form-row-label">Password</div>
          <input id="loginPassword" type="password" placeholder="••••••••" />
        </div>
      </div>

      <button class="btn btn-primary" id="loginBtn" style="max-width:380px">Sign in</button>

      <div style="margin-top:24px;font-size:14px;color:var(--label-secondary)">
        Don't have an account?
        <span id="goRegister" style="color:var(--accent);font-weight:500;cursor:pointer"> Register</span>
      </div>
    </div>`;

  document.getElementById('loginBtn').addEventListener('click', loginUser);
  document.getElementById('goRegister').addEventListener('click', () => navigate('/register'));
}

/* ══════════════════════════════════════════════════
   REGISTER
══════════════════════════════════════════════════ */
export function renderRegister() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;min-height:100dvh;background:var(--bg-secondary)">
      <div style="font-size:36px;font-weight:700;color:var(--accent);margin-bottom:8px">Cipher</div>
      <div style="font-size:15px;color:var(--label-secondary);margin-bottom:40px">Create your account</div>

      <div class="form-section" style="width:100%;max-width:380px;margin-bottom:16px">
        <div class="form-row">
          <div class="form-row-label">Username</div>
          <input id="username" type="text" placeholder="aarav_anand" />
        </div>
        <div class="form-row">
          <div class="form-row-label">Email</div>
          <input id="email" type="email" placeholder="you@christuniversity.in" />
        </div>
        <div class="form-row" style="border-bottom:none">
          <div class="form-row-label">Password</div>
          <input id="password" type="password" placeholder="••••••••" />
        </div>
      </div>

      <button class="btn btn-primary" id="registerBtn" style="max-width:380px">Create account</button>

      <div style="margin-top:24px;font-size:14px;color:var(--label-secondary)">
        Already have an account?
        <span id="goLogin" style="color:var(--accent);font-weight:500;cursor:pointer"> Sign in</span>
      </div>
    </div>`;

  document.getElementById('registerBtn').addEventListener('click', registerUser);
  document.getElementById('goLogin').addEventListener('click', () => navigate('/login'));
}

/* ══════════════════════════════════════════════════
   API ACTIONS
══════════════════════════════════════════════════ */
async function registerUser() {
  const username = document.getElementById('username').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !email || !password) {
    toast('Please fill in all fields', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Registration failed');
    toast('Account created! Please sign in 🎉', 'success');
    navigate('/login');
  } catch (error) {
    console.error(error);
    toast(error.message || 'Registration failed', 'error');
  }
}

async function loginUser() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    toast('Please enter your email and password', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed');

    // Save token
    localStorage.setItem('token', data.token);
    setState({ currentUser: data.user || null });

    toast('Welcome back! 👋', 'success');
    navigate('/discover');
  } catch (error) {
    console.error(error);
    toast(error.message || 'Login failed', 'error');
  }
}
