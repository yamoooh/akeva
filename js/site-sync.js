/**
 * AKEVA SÉRÉNITÉ — Synchronisation dynamique du site public avec Supabase
 * Permet la mise à jour automatique et instantanée des coordonnées (téléphones, WhatsApp, adresse),
 * de la bannière d'annonce et des réalisations publiées depuis le Back-Office (/admin).
 */

(function () {
  'use strict';

  const SUPABASE_URL = "https://ztbgcgntluttgzjunwvu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0YmdjZ250bHV0dGd6anVud3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDYxNTYsImV4cCI6MjEwNDcyMjE1Nn0.zbUeyWvnBF7V5DBhbAqJBu1gYaGDt_G7wA5SBtiotmA";

  const REST_HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Accept': 'application/json'
  };

  /**
   * 1. Charger et synchroniser les paramètres du site (contact_info & stats)
   */
  async function syncSiteSettings() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?select=key,value`, {
        headers: REST_HEADERS
      });

      if (!response.ok) return;
      const data = await response.json();

      data.forEach(item => {
        if (item.key === 'contact_info' && item.value) {
          applyContactSettings(item.value);
        } else if (item.key === 'stats_metrics' && item.value) {
          applyStatsMetrics(item.value);
        }
      });
    } catch (e) {
      console.debug('Akeva Sync: Données par défaut utilisées.');
    }
  }

  function applyContactSettings(settings) {
    // 1. Bannière d'annonce
    if (settings.banner_announcement) {
      const bannerEl = document.getElementById('site-banner-text') || document.querySelector('.banner-announcement-text');
      if (bannerEl) bannerEl.textContent = settings.banner_announcement;
    }

    // 2. Numéros de téléphone
    const p1 = settings.phone_primary || '697 572 685';
    const p2 = settings.phone_secondary || '653 151 427';
    const p1Clean = p1.replace(/[^0-9]/g, '');
    const p2Clean = p2.replace(/[^0-9]/g, '');

    // Liens tel
    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href.includes('697572685') || link.classList.contains('sync-phone-1')) {
        link.setAttribute('href', `tel:+237${p1Clean}`);
        if (link.textContent.trim().includes('697')) {
          link.textContent = p1;
        }
      } else if (href.includes('653151427') || link.classList.contains('sync-phone-2')) {
        link.setAttribute('href', `tel:+237${p2Clean}`);
        if (link.textContent.trim().includes('653')) {
          link.textContent = p2;
        }
      }
    });

    // 3. Liens WhatsApp
    if (settings.whatsapp) {
      const waNumber = settings.whatsapp.replace(/[^0-9]/g, '');
      document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
        const currentHref = link.getAttribute('href');
        try {
          const url = new URL(currentHref);
          const params = url.search;
          link.setAttribute('href', `https://wa.me/${waNumber}${params}`);
        } catch (err) {
          link.setAttribute('href', `https://wa.me/${waNumber}`);
        }
      });
    }

    // 4. Adresse physique
    if (settings.address) {
      document.querySelectorAll('.sync-address').forEach(el => {
        el.textContent = settings.address;
      });
    }
  }

  function applyStatsMetrics(metrics) {
    if (metrics.taux_satisfaction) {
      document.querySelectorAll('.sync-satisfaction-rate').forEach(el => {
        el.textContent = `${metrics.taux_satisfaction}%`;
      });
    }
    if (metrics.beneficiaires_actifs) {
      document.querySelectorAll('.sync-beneficiaires').forEach(el => {
        el.textContent = `+${metrics.beneficiaires_actifs}`;
      });
    }
  }

  /**
   * 2. Charger les réalisations publiées (Galerie)
   */
  async function syncRealisations() {
    const grid = document.getElementById('public-realisations-grid');
    if (!grid) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/realisations?published=eq.true&order=created_at.desc&limit=6`, {
        headers: REST_HEADERS
      });

      if (!response.ok) return;
      const realisations = await response.json();

      if (!realisations || realisations.length === 0) return;

      grid.innerHTML = realisations.map(item => {
        let mediaTag = '';
        if (item.media_type === 'video') {
          mediaTag = `<video src="${item.media_url}" controls class="w-full h-48 object-cover rounded-2xl bg-slate-900"></video>`;
        } else if (item.media_type === 'document') {
          mediaTag = `
            <a href="${item.media_url}" target="_blank" class="w-full h-48 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 hover:bg-slate-100 transition-colors">
              <span class="material-symbols-outlined text-4xl text-red-500 mb-2">picture_as_pdf</span>
              <span class="text-xs font-bold text-slate-700 text-center">Consulter le document</span>
            </a>`;
        } else {
          mediaTag = `<img src="${item.media_url}" alt="${item.title}" class="w-full h-48 object-cover rounded-2xl shadow-xs" loading="lazy"/>`;
        }

        return `
          <div class="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              ${mediaTag}
              <div class="mt-3">
                <span class="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold uppercase tracking-wider mb-1">${item.category || 'Général'}</span>
                <h4 class="font-bold text-slate-900 text-sm leading-snug">${item.title}</h4>
                ${item.description ? `<p class="text-xs text-slate-500 mt-1 line-clamp-2">${item.description}</p>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.debug('Akeva Sync: Réalisations par défaut.');
    }
  }

  // Initialisation dès que le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      syncSiteSettings();
      syncRealisations();
    });
  } else {
    syncSiteSettings();
    syncRealisations();
  }
})();
