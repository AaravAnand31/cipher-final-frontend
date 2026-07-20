// js/screens/events.js — Campus Events (list · detail · composer)
//
// Read access: every logged-in student.
// Write access: users with role "organizer" (set manually in MongoDB Atlas).
//
// The list shows every event newest-posted-first: the most recent one gets a
// full-bleed featured card, the rest stack as compact rows. Tapping any card
// opens the detail view with the full photo gallery, organizer contact cards
// and the apply link.

import { navigate, getParams, toast, confirm as confirmSheet } from '../helpers.js';
import { tabBarHTML, bindTabs } from './tabs.js';
import API_URL from '../api.js';

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
    };
}

/* ══════════════════════════════════════════════════
   SAFETY
   Event text is authored by organizers and rendered
   through innerHTML, so everything user-supplied is
   escaped before it reaches the DOM.
══════════════════════════════════════════════════ */
function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Only allow http(s) URLs through to href, and repair bare domains.
function safeUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return esc(raw);
    if (/^(javascript|data|vbscript):/i.test(raw)) return '';
    return esc('https://' + raw);
}

/* ══════════════════════════════════════════════════
   DATES
══════════════════════════════════════════════════ */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDate(value) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

function monthShort(value) {
    const d = toDate(value);
    return d ? MONTHS[d.getMonth()] : '—';
}

function dayNum(value) {
    const d = toDate(value);
    return d ? d.getDate() : '–';
}

// "Sat, 19 Jul 2026 · 6:00 PM"
function fullDate(value) {
    const d = toDate(value);
    if (!d) return 'Date to be announced';
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${time}`;
}

// "19 Jul · 6:00 PM" — the compact form used on cards
function shortDate(value) {
    const d = toDate(value);
    if (!d) return 'Date TBA';
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${time}`;
}

// Compares calendar days, not raw timestamps — an event at 9am today is
// still "Today" at 6pm today.
function dayStatus(value) {
    const d = toDate(value);
    if (!d) return null;
    const startOf = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((startOf(d) - startOf(new Date())) / 86400000);
    if (diffDays === 0) return { label: 'Today', cls: 'is-today' };
    if (diffDays === 1) return { label: 'Tomorrow', cls: '' };
    if (diffDays < 0) return { label: 'Past', cls: 'is-past' };
    if (diffDays <= 7) return { label: `In ${diffDays} days`, cls: '' };
    return null;
}

function initials(name) {
    return String(name || '')
        .trim().split(/\s+/)
        .map(w => w[0])
        .join('').slice(0, 2).toUpperCase() || '?';
}

/* ══════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════ */
const IC = {
    calendar: `<svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4" width="15" height="13.5" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    pin: `<svg viewBox="0 0 20 20" fill="none"><path d="M10 18s6-5.3 6-9.5A6 6 0 004 8.5C4 12.7 10 18 10 18z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="8.5" r="2.2" stroke="currentColor" stroke-width="1.6"/></svg>`,
    phone: `<svg viewBox="0 0 20 20" fill="none"><path d="M6.4 3.5l2 3.4-1.7 1.6a10 10 0 004.8 4.8l1.6-1.7 3.4 2v2.6c0 .8-.7 1.4-1.5 1.3C8.3 16.8 3.2 11.7 2.6 5.1A1.4 1.4 0 014 3.5h2.4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    mail: `<svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3.2 6l6.1 4.6a1.2 1.2 0 001.4 0L16.8 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    back: `<svg viewBox="0 0 20 20" fill="none"><path d="M12.5 4L6.5 10l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    plus: `<svg viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>`,
    pencil: `<svg viewBox="0 0 20 20" fill="none"><path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
    trash: `<svg viewBox="0 0 20 20" fill="none"><path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M5.5 5.5l.7 10a1.5 1.5 0 001.5 1.4h4.6a1.5 1.5 0 001.5-1.4l.7-10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    ticket: `<svg viewBox="0 0 20 20" fill="none"><path d="M3 7V5.5A1.5 1.5 0 014.5 4h11A1.5 1.5 0 0117 5.5V7a2 2 0 000 4v1.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 12.5V11a2 2 0 000-4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
};

