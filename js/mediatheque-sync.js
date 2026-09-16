/**
 * AKEVA SÉRÉNITÉ — Moteur de Synchronisation Médiathèque Publique & Temps Réel
 * - Récupère les Réalisations, Galeries/Vidéos et Documents depuis Supabase
 * - Met à jour dynamiquement les pages mediatheque.html, realisations.html, galerie.html, documents.html
 * - Visionneuse Lightbox intégrée pour les photos et vidéos
 */

(function () {
  'use strict';

  const SUPABASE_URL = "https://ztbgcgntluttgzjunwvu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0YmdjZ250bHV0dGd6anVud3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDYxNTYsImV4cCI6MjEwNDcyMjE1Nn0.zbUeyWvnBF7V5DBhbAqJBu1gYaGDt_G7wA5SBtiotmA";

  let supabaseClient = null;

  async function getClient() {
    if (supabaseClient) return supabaseClient;
    if (window.AkevaSupabase && window.AkevaSupabase.client) {
      supabaseClient = window.AkevaSupabase.client;
      return supabaseClient;
    }
    if (window.supabase) {
      try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return supabaseClient;
      } catch (e) {
        console.warn("Supabase init error:", e);
      }
    }
    return null;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Rendu dynamique des Réalisations
  function renderRealisations(list, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !Array.isArray(list) || list.length === 0) return;

    container.innerHTML = list.map(item => `
      <article class="bg-surface-container-lowest rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all duration-300 group">
        <div class="relative h-60 w-full overflow-hidden bg-slate-900">
          <img src="${item.image_url || 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=2560&q=90'}" 
               alt="${escapeHtml(item.title)}" 
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer btn-open-lightbox"
               data-type="image"
               data-src="${item.image_url || 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=3840&q=95'}"
               data-title="${escapeHtml(item.title)}"/>
          <div class="absolute top-4 left-4">
            <span class="px-3 py-1 rounded-full bg-primary/80 backdrop-blur-md text-secondary-fixed text-[11px] font-bold tracking-wider uppercase shadow-sm">
              ${escapeHtml(item.quartier || 'Yaoundé')}
            </span>
          </div>
        </div>
        <div class="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h3 class="font-headline-sm text-xl font-bold text-primary mb-2 leading-snug">
              ${escapeHtml(item.title)}
            </h3>
            <p class="font-body-sm text-slate-600 text-xs sm:text-sm leading-relaxed mb-4">
              ${escapeHtml(item.desc)}
            </p>
            <div class="p-3.5 rounded-2xl bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center gap-2 border border-emerald-100">
              <span class="material-symbols-outlined text-emerald-600 text-lg shrink-0">verified</span>
              <span><strong>Résultat :</strong> ${escapeHtml(item.result)}</span>
            </div>
          </div>
          <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span class="text-[11px] text-slate-400 font-medium">Intervention certifiée Akeva</span>
            <a href="contact.html" class="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">
              <span>Besoin similaire ?</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>
        </div>
      </article>
    `).join('');

    initLightboxTriggers();
  }

  // Rendu dynamique de la Galerie Photos & Vidéos
  function renderGalerie(list, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !Array.isArray(list) || list.length === 0) return;

    container.innerHTML = list.map(item => {
      const isVideo = item.media_type === 'video';
      return `
        <div class="bg-surface-container-lowest rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-300 group" data-category="${escapeHtml(item.category || 'Tous')}">
          <div class="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-900 flex items-center justify-center">
            ${isVideo ? `
              <video src="${item.media_url}" class="w-full h-full object-cover"></video>
              <button type="button" class="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors btn-open-lightbox"
                      data-type="video" data-src="${item.media_url}" data-title="${escapeHtml(item.title)}">
                <span class="w-12 h-12 rounded-full bg-secondary text-primary flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-2xl">play_arrow</span>
                </span>
              </button>
            ` : `
              <img src="${item.media_url}" alt="${escapeHtml(item.title)}" 
                   class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer btn-open-lightbox"
                   data-type="image" data-src="${item.media_url}" data-title="${escapeHtml(item.title)}"/>
            `}
            <span class="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
              ${escapeHtml(item.category || 'Média')}
            </span>
          </div>
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <h4 class="font-headline text-sm font-bold text-primary mb-1 line-clamp-1">
                ${escapeHtml(item.title)}
              </h4>
              <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">
                ${escapeHtml(item.caption || '')}
              </p>
            </div>
            <div class="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Yaoundé, Cameroun</span>
              <span class="material-symbols-outlined text-sm text-secondary cursor-pointer btn-open-lightbox"
                    data-type="${isVideo ? 'video' : 'image'}" data-src="${item.media_url}" data-title="${escapeHtml(item.title)}">
                ${isVideo ? 'play_circle' : 'zoom_in'}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    initLightboxTriggers();
  }

  // Rendu dynamique des Documents & Médias
  function renderDocuments(list, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !Array.isArray(list) || list.length === 0) return;

    container.innerHTML = list.map(item => {
      const isPdf = (item.file_type || 'PDF').toUpperCase() === 'PDF';
      return `
        <div class="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between mb-4">
              <div class="w-12 h-12 rounded-2xl ${isPdf ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'} flex items-center justify-center">
                <span class="material-symbols-outlined text-2xl">${isPdf ? 'picture_as_pdf' : 'description'}</span>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-primary uppercase tracking-wider">
                ${escapeHtml(item.category || 'Officiel')}
              </span>
            </div>
            <h3 class="font-headline text-base font-bold text-primary mb-2 leading-snug">
              ${escapeHtml(item.title)}
            </h3>
            <p class="text-xs text-slate-500 leading-relaxed mb-6">
              ${escapeHtml(item.desc || '')}
            </p>
          </div>

          <div class="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-400 font-mono text-[11px]">${escapeHtml(item.file_size || '1.2 Mo')} • ${escapeHtml(item.date || '2026')}</span>
            <a href="${item.file_url || '#'}" target="_blank" download class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary-container text-secondary-fixed hover:bg-primary text-xs font-bold transition-colors shadow-sm">
              <span class="material-symbols-outlined text-base">download</span>
              <span>Télécharger</span>
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  // Lightbox Modal
  function initLightbox() {
    if (document.getElementById('akeva-lightbox')) return;

    const modal = document.createElement('div');
    modal.id = 'akeva-lightbox';
    modal.className = 'fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 hidden backdrop-blur-sm transition-opacity duration-300';
    modal.innerHTML = `
      <div class="w-full max-w-4xl flex items-center justify-between pb-3 text-white">
        <h3 id="lightbox-title" class="font-headline text-base font-bold truncate pr-4"></h3>
        <button id="lightbox-close" class="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
          <span class="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>
      <div id="lightbox-content" class="w-full max-w-4xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black">
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#lightbox-close').addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.querySelector('#lightbox-content').innerHTML = '';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        modal.querySelector('#lightbox-content').innerHTML = '';
      }
    });
  }

  function initLightboxTriggers() {
    initLightbox();
    const modal = document.getElementById('akeva-lightbox');
    const content = document.getElementById('lightbox-content');
    const titleEl = document.getElementById('lightbox-title');

    document.querySelectorAll('.btn-open-lightbox').forEach(el => {
      el.addEventListener('click', function () {
        const type = this.getAttribute('data-type');
        const src = this.getAttribute('data-src');
        const title = this.getAttribute('data-title') || '';

        if (!src) return;

        titleEl.textContent = title;
        if (type === 'video') {
          content.innerHTML = `<video src="${src}" class="max-w-full max-h-[75vh] rounded-xl shadow-2xl" controls autoplay></video>`;
        } else {
          content.innerHTML = `<img src="${src}" alt="${escapeHtml(title)}" class="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"/>`;
        }

        modal.classList.remove('hidden');
      });
    });
  }

  // Filtrage d'onglets (pour mediatheque.html)
  function initMediathequeTabs() {
    const tabButtons = document.querySelectorAll('.mediatheque-tab-btn');
    if (tabButtons.length === 0) return;

    tabButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const tabKey = this.getAttribute('data-tab');

        tabButtons.forEach(b => {
          b.classList.remove('active', 'bg-primary-container', 'text-secondary-fixed', 'font-bold');
          b.classList.add('bg-surface-container-low', 'text-on-surface-variant');
        });
        this.classList.add('active', 'bg-primary-container', 'text-secondary-fixed', 'font-bold');
        this.classList.remove('bg-surface-container-low', 'text-on-surface-variant');

        const secRea = document.getElementById('section-mediatheque-realisations');
        const secGal = document.getElementById('section-mediatheque-galerie');
        const secDoc = document.getElementById('section-mediatheque-documents');

        if (tabKey === 'all') {
          if (secRea) secRea.classList.remove('hidden');
          if (secGal) secGal.classList.remove('hidden');
          if (secDoc) secDoc.classList.remove('hidden');
        } else if (tabKey === 'realisations') {
          if (secRea) secRea.classList.remove('hidden');
          if (secGal) secGal.classList.add('hidden');
          if (secDoc) secDoc.classList.add('hidden');
        } else if (tabKey === 'galerie') {
          if (secRea) secRea.classList.add('hidden');
          if (secGal) secGal.classList.remove('hidden');
          if (secDoc) secDoc.classList.add('hidden');
        } else if (tabKey === 'documents') {
          if (secRea) secRea.classList.add('hidden');
          if (secGal) secGal.classList.add('hidden');
          if (secDoc) secDoc.classList.remove('hidden');
        }
      });
    });

    // Support des hash dans l'URL (ex: #realisations, #galerie, #documents)
    if (window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      const matchingBtn = document.querySelector(`.mediatheque-tab-btn[data-tab="${hash}"]`);
      if (matchingBtn) matchingBtn.click();
    }
  }

  // Filtrage par catégorie de galerie
  function initGalerieCategoryFilters() {
    const filterBtns = document.querySelectorAll('.galerie-filter-btn');
    if (filterBtns.length === 0) return;

    filterBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const cat = this.getAttribute('data-category');

        filterBtns.forEach(b => {
          b.classList.remove('active', 'bg-primary', 'text-white', 'font-bold');
          b.classList.add('bg-surface-container', 'text-on-surface-variant');
        });
        this.classList.add('active', 'bg-primary', 'text-white', 'font-bold');
        this.classList.remove('bg-surface-container', 'text-on-surface-variant');

        document.querySelectorAll('#galerie-grid > div').forEach(card => {
          const cardCat = card.getAttribute('data-category');
          if (cat === 'all' || cardCat === cat) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      });
    });
  }

  // Synchronisation principale depuis Supabase
  async function syncFromSupabase() {
    const sb = await getClient();
    if (!sb) return;

    try {
      const { data, error } = await sb.from('site_settings').select('key, value');
      if (!error && data) {
        data.forEach(row => {
          if (row.key === 'realisations_list') {
            renderRealisations(row.value, 'realisations-grid');
            renderRealisations(row.value, 'realisations-hub-grid');
          }
          if (row.key === 'galerie_list') {
            renderGalerie(row.value, 'galerie-grid');
            renderGalerie(row.value, 'galerie-hub-grid');
          }
          if (row.key === 'documents_list') {
            renderDocuments(row.value, 'documents-grid');
            renderDocuments(row.value, 'documents-hub-grid');
          }
        });
      }
    } catch (e) {
      console.warn("Erreur chargement Supabase:", e);
    }
  }

  // Initialisation au chargement
  document.addEventListener('DOMContentLoaded', function () {
    initLightboxTriggers();
    initMediathequeTabs();
    initGalerieCategoryFilters();
    syncFromSupabase();
  });

})();
