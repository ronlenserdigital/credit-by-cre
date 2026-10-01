'use strict';

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const closeMenu = () => {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open menu');
  mobileNav.hidden = true;
  document.body.classList.remove('menu-open');
};
menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  if (isOpen) return closeMenu();
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Close menu');
  mobileNav.hidden = false;
  document.body.classList.add('menu-open');
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuToggle.focus();
  }
});
window.matchMedia('(min-width: 901px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

document.querySelectorAll('[data-service]').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('#service').value = link.dataset.service;
  });
});

document.querySelectorAll('[data-dialog]').forEach(button => {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.dialog).showModal();
  });
});
document.querySelectorAll('.legal-dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
});

const consultationForm = document.querySelector('#consultation-form');
let preparedMessage = '';
consultationForm.addEventListener('submit', event => {
  event.preventDefault();
  const nameInput = document.querySelector('#name');
  const emailInput = document.querySelector('#email');
  nameInput.value = nameInput.value.trim();
  emailInput.value = emailInput.value.trim();
  if (!consultationForm.reportValidity()) return;
  const formData = new FormData(consultationForm);
  const name = String(formData.get('name')).trim();
  const email = String(formData.get('email')).trim();
  const service = String(formData.get('service'));
  const goals = String(formData.get('goals') || '').trim();
  const subject = `Consultation inquiry — ${service}`;
  const body = `Hi Cre,\n\nI’d like to learn more about ${service.toLowerCase()}.\n\nName: ${name}\nEmail: ${email}\nFocus: ${service}\n${goals ? `\nMy goal:\n${goals}\n` : ''}\nPlease share the next steps and current service options.\n\nThank you,\n${name}`;
  preparedMessage = `To: creconsulting5@gmail.com\nSubject: ${subject}\n\n${body}`;
  const result = document.querySelector('#form-result');
  result.hidden = false;
  document.querySelector('#copy-status').textContent = '';
  document.querySelector('#copy-message').textContent = 'Copy my message';
  const draftLink = document.createElement('a');
  draftLink.href = `mailto:creconsulting5@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  draftLink.click();
  result.focus({ preventScroll: true });
});

document.querySelector('#copy-message').addEventListener('click', async event => {
  const button = event.currentTarget;
  const status = document.querySelector('#copy-status');
  try {
    if (!navigator.clipboard) throw new Error('Clipboard is unavailable');
    await navigator.clipboard.writeText(preparedMessage);
    button.textContent = 'Message copied';
    status.textContent = 'Paste it into an email addressed to Cre, then review and send.';
  } catch {
    status.textContent = '';
    const message = document.createElement('textarea');
    message.readOnly = true;
    message.rows = 8;
    message.setAttribute('aria-label', 'Your consultation message — select and copy');
    message.value = preparedMessage;
    status.append('Select and copy your message below:', message);
    message.focus();
    message.select();
  }
});

document.querySelector('#year').textContent = new Date().getFullYear();

// Optional browser agent access to the same consultation form. This only stages
// fields; the visitor still reviews the form and sends their own email.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const serviceOptions = ['Credit repair', 'Profile optimization', 'Credit education', 'I’m not sure yet'];
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'stage_consultation_inquiry',
      title: 'Prepare consultation form',
      description: 'Fill the visible consultation form for review. Does not open an email app, send a message, or enroll anyone in a service.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email', maxLength: 160 },
          service: { type: 'string', enum: serviceOptions },
          goals: { type: 'string', maxLength: 1200, description: 'General goals only. Do not include sensitive financial information.' }
        },
        required: ['name', 'email', 'service'],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Provide the consultation details.');
        if (Object.keys(input).some(key => !['name', 'email', 'service', 'goals'].includes(key))) throw new Error('Unexpected field.');
        const { name, email, service, goals = '' } = input;
        if (typeof name !== 'string' || !name.trim() || name.length > 100) throw new Error('A name of 1–100 characters is required.');
        if (typeof email !== 'string' || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('A valid email address is required.');
        if (!serviceOptions.includes(service)) throw new Error('Choose an available service.');
        if (typeof goals !== 'string' || goals.length > 1200) throw new Error('Keep your goals within 1,200 characters.');
        document.querySelector('#name').value = name.trim();
        document.querySelector('#email').value = email.trim();
        document.querySelector('#service').value = service;
        document.querySelector('#goals').value = goals;
        document.querySelector('#form-result').hidden = true;
        document.querySelector('#contact').scrollIntoView();
        return { status: 'staged_for_review', service, sent: false };
      }
    }, { signal: lifecycle.signal })).catch(() => {});
  } catch { /* Standard form remains available if registration is unsupported. */ }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