/* ══════════════════════════════════════════════════
   ROLE
   Cached for the session so we don't re-ask on every
   navigation; only organizers see write controls.
══════════════════════════════════════════════════ */
let _myRole = null;

async function getMyRole() {
    if (_myRole) return _myRole;
    try {
        const res = await fetch(`${API_URL}/auth/me`, { headers: authHeaders() });
        if (!res.ok) return 'student';
        const me = await res.json();
        _myRole = me?.role === 'organizer' ? 'organizer' : 'student';
        return _myRole;
    } catch (_) {
        return 'student';
    }
}

function isOrganizer() {
    return _myRole === 'organizer';
}

/* ══════════════════════════════════════════════════
   LIST
══════════════════════════════════════════════════ */
export function renderEvents() {
    document.getElementById('app').innerHTML = `
        <div class="screen screen-enter" style="background:var(--bg-secondary)">
            <div class="nav-bar">
                <div class="nav-left">
                    <div>
                        <div class="nav-title-large">Events</div>
                        <div class="nav-subtitle">What's happening on campus</div>
                    </div>
                </div>
            </div>

            <div class="screen-body events-body" id="ev-list">
                <div class="page-loader-wrap" id="ev-loader">
                    <div class="page-loader">
                        <span class="page-loader-dot"></span>
                        <span class="page-loader-dot"></span>
                        <span class="page-loader-dot"></span>
                    </div>
                    <div class="page-loader-caption">Loading events…</div>
                </div>
            </div>

            ${tabBarHTML('events')}
        </div>`;

    bindTabs();
    loadEvents();
}

async function loadEvents() {
    const wrap = document.getElementById('ev-list');
    if (!wrap) return;

    // Role and events load together — the FAB depends on the role result.
    const [role, result] = await Promise.all([
        getMyRole(),
        fetch(`${API_URL}/events`, { headers: authHeaders() })
            .then(async res => {
                if (res.status === 401) return { auth: false };
                if (!res.ok) throw new Error('Request failed');
                return { auth: true, events: await res.json() };
            })
            .catch(() => ({ error: true })),
    ]);

    // The screen may have been navigated away from while loading.
    if (!document.getElementById('ev-list')) return;

    if (result.auth === false) {
        toast('Session expired — please sign in again', 'error');
        navigate('/login');
        return;
    }

    if (result.error) {
        wrap.innerHTML = emptyState(
            '⚠️',
            "Couldn't load events",
            'Check your connection and try again.',
            '<button class="btn btn-secondary-fill" id="ev-retry" style="max-width:200px;margin:18px auto 0">Try again</button>'
        );
        document.getElementById('ev-retry')?.addEventListener('click', renderEvents);
        return;
    }

    const events = Array.isArray(result.events) ? result.events : [];

    if (!events.length) {
        wrap.innerHTML = emptyState(
            '🎪',
            'No events yet',
            role === 'organizer'
                ? 'Post the first one so the campus knows what\'s coming up.'
                : 'When your event leads post something, it shows up here first.'
        );
        if (role === 'organizer') mountFab();
        return;
    }

    // Newest posted event leads the page; everything else stacks below it.
    const [featured, ...rest] = events;

    wrap.innerHTML = `
        ${featuredCardHTML(featured)}
        ${rest.length ? `
            <div class="ev-section-head">
                <div class="ev-section-title">More events</div>
                <div class="ev-section-count">${rest.length}</div>
            </div>
            ${rest.map((ev, i) => cardHTML(ev, i)).join('')}
        ` : ''}
    `;

    wrap.addEventListener('click', e => {
        const card = e.target.closest('[data-ev-id]');
        if (card) navigate('/event-detail', { eventId: card.dataset.evId });
    });

    if (role === 'organizer') mountFab();
}

function emptyState(icon, title, body, extra = '') {
    return `
        <div class="empty-state" style="padding:64px 24px">
            <div class="empty-icon">${icon}</div>
            <div class="empty-title">${esc(title)}</div>
            <div class="empty-body">${esc(body)}</div>
            ${extra}
        </div>`;
}

