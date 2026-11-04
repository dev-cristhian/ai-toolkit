// Progressive enhancement for the hub page. Content is pre-rendered in
// index.html; this script only adds theme switching, copy buttons, tabs
// and search/filter controls. UI strings are pt-BR on purpose.
(() => {
  'use strict';

  const THEME_KEY = 'ai-toolkit:theme';
  const live = document.getElementById('live-region');

  function announce(message) {
    if (!live) return;
    live.textContent = '';
    // A new text node after a tick makes screen readers re-announce repeated messages.
    window.setTimeout(() => { live.textContent = message; }, 50);
  }

  const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  // --- Theme (light by default; dark only when the user chooses it) -------
  function setupTheme() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    const root = document.documentElement;
    const label = button.querySelector('span');
    const sync = () => {
      const dark = root.getAttribute('data-theme') === 'dark';
      button.setAttribute('aria-pressed', String(dark));
      if (label) label.textContent = 'Modo escuro';
    };
    button.addEventListener('click', () => {
      const dark = root.getAttribute('data-theme') !== 'dark';
      if (dark) root.setAttribute('data-theme', 'dark');
      else root.removeAttribute('data-theme');
      try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) { /* storage unavailable */ }
      sync();
      announce(dark ? 'Modo escuro ativado' : 'Modo claro ativado');
    });
    sync();
  }

  // --- Copy buttons ---------------------------------------------------------
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (!ok) throw new Error('copy failed');
  }

  function setupCopy() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('.btn-copy');
      if (!button) return;
      const text = button.getAttribute('data-copy') || '';
      const label = button.querySelector('.btn-copy__text');
      const icon = button.querySelector('use');
      try {
        await copyText(text);
        button.setAttribute('data-copied', 'true');
        if (label) label.textContent = 'Copiado!';
        if (icon) icon.setAttribute('href', '#i-check');
        announce('Comando copiado para a área de transferência');
        window.setTimeout(() => {
          button.removeAttribute('data-copied');
          if (label) label.textContent = 'Copiar';
          if (icon) icon.setAttribute('href', '#i-copy');
        }, 2000);
      } catch (e) {
        announce('Não foi possível copiar. Selecione o comando e copie manualmente.');
      }
    });
  }

  // --- Tabs (WAI-ARIA tabs pattern, automatic activation) ------------------
  function setupTabs() {
    document.querySelectorAll('[data-tabs]').forEach((container) => {
      const list = container.querySelector('[role="tablist"]');
      if (!list) return;
      const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
      const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
      container.classList.add('is-enhanced');
      list.hidden = false;
      panels.forEach((panel) => {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('tabindex', '0');
      });

      const select = (index, focus) => {
        tabs.forEach((tab, i) => {
          const active = i === index;
          tab.setAttribute('aria-selected', String(active));
          tab.tabIndex = active ? 0 : -1;
          panels[i].hidden = !active;
        });
        if (focus) tabs[index].focus();
      };

      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(i, false));
        tab.addEventListener('keydown', (event) => {
          const last = tabs.length - 1;
          let next = null;
          if (event.key === 'ArrowRight') next = i === last ? 0 : i + 1;
          else if (event.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = last;
          if (next !== null) {
            event.preventDefault();
            select(next, true);
          }
        });
      });
      select(0, false);
    });
  }

  // --- Chip groups (single choice, aria-pressed) ---------------------------
  function setupChips(selector, onChange) {
    const chips = Array.from(document.querySelectorAll(selector));
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        onChange();
      });
    });
    return () => {
      const active = chips.find((c) => c.getAttribute('aria-pressed') === 'true');
      return active ? active.getAttribute(selector.match(/\[(.+?)\]/)[1]) : '';
    };
  }

  function debounce(fn, ms) {
    let id;
    return (...args) => { window.clearTimeout(id); id = window.setTimeout(() => fn(...args), ms); };
  }

  // --- Glossary filter -----------------------------------------------------
  function setupGlossary() {
    const toolbar = document.querySelector('[data-glossary-toolbar]');
    const input = document.getElementById('glossary-search');
    const count = document.getElementById('glossary-count');
    const empty = document.getElementById('glossary-empty');
    const terms = Array.from(document.querySelectorAll('#glossary-list .term'));
    if (!toolbar || !input || !terms.length) return;
    toolbar.hidden = false;

    let getCategory = () => '';
    const apply = () => {
      const query = normalize(input.value);
      const category = getCategory();
      let visible = 0;
      terms.forEach((term) => {
        const match = (!category || term.dataset.category === category)
          && (!query || normalize(term.dataset.search).includes(query));
        term.hidden = !match;
        if (match) visible += 1;
      });
      const text = visible === 1 ? '1 termo' : `${visible} termos`;
      count.textContent = text;
      empty.hidden = visible !== 0;
      announce(visible ? `${text} encontrados` : 'Nenhum termo encontrado');
    };
    getCategory = setupChips('[data-glossary-category]', apply);
    input.addEventListener('input', debounce(apply, 200));
  }

  // --- Catalog filter ------------------------------------------------------
  function setupCatalog() {
    const toolbar = document.querySelector('[data-catalog-toolbar]');
    const input = document.getElementById('catalog-search');
    const count = document.getElementById('catalog-count');
    const groups = Array.from(document.querySelectorAll('[data-group]'));
    if (!toolbar || !input) return;
    toolbar.hidden = false;

    let getType = () => '';
    const apply = () => {
      const query = normalize(input.value);
      const type = getType();
      let total = 0;
      groups.forEach((group) => {
        const cards = Array.from(group.querySelectorAll('.card-item'));
        let visible = 0;
        cards.forEach((card) => {
          const match = (!type || card.dataset.type === type)
            && (!query || normalize(card.dataset.search).includes(query));
          card.hidden = !match;
          if (match) visible += 1;
        });
        total += visible;
        const groupCount = group.querySelector('[data-group-count]');
        if (groupCount && cards.length) groupCount.textContent = `(${visible})`;
        const empty = group.querySelector('[data-filter-empty]');
        if (empty) empty.hidden = visible !== 0 || cards.length === 0;
      });
      const text = total === 1 ? '1 item' : `${total} itens`;
      count.textContent = text;
      announce(total ? `${text} encontrados` : 'Nenhum item encontrado');
    };
    getType = setupChips('[data-catalog-type]', apply);
    input.addEventListener('input', debounce(apply, 200));
  }

  // --- Section accordion (WAI-ARIA accordion pattern) ----------------------
  // Headings marked with data-accordion-heading get a toggle button. The
  // section's data-accordion attribute ("open" | "closed") sets the default.
  const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>';

  function setupAccordion() {
    const togglers = new Map();
    document.querySelectorAll('[data-accordion]').forEach((section) => {
      const heading = section.querySelector('[data-accordion-heading]');
      const panel = section.querySelector('.accordion__panel');
      if (!heading || !panel || !panel.id) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'accordion__trigger';
      button.setAttribute('aria-controls', panel.id);
      const label = document.createElement('span');
      label.className = 'accordion__label';
      while (heading.firstChild) label.appendChild(heading.firstChild);
      const icon = document.createElement('span');
      icon.className = 'accordion__icon';
      icon.innerHTML = CHEVRON;
      button.append(label, icon);
      heading.appendChild(button);

      const setOpen = (open) => {
        button.setAttribute('aria-expanded', String(open));
        panel.hidden = !open;
        section.classList.toggle('is-collapsed', !open);
      };
      button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
      setOpen(section.getAttribute('data-accordion') !== 'closed');
      togglers.set(section, setOpen);
    });

    // Following an in-page link (menu, "Ver o catálogo", #nivel-2...) opens the
    // section that contains the target, so the link never lands on hidden content.
    const openForHash = (hash) => {
      if (!hash || hash.length < 2) return;
      let target = null;
      try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch (e) { return; }
      const section = target && target.closest('[data-accordion]');
      if (!section || !togglers.has(section) || !section.classList.contains('is-collapsed')) return null;
      togglers.get(section)(true);
      return target;
    };
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (link) openForHash(link.getAttribute('href'));
    }, true);
    window.addEventListener('hashchange', () => openForHash(location.hash));
    // On load the browser already scrolled before the panel opened; scroll again.
    const initial = openForHash(location.hash);
    if (initial) initial.scrollIntoView();
  }

  setupAccordion();
  setupTheme();
  setupCopy();
  setupTabs();
  setupGlossary();
  setupCatalog();
})();
