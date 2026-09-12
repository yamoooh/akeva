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

  /**
   * 3. Charger et afficher les témoignages publiés + Gestion de la modération publique
   */
  async function syncTemoignages() {
    const grid = document.getElementById('public-temoignages-grid');
    if (!grid) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?key=eq.temoignages_list&select=value`, {
        headers: REST_HEADERS
      });

      if (!response.ok) return;
      const data = await response.json();
      if (!data || !data[0] || !data[0].value) return;

      const list = data[0].value;
      const publishedList = list.filter(t => t.published !== false);

      if (publishedList.length === 0) return;

      const cardCtaHTML = `
        <div class="bg-[#f0f3ff] rounded-3xl p-8 border-2 border-dashed border-[#775a19]/30 flex flex-col items-center justify-center text-center">
          <div class="w-12 h-12 rounded-full bg-secondary-fixed/50 text-secondary flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-[24px]">add_comment</span>
          </div>
          <h4 class="font-headline-sm text-headline-sm text-primary font-semibold mb-2">
            Votre avis compte
          </h4>
          <p class="text-xs text-on-surface-variant mb-6 max-w-xs">
            Vous bénéficiez de l'accompagnement d'Akeva Sérénité ? Partagez votre retour d'expérience avec notre coordination.
          </p>
          <button type="button" id="btn-open-submit-temoignage" class="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer shadow-xs">
            Transmettre un témoignage
          </button>
        </div>
      `;

      grid.innerHTML = publishedList.map(tem => {
        const rating = parseInt(tem.rating) || 5;
        const starsHTML = Array.from({ length: 5 }, (_, i) => `
          <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' ${i < rating ? 1 : 0}; color: ${i < rating ? '#c5a059' : '#cbd5e1'};">star</span>
        `).join('');

        return `
          <div class="bg-white rounded-3xl p-8 shadow-sm flex flex-col justify-between border border-[#e7eeff] hover:shadow-md transition-shadow">
            <div>
              <div class="flex mb-3">
                ${starsHTML}
              </div>
              <p class="text-sm text-on-surface-variant italic leading-relaxed mb-6">
                « ${escapeHtml(tem.comment || '')} »
              </p>
            </div>
            <div class="border-t border-[#e7eeff] pt-4">
              <div class="font-bold text-primary text-sm">${escapeHtml(tem.author || 'Famille')}</div>
              <div class="text-xs text-on-surface-variant">${escapeHtml(tem.relation || 'Accompagnement')} — ${escapeHtml(tem.city || 'Yaoundé')}</div>
            </div>
          </div>
        `;
      }).join('') + cardCtaHTML;

      // Re-lier l'événement après remplacement innerHTML
      initTemoignageModal();
    } catch (e) {
      console.debug('Akeva Sync: Témoignages par défaut.');
    }
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

  function initTemoignageModal() {
    const modal = document.getElementById('modal-submit-temoignage');
    const btnOpen = document.getElementById('btn-open-submit-temoignage');
    const btnClose = document.getElementById('btn-close-modal-temoignage-public');
    const btnCancel = document.getElementById('btn-cancel-modal-temoignage-public');
    const form = document.getElementById('form-submit-temoignage-public');
    const alertBox = document.getElementById('temoignage-alert');
    const starPicker = document.getElementById('star-rating-picker');

    if (!modal) return;

    function closeModal() {
      modal.classList.add('hidden');
      if (alertBox) alertBox.classList.add('hidden');
    }

    if (btnOpen) {
      btnOpen.onclick = () => {
        if (form) form.reset();
        if (alertBox) alertBox.classList.add('hidden');
        setStarRating(5);
        modal.classList.remove('hidden');
      };
    }
    if (btnClose) btnClose.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;

    // Sélection d'étoiles dynamique (survol et clic)
    function setStarRating(val) {
      const input = document.getElementById('pub-tem-rating');
      if (input) input.value = val;
      if (starPicker) {
        starPicker.querySelectorAll('.star-btn').forEach(btn => {
          const starVal = parseInt(btn.getAttribute('data-value'));
          if (starVal <= val) {
            btn.style.fontVariationSettings = "'FILL' 1";
            btn.style.color = '#c5a059';
          } else {
            btn.style.fontVariationSettings = "'FILL' 0";
            btn.style.color = '#cbd5e1';
          }
        });
      }
    }

    if (starPicker) {
      const starBtns = starPicker.querySelectorAll('.star-btn');
      starBtns.forEach(btn => {
        btn.onmouseenter = function () {
          const hoverVal = parseInt(this.getAttribute('data-value'));
          starBtns.forEach(b => {
            const v = parseInt(b.getAttribute('data-value'));
            if (v <= hoverVal) {
              b.style.fontVariationSettings = "'FILL' 1";
              b.style.color = '#c5a059';
            } else {
              b.style.fontVariationSettings = "'FILL' 0";
              b.style.color = '#cbd5e1';
            }
          });
        };
        btn.onmouseleave = function () {
          const currentVal = parseInt(document.getElementById('pub-tem-rating')?.value || 5);
          setStarRating(currentVal);
        };
        btn.onclick = function () {
          const val = parseInt(this.getAttribute('data-value'));
          setStarRating(val);
        };
      });
    }

    // Soumission du formulaire
    if (form) {
      form.onsubmit = async function (e) {
        e.preventDefault();
        const author = document.getElementById('pub-tem-author').value.trim();
        const city = document.getElementById('pub-tem-city').value.trim();
        const relation = document.getElementById('pub-tem-relation').value.trim();
        const comment = document.getElementById('pub-tem-comment').value.trim();
        const rating = parseInt(document.getElementById('pub-tem-rating').value) || 5;

        if (!author || !city || !relation || !comment) return;

        const btnSubmit = document.getElementById('btn-submit-temoignage-btn');
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Envoi en cours...';
        }

        try {
          // Récupérer la liste actuelle
          const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?key=eq.temoignages_list&select=value`, {
            headers: REST_HEADERS
          });

          let currentList = [];
          if (res.ok) {
            const data = await res.json();
            if (data && data[0] && data[0].value) {
              currentList = data[0].value;
            }
          }

          const newTemoignage = {
            id: 'tem-' + Date.now(),
            author,
            city,
            relation,
            rating,
            comment,
            date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
            published: false // MODÉRATION : N'apparaît pas tant que non validé !
          };

          currentList.unshift(newTemoignage);

          // Sauvegarde dans site_settings
          const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/site_settings`, {
            method: 'POST',
            headers: {
              ...REST_HEADERS,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              key: 'temoignages_list',
              value: currentList
            })
          });

          if (alertBox) {
            alertBox.className = 'p-4 rounded-2xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200';
            alertBox.textContent = '✓ Merci ! Votre témoignage a été transmis à notre coordination. Il sera vérifié et publié par l\'administrateur.';
            alertBox.classList.remove('hidden');
          }

          setTimeout(() => {
            closeModal();
            if (btnSubmit) {
              btnSubmit.disabled = false;
              btnSubmit.textContent = 'Envoyer pour Modération';
            }
          }, 2800);

        } catch (err) {
          console.error('Erreur transmission témoignage:', err);
          if (alertBox) {
            alertBox.className = 'p-4 rounded-2xl text-xs font-semibold bg-red-50 text-red-800 border border-red-200';
            alertBox.textContent = 'Une erreur est survenue lors de l\'envoi. Veuillez réespérer.';
            alertBox.classList.remove('hidden');
          }
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Envoyer pour Modération';
          }
        }
      };
    }
  }

  // Initialisation dès que le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      syncSiteSettings();
      syncRealisations();
      syncTemoignages();
      initTemoignageModal();
    });
  } else {
    syncSiteSettings();
    syncRealisations();
    syncTemoignages();
    initTemoignageModal();
  }
})();