function mountFab() {
    // The FAB lives on the screen, not the scroll area, so it stays put.
    const screen = document.querySelector('.screen');
    if (!screen || document.getElementById('ev-fab')) return;

    const btn = document.createElement('button');
    btn.className = 'ev-fab';
    btn.id = 'ev-fab';
    btn.innerHTML = `${IC.plus}<span>Post event</span>`;
    btn.addEventListener('click', () => navigate('/event-form', {}));
    screen.appendChild(btn);
}

function featuredCardHTML(ev) {
    const status = dayStatus(ev.eventDate);
    const hasPhoto = !!ev.coverImage;

    return `
        <div class="ev-featured stagger-in" style="--i:0" data-ev-id="${esc(ev._id)}">
            <div class="ev-featured-media ${hasPhoto ? '' : 'no-photo'}">
                ${hasPhoto ? `<img src="${esc(ev.coverImage)}" alt="${esc(ev.title)}" loading="lazy" />` : ''}
                <div class="ev-featured-scrim"></div>
                <div class="ev-flag"><span class="ev-flag-dot"></span>Latest</div>
                <div class="ev-featured-content">
                    <div class="ev-featured-text">
                        <div class="ev-featured-title">${esc(ev.title)}</div>
                        <div class="ev-featured-meta">
                            ${IC.calendar ? `<span style="display:inline-flex;width:14px;height:14px">${IC.calendar}</span>` : ''}
                            <span>${esc(shortDate(ev.eventDate))}</span>
                            ${status ? `<span>·</span><span>${esc(status.label)}</span>` : ''}
                        </div>
                    </div>
                    <div class="ev-date-chip" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.28)">
                        <span class="ev-date-month" style="color:#fff">${esc(monthShort(ev.eventDate))}</span>
                        <span class="ev-date-day" style="color:#fff">${esc(dayNum(ev.eventDate))}</span>
                    </div>
                </div>
            </div>
        </div>`;
}

function cardHTML(ev, index) {
    const status = dayStatus(ev.eventDate);

    return `
        <div class="ev-card stagger-in" style="--i:${index + 1}" data-ev-id="${esc(ev._id)}">
            <div class="ev-card-thumb">
                ${ev.coverImage
            ? `<img src="${esc(ev.coverImage)}" alt="${esc(ev.title)}" loading="lazy" />`
            : `<div class="ev-date-chip" style="width:100%;height:100%;border:none;background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center">
                           <span class="ev-date-month" style="color:#fff">${esc(monthShort(ev.eventDate))}</span>
                           <span class="ev-date-day" style="color:#fff">${esc(dayNum(ev.eventDate))}</span>
                       </div>`}
            </div>
            <div class="ev-card-body">
                ${status ? `<span class="ev-pill ${status.cls}">${esc(status.label)}</span>` : ''}
                <div class="ev-card-title">${esc(ev.title)}</div>
                <div class="ev-card-meta">
                    ${IC.calendar}
                    <span>${esc(shortDate(ev.eventDate))}</span>
                </div>
                ${ev.location ? `
                    <div class="ev-card-meta">
                        ${IC.pin}
                        <span>${esc(ev.location)}</span>
                    </div>` : ''}
            </div>
        </div>`;
}

/* ══════════════════════════════════════════════════
   DETAIL
══════════════════════════════════════════════════ */
export function renderEventDetail() {
    const { eventId } = getParams();

    if (!eventId) {
        navigate('/events');
        return;
    }

    document.getElementById('app').innerHTML = `
        <div class="screen screen-enter" style="background:var(--bg-secondary)">
            <div class="screen-body ev-detail-body" id="ev-detail">
                <div class="page-loader-wrap">
                    <div class="page-loader">
                        <span class="page-loader-dot"></span>
                        <span class="page-loader-dot"></span>
                        <span class="page-loader-dot"></span>
                    </div>
                    <div class="page-loader-caption">Loading event…</div>
                </div>
            </div>
        </div>`;

    loadEventDetail(eventId);
}

async function loadEventDetail(eventId) {
    let ev;
    try {
        const res = await fetch(`${API_URL}/events/${eventId}`, { headers: authHeaders() });
        if (res.status === 401) {
            toast('Session expired — please sign in again', 'error');
            navigate('/login');
            return;
        }
        if (res.status === 404) {
            toast('That event no longer exists', 'error');
            navigate('/events');
            return;
        }
        if (!res.ok) throw new Error('Request failed');
        ev = await res.json();
    } catch (_) {
        toast("Couldn't load that event", 'error');
        navigate('/events');
        return;
    }

    const host = document.getElementById('ev-detail');
    if (!host) return;   // navigated away mid-load

    await getMyRole();

    const images = Array.isArray(ev.coverImages) ? ev.coverImages.filter(Boolean) : [];
    const organizers = Array.isArray(ev.organizers) ? ev.organizers : [];
    const applyHref = safeUrl(ev.applyLink);
    const status = dayStatus(ev.eventDate);

    host.innerHTML = `
        ${galleryHTML(images, ev.title)}

        <div class="ev-detail-main">
            ${status ? `<span class="ev-pill ${status.cls}" style="margin-bottom:10px">${esc(status.label)}</span>` : ''}
            <h1 class="ev-detail-title">${esc(ev.title)}</h1>

            <div class="ev-fact-list">
                <div class="ev-fact">
                    <div class="ev-fact-icon">${IC.calendar}</div>
                    <div class="ev-fact-text">
                        <div class="ev-fact-label">When</div>
                        <div class="ev-fact-value">${esc(fullDate(ev.eventDate))}</div>
                    </div>
                </div>
                ${ev.location ? `
                    <div class="ev-fact">
                        <div class="ev-fact-icon">${IC.pin}</div>
                        <div class="ev-fact-text">
                            <div class="ev-fact-label">Where</div>
                            <div class="ev-fact-value">${esc(ev.location)}</div>
                        </div>
                    </div>` : ''}
            </div>

            ${ev.description ? `
                <div class="ev-block-title">About</div>
                <div class="ev-description">${esc(ev.description)}</div>
            ` : ''}

            ${organizers.length ? `
                <div class="ev-block-title">Organised by</div>
                <div class="ev-org-list">
                    ${organizers.map(organizerHTML).join('')}
                </div>
            ` : ''}
        </div>

        ${applyHref ? `
            <div class="ev-apply-bar">
                <a class="btn btn-primary" href="${applyHref}" target="_blank" rel="noopener noreferrer">
                    <span style="display:inline-flex;width:19px;height:19px">${IC.ticket}</span>
                    Apply for this event
                </a>
            </div>` : ''}
    `;

    bindGallery(images.length);

    // Floating controls sit above the gallery, outside the scroll flow.
    const screen = document.querySelector('.screen');
    if (screen) {
        const backBtn = document.createElement('button');
        backBtn.className = 'ev-back-float';
        backBtn.innerHTML = IC.back;
        backBtn.setAttribute('aria-label', 'Back to events');
        backBtn.addEventListener('click', () => navigate('/events'));
        screen.appendChild(backBtn);

        if (isOrganizer()) {
            const admin = document.createElement('div');
            admin.className = 'ev-admin-float';
            admin.innerHTML = `
                <button class="ev-back-float" id="ev-edit" aria-label="Edit event">${IC.pencil}</button>
                <button class="ev-back-float" id="ev-delete" aria-label="Delete event">${IC.trash}</button>`;
            screen.appendChild(admin);

            admin.querySelector('#ev-edit').addEventListener('click',
                () => navigate('/event-form', { eventId: ev._id }));
            admin.querySelector('#ev-delete').addEventListener('click',
                () => deleteEvent(ev._id, ev.title));
        }
    }
}

function galleryHTML(images, title) {
    if (!images.length) {
        // No photos — a branded block still gives the back button something
        // to sit on and keeps the page from starting with bare text.
        return `<div class="ev-gallery" style="aspect-ratio:16/9;background:var(--accent-grad)"></div>`;
    }

    return `
        <div class="ev-gallery">
            <div class="ev-gallery-track" id="ev-track">
                ${images.map((src, i) => `
                    <div class="ev-gallery-slide">
                        <img src="${esc(src)}" alt="${esc(title)} — photo ${i + 1}" />
                    </div>`).join('')}
            </div>
            ${images.length > 1 ? `
                <div class="ev-gallery-dots" id="ev-dots">
                    ${images.map((_, i) => `<span class="ev-dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
                </div>` : ''}
        </div>`;
}

function bindGallery(count) {
    if (count < 2) return;

    const track = document.getElementById('ev-track');
    const dots = document.getElementById('ev-dots');
    if (!track || !dots) return;

    const marks = [...dots.children];

    // rAF-throttled so dragging through a long gallery stays smooth.
    let ticking = false;
    track.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const index = Math.round(track.scrollLeft / track.clientWidth);
            marks.forEach((m, i) => m.classList.toggle('active', i === index));
            ticking = false;
        });
    }, { passive: true });
}

function organizerHTML(org) {
    const phone = String(org?.phone || '').trim();
    const email = String(org?.email || '').trim();

    return `
        <div class="ev-org">
            <div class="ev-org-avatar">${esc(initials(org?.name))}</div>
            <div class="ev-org-body">
                <div class="ev-org-name">${esc(org?.name || 'Organiser')}</div>
                ${org?.roleTitle ? `<div class="ev-org-role">${esc(org.roleTitle)}</div>` : ''}
            </div>
            <div class="ev-org-actions">
                ${phone ? `<a class="ev-org-btn" href="tel:${esc(phone.replace(/[^\d+]/g, ''))}" aria-label="Call ${esc(org.name)}">${IC.phone}</a>` : ''}
                ${email ? `<a class="ev-org-btn" href="mailto:${esc(email)}" aria-label="Email ${esc(org.name)}">${IC.mail}</a>` : ''}
            </div>
        </div>`;
}

async function deleteEvent(eventId, title) {
    const ok = await confirmSheet(
        'Delete this event?',
        `"${title}" will be removed for everyone. This can't be undone.`
    );
    if (!ok) return;

    try {
        const res = await fetch(`${API_URL}/events/${eventId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.message || 'Delete failed');
        }
        toast('Event deleted', 'success');
        navigate('/events');
    } catch (err) {
        toast(err.message || 'Could not delete the event', 'error');
    }
}

/* ══════════════════════════════════════════════════
   COMPOSER  (organizers only)
══════════════════════════════════════════════════ */
let _draftImages = [];
let _draftOrganizers = [];

export async function renderEventForm() {
    const role = await getMyRole();
    if (role !== 'organizer') {
        toast('Only event organisers can post events', 'error');
        navigate('/events');
        return;
    }

    const { eventId } = getParams();
    const editing = !!eventId;

    _draftImages = [];
    _draftOrganizers = [];

    let existing = null;
    if (editing) {
        try {
            const res = await fetch(`${API_URL}/events/${eventId}`, { headers: authHeaders() });
            if (!res.ok) throw new Error();
            existing = await res.json();
            _draftImages = (existing.coverImages || []).filter(Boolean);
            _draftOrganizers = (existing.organizers || []).map(o => ({
                name: o.name || '', roleTitle: o.roleTitle || '',
                phone: o.phone || '', email: o.email || '',
            }));
        } catch (_) {
            toast("Couldn't load that event", 'error');
            navigate('/events');
            return;
        }
    }

    if (!_draftOrganizers.length) {
        _draftOrganizers = [{ name: '', roleTitle: '', phone: '', email: '' }];
    }

    document.getElementById('app').innerHTML = `
        <div class="screen screen-enter" style="background:var(--bg-secondary)">
            <div class="nav-bar">
                <div class="nav-left">
                    <button class="nav-back" id="ev-cancel">
                        <svg viewBox="0 0 10 17" fill="none"><path d="M8.5 1L1.5 8.5l7 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        Cancel
                    </button>
                </div>
                <div class="nav-center">
                    <div class="nav-title-inline">${editing ? 'Edit event' : 'New event'}</div>
                </div>
                <div class="nav-right"></div>
            </div>

            <div class="screen-body ev-form-body">
                <div class="ev-field">
                    <label class="ev-field-label" for="ev-title">Event name</label>
                    <input class="ev-input" id="ev-title" maxlength="120"
                           placeholder="e.g. Ecstasia '26 — Cultural Fest"
                           value="${esc(existing?.title || '')}" />
                </div>

                <div class="ev-field">
                    <label class="ev-field-label" for="ev-date">Date and time</label>
                    <input class="ev-input" id="ev-date" type="datetime-local"
                           value="${esc(toLocalInput(existing?.eventDate))}" />
                </div>

                <div class="ev-field">
                    <label class="ev-field-label" for="ev-location">Venue</label>
                    <input class="ev-input" id="ev-location" maxlength="140"
                           placeholder="e.g. Main Auditorium, Block A"
                           value="${esc(existing?.location || '')}" />
                </div>

                <div class="ev-field">
                    <label class="ev-field-label" for="ev-desc">Details</label>
                    <textarea class="ev-input" id="ev-desc" maxlength="4000"
                              placeholder="What's the event about? Who can join? What should people bring?">${esc(existing?.description || '')}</textarea>
                </div>

                <div class="ev-field">
                    <label class="ev-field-label">Cover photos</label>
                    <div class="ev-photo-grid" id="ev-photos"></div>
                    <div class="form-hint">Up to 8 photos. The first one is used as the cover.</div>
                    <input type="file" id="ev-file" accept="image/*" multiple hidden />
                </div>

                <div class="ev-field">
                    <label class="ev-field-label">Organisers</label>
                    <div id="ev-orgs"></div>
                    <button class="btn btn-secondary-fill btn-sm" id="ev-add-org" style="margin-top:4px">
                        + Add another organiser
                    </button>
                </div>

                <div class="ev-field">
                    <label class="ev-field-label" for="ev-apply">Application form link</label>
                    <input class="ev-input" id="ev-apply" inputmode="url"
                           placeholder="https://forms.gle/…"
                           value="${esc(existing?.applyLink || '')}" />
                </div>

                <button class="btn btn-primary" id="ev-save" style="margin-top:8px">
                    ${editing ? 'Save changes' : 'Publish event'}
                </button>
            </div>
        </div>`;

    drawPhotos();
    drawOrganizers();

    document.getElementById('ev-cancel').addEventListener('click',
        () => editing ? navigate('/event-detail', { eventId }) : navigate('/events'));

    document.getElementById('ev-photos').addEventListener('click', e => {
        if (e.target.closest('.ev-photo-add')) {
            document.getElementById('ev-file').click();
            return;
        }
        const rm = e.target.closest('[data-rm]');
        if (rm) {
            _draftImages.splice(Number(rm.dataset.rm), 1);
            drawPhotos();
        }
    });

    document.getElementById('ev-file').addEventListener('change', handleFiles);
    document.getElementById('ev-add-org').addEventListener('click', () => {
        if (_draftOrganizers.length >= 10) {
            toast('That\'s the maximum number of organisers', 'error');
            return;
        }
        syncOrganizersFromDOM();
        _draftOrganizers.push({ name: '', roleTitle: '', phone: '', email: '' });
        drawOrganizers();
    });

    document.getElementById('ev-save').addEventListener('click', () => saveEvent(eventId));
}

// <input type="datetime-local"> needs local wall-clock time, not an ISO string.
function toLocalInput(value) {
    const d = toDate(value);
    if (!d) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function drawPhotos() {
    const grid = document.getElementById('ev-photos');
    if (!grid) return;

    grid.innerHTML = `
        ${_draftImages.map((src, i) => `
            <div class="ev-photo-cell">
                <img src="${esc(src)}" alt="Cover ${i + 1}" />
                <button class="ev-photo-remove" data-rm="${i}" aria-label="Remove photo ${i + 1}">×</button>
            </div>`).join('')}
        ${_draftImages.length < 8 ? `
            <button class="ev-photo-add" type="button">
                ${IC.plus}
                <span>Add</span>
            </button>` : ''}
    `;
}

function drawOrganizers() {
    const host = document.getElementById('ev-orgs');
    if (!host) return;

    host.innerHTML = _draftOrganizers.map((o, i) => `
        <div class="ev-org-edit" data-org="${i}">
            <div class="ev-org-edit-head">
                <span class="ev-org-edit-num">Organiser ${i + 1}</span>
                ${_draftOrganizers.length > 1
            ? `<button class="ev-org-edit-remove" data-org-rm="${i}">Remove</button>` : ''}
            </div>
            <input class="ev-input" data-f="name"      placeholder="Full name"            value="${esc(o.name)}" />
            <input class="ev-input" data-f="roleTitle" placeholder="Role (e.g. Lead)"     value="${esc(o.roleTitle)}" />
            <input class="ev-input" data-f="phone"     placeholder="Phone" inputmode="tel"  value="${esc(o.phone)}" />
            <input class="ev-input" data-f="email"     placeholder="Email" inputmode="email" value="${esc(o.email)}" />
        </div>`).join('');

    host.querySelectorAll('[data-org-rm]').forEach(btn => {
        btn.addEventListener('click', () => {
            syncOrganizersFromDOM();
            _draftOrganizers.splice(Number(btn.dataset.orgRm), 1);
            drawOrganizers();
        });
    });
}

// Reads the live inputs back into the draft before any re-render,
// so typed-but-unsaved text isn't lost when a row is added or removed.
function syncOrganizersFromDOM() {
    document.querySelectorAll('[data-org]').forEach(row => {
        const i = Number(row.dataset.org);
        if (!_draftOrganizers[i]) return;
        row.querySelectorAll('[data-f]').forEach(input => {
            _draftOrganizers[i][input.dataset.f] = input.value;
        });
    });
}

/* Resize before upload — phone photos are several MB each and would
   blow past the request limit as base64. */
function resizeImage(file, maxDim = 1400, quality = 0.78) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read that file'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('That file is not a valid image'));
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const scale = maxDim / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

async function handleFiles(e) {
    const files = [...e.target.files];
    e.target.value = '';          // let the same file be re-picked later
    if (!files.length) return;

    const room = 8 - _draftImages.length;
    if (room <= 0) {
        toast('You already have 8 photos', 'error');
        return;
    }
    if (files.length > room) toast(`Only the first ${room} photo(s) were added`, '');

    for (const file of files.slice(0, room)) {
        if (!file.type.startsWith('image/')) continue;
        try {
            _draftImages.push(await resizeImage(file));
        } catch (_) {
            toast(`Couldn't add ${file.name}`, 'error');
        }
    }
    drawPhotos();
}

async function saveEvent(eventId) {
    syncOrganizersFromDOM();

    const title = document.getElementById('ev-title').value.trim();
    const dateRaw = document.getElementById('ev-date').value;
    const location = document.getElementById('ev-location').value.trim();
    const description = document.getElementById('ev-desc').value.trim();
    const applyLink = document.getElementById('ev-apply').value.trim();

    if (!title) { toast('Give the event a name', 'error'); return; }
    if (!dateRaw) { toast('Pick a date and time', 'error'); return; }

    const when = new Date(dateRaw);
    if (isNaN(when.getTime())) { toast('That date doesn\'t look right', 'error'); return; }

    const organizers = _draftOrganizers.filter(o => o.name.trim());

    const btn = document.getElementById('ev-save');
    const label = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving…';

    try {
        const res = await fetch(
            eventId ? `${API_URL}/events/${eventId}` : `${API_URL}/events`,
            {
                method: eventId ? 'PUT' : 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    title,
                    description,
                    location,
                    applyLink,
                    organizers,
                    coverImages: _draftImages,
                    eventDate: when.toISOString(),
                }),
            }
        );

        const data = await res.json().catch(() => ({}));

        if (res.status === 403) throw new Error('Only event organisers can do that');
        if (res.status === 413) throw new Error('Those photos are too large — try fewer of them');
        if (!res.ok) throw new Error(data.message || 'Could not save the event');

        toast(eventId ? 'Event updated' : 'Event published', 'success');
        navigate('/events');

    } catch (err) {
        toast(err.message || 'Could not save the event', 'error');
        btn.disabled = false;
        btn.textContent = label;
    }
}