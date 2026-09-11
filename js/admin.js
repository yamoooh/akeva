/**
 * AKEVA SÉRÉNITÉ — Moteur d'Administration & Back-Office
 * - Initialisation du Premier Super Admin Unique & Sécurisé
 * - Visualisation interactive des mots de passe (œil afficher/masquer)
 * - Statistiques dynamiques & Graphiques Chart.js personnalisables manuellement
 * - Gestion des Demandes de Contact (WhatsApp direct, filtres, statuts, export)
 * - Médiathèque & Réalisations avec upload jusqu'à 100 Mo via Supabase Storage
 * - Personnalisation des textes et coordonnées du site public
 */

(function () {
  'use strict';

  // Session storage keys
  const SESSION_KEY = 'akeva_admin_session';

  // Global state
  let currentAdmin = null;
  let allRequests = [];
  let allRealisations = [];
  let currentStats = null;
  let currentSettings = null;
  let chartEvolution = null;
  let chartPie = null;
  let activeStatusFilter = 'all';

  // Elements
  const screenLoading = document.getElementById('screen-loading');
  const screenSetup = document.getElementById('screen-setup');
  const screenLogin = document.getElementById('screen-login');
  const screenDashboard = document.getElementById('screen-dashboard');

  /* ========================================================================= */
  /* 1. CRYPTO UTILS (SHA-256 + Salt via Web Crypto API)                       */
  /* ========================================================================= */

  async function sha256(str, saltHex) {
    const enc = new TextEncoder();
    const data = enc.encode(str + saltHex);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function generateSalt(len = 16) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ========================================================================= */
  /* 2. GESTION DE LA VISUALISATION DES MOTS DE PASSE (Icône œil)              */
  /* ========================================================================= */

  function initPasswordToggles() {
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
      btn.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const icon = this.querySelector('.material-symbols-outlined');
        if (!input) return;

        if (input.type === 'password') {
          input.type = 'text';
          if (icon) icon.textContent = 'visibility_off';
          this.setAttribute('title', 'Masquer le mot de passe');
        } else {
          input.type = 'password';
          if (icon) icon.textContent = 'visibility';
          this.setAttribute('title', 'Afficher le mot de passe');
        }
      });
    });
  }

  /* ========================================================================= */
  /* 3. DÉTECTION DU COMPTE SUPER ADMIN & INITIALISATION                       */
  /* ========================================================================= */

  async function getClient(maxWaitMs = 2500) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (window.AkevaSupabase && window.AkevaSupabase.client) {
        return window.AkevaSupabase.client;
      }
      if (window.supabase) {
        try {
          return window.supabase.createClient(
            "https://ztbgcgntluttgzjunwvu.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0YmdjZ250bHV0dGd6anVud3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDYxNTYsImV4cCI6MjEwNDcyMjE1Nn0.zbUeyWvnBF7V5DBhbAqJBu1gYaGDt_G7wA5SBtiotmA"
          );
        } catch (e) {}
      }
      await new Promise(res => setTimeout(res, 80));
    }
    throw new Error('Initialisation de Supabase non disponible.');
  }

  async function checkAdminAccountStatus() {
    try {
      const client = await getClient();

      // Vérifie si un compte admin existe
      const { data, count, error } = await client
        .from('admin_accounts')
        .select('id, email, full_name', { count: 'exact' });

      if (error) {
        console.warn('Erreur vérification admin_accounts:', error);
      }

      const adminCount = count !== null && count !== undefined ? count : (data ? data.length : 0);

      screenLoading.classList.add('hidden');

      if (adminCount === 0) {
        // AUCUN COMPTE : Affiche l'écran de création du premier Super Admin unique
        screenSetup.classList.remove('hidden');
        screenLogin.classList.add('hidden');
        screenDashboard.classList.add('hidden');
      } else {
        // UN COMPTE EXISTE : Vérifie si déjà connecté
        const savedSession = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed && parsed.email) {
              currentAdmin = parsed;
              showDashboard();
              return;
            }
          } catch (e) {
            localStorage.removeItem(SESSION_KEY);
          }
        }
        // Sinon, affiche l'écran de connexion
        screenSetup.classList.add('hidden');
        screenLogin.classList.remove('hidden');
        screenDashboard.classList.add('hidden');
      }
    } catch (err) {
      console.error('Erreur initialisation admin:', err);
      screenLoading.innerHTML = `
        <div class="text-center p-6 text-red-600">
          <p class="font-bold">Erreur de connexion à la base de données</p>
          <p class="text-xs text-slate-500 mt-1">${err.message || err}</p>
          <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-[#0d2040] text-white text-xs rounded-xl font-bold">Réessayer</button>
        </div>
      `;
    }
  }

  /* ========================================================================= */
  /* 4. SETUP : CRÉATION DU PREMIER ET UNIQUE COMPTE SUPER ADMIN               */
  /* ========================================================================= */

  const formSetup = document.getElementById('form-setup');
  const setupError = document.getElementById('setup-error');

  if (formSetup) {
    formSetup.addEventListener('submit', async function (e) {
      e.preventDefault();
      setupError.classList.add('hidden');

      const fullName = document.getElementById('setup-fullname').value.trim();
      const email = document.getElementById('setup-email').value.trim().toLowerCase();
      const password = document.getElementById('setup-password').value;
      const confirm = document.getElementById('setup-password-confirm').value;
      const btnSubmit = document.getElementById('btn-submit-setup');

      if (password !== confirm) {
        setupError.textContent = 'Les mots de passe ne correspondent pas.';
        setupError.classList.remove('hidden');
        return;
      }

      if (password.length < 6) {
        setupError.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
        setupError.classList.remove('hidden');
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="material-symbols-outlined text-lg animate-spin">sync</span> Création sécurisée en cours...`;

      try {
        const salt = generateSalt();
        const passwordHash = await sha256(password, salt);
        const client = window.AkevaSupabase.client;

        const { data, error } = await client
          .from('admin_accounts')
          .insert([
            {
              email: email,
              password_hash: passwordHash,
              salt: salt,
              full_name: fullName || 'Super Administrateur'
            }
          ])
          .select();

        if (error) throw error;

        // Connexion immédiate
        currentAdmin = {
          email: email,
          full_name: fullName || 'Super Administrateur',
          token: Date.now().toString()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(currentAdmin));

        showToast('Super Admin unique créé avec succès ! Bienvenue.', 'check_circle');

        // Bascule vers le tableau de bord
        screenSetup.classList.add('hidden');
        showDashboard();
      } catch (err) {
        console.error('Erreur création admin:', err);
        setupError.textContent = err.message || 'Impossible de créer le compte administrateur.';
        setupError.classList.remove('hidden');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span class="material-symbols-outlined text-lg text-[#fed488]">verified_user</span> Créer mon Compte Super Admin Unique`;
      }
    });
  }

  /* ========================================================================= */
  /* 5. AUTH : CONNEXION AU COMPTE ADMIN EXISTANT                              */
  /* ========================================================================= */

  const formLogin = document.getElementById('form-login');
  const loginError = document.getElementById('login-error');

  if (formLogin) {
    formLogin.addEventListener('submit', async function (e) {
      e.preventDefault();
      loginError.classList.add('hidden');

      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const password = document.getElementById('login-password').value;
      const btnSubmit = document.getElementById('btn-submit-login');

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="material-symbols-outlined text-lg animate-spin">sync</span> Connexion...`;

      try {
        const client = window.AkevaSupabase.client;
        const { data, error } = await client
          .from('admin_accounts')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error('Adresse email ou mot de passe incorrect.');
        }

        const computedHash = await sha256(password, data.salt);
        if (computedHash !== data.password_hash) {
          throw new Error('Adresse email ou mot de passe incorrect.');
        }

        // Succès
        currentAdmin = {
          email: data.email,
          full_name: data.full_name || 'Super Admin',
          token: Date.now().toString()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(currentAdmin));

        showToast(`Bienvenue, ${currentAdmin.full_name} !`, 'check_circle');

        screenLogin.classList.add('hidden');
        showDashboard();
      } catch (err) {
        console.error('Erreur login:', err);
        loginError.textContent = err.message || 'Identifiants invalides.';
        loginError.classList.remove('hidden');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span class="material-symbols-outlined text-lg text-[#fed488]">login</span> Se Connecter`;
      }
    });
  }

  // Déconnexion
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', function () {
      if (confirm('Voulez-vous vraiment vous déconnecter du Back-Office ?')) {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        currentAdmin = null;
        screenDashboard.classList.add('hidden');
        screenLogin.classList.remove('hidden');
        showToast('Vous êtes déconnecté.', 'logout');
      }
    });
  }

  /* ========================================================================= */
  /* 6. NAVIGATION PAR ONGLETS DU DASHBOARD                                    */
  /* ========================================================================= */

  function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', function () {
        const targetViewId = this.getAttribute('data-view');

        tabs.forEach(t => {
          t.classList.remove('active', 'border-[#0d2040]', 'text-[#0d2040]');
          t.classList.add('border-transparent', 'text-slate-500');
        });

        this.classList.add('active', 'border-[#0d2040]', 'text-[#0d2040]');
        this.classList.remove('border-transparent', 'text-slate-500');

        document.querySelectorAll('.dashboard-view').forEach(view => {
          view.classList.add('hidden');
        });

        const targetView = document.getElementById(targetViewId);
        if (targetView) {
          targetView.classList.remove('hidden');
        }

        // Redimensionner les graphiques si on affiche les stats
        if (targetViewId === 'view-stats') {
          if (chartEvolution) chartEvolution.resize();
          if (chartPie) chartPie.resize();
        }
      });
    });
  }

  /* ========================================================================= */
  /* 7. DASHBOARD : AFFICHAGE & CHARGEMENT COMPLET                             */
  /* ========================================================================= */

  function showDashboard() {
    screenDashboard.classList.remove('hidden');

    // Met à jour les infos utilisateur dans le header
    if (currentAdmin) {
      const nameEl = document.getElementById('user-display-name');
      const emailEl = document.getElementById('user-display-email');
      if (nameEl) nameEl.textContent = currentAdmin.full_name || 'Super Admin';
      if (emailEl) emailEl.textContent = currentAdmin.email || 'admin@akevaserenite.cm';
    }

    // Charge les différentes sections
    loadStatsAndCharts();
    loadContactRequests();
    loadRealisations();
    loadSiteSettings();
  }

  /* ========================================================================= */
  /* 8. STATISTIQUES DYNAMIQUES & GRAPHIQUES CHART.JS                          */
  /* ========================================================================= */

  async function loadStatsAndCharts() {
    try {
      const client = window.AkevaSupabase.client;
      const { data, error } = await client
        .from('site_settings')
        .select('value')
        .eq('key', 'stats_metrics')
        .maybeSingle();

      if (error) throw error;

      currentStats = data?.value || {
        beneficiaires: 142,
        heures_gardes: 18450,
        satisfaction_pct: 99.4,
        auxiliaires_actifs: 28,
        monthly_evolution: {
          labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"],
          visites_domicile: [18, 24, 32, 29, 38, 45, 52, 60, 68, 75, 84, 96],
          gardes_nuit: [12, 15, 20, 22, 28, 30, 36, 42, 48, 55, 62, 70]
        }
      };

      renderStatsKPIs(currentStats);
      renderCharts(currentStats);
      populateStatsForm(currentStats);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  }

  function renderStatsKPIs(stats) {
    const elBenef = document.getElementById('stat-val-beneficiaires');
    const elHeures = document.getElementById('stat-val-heures');
    const elSat = document.getElementById('stat-val-satisfaction');
    const elAux = document.getElementById('stat-val-auxiliaires');

    if (elBenef) elBenef.textContent = stats.beneficiaires?.toLocaleString('fr-FR') || '0';
    if (elHeures) elHeures.textContent = stats.heures_gardes?.toLocaleString('fr-FR') || '0';
    if (elSat) elSat.textContent = `${stats.satisfaction_pct || 99} %`;
    if (elAux) elAux.textContent = stats.auxiliaires_actifs?.toString() || '0';
  }

  function renderCharts(stats) {
    const canvasEvolution = document.getElementById('chart-evolution');
    const canvasPie = document.getElementById('chart-pie');

    const evo = stats.monthly_evolution || {
      labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"],
      visites_domicile: [18, 24, 32, 29, 38, 45, 52, 60, 68, 75, 84, 96],
      gardes_nuit: [12, 15, 20, 22, 28, 30, 36, 42, 48, 55, 62, 70]
    };

    // 1. Graphique d'évolution mensuelle
    if (canvasEvolution) {
      if (chartEvolution) chartEvolution.destroy();

      chartEvolution = new Chart(canvasEvolution, {
        type: 'line',
        data: {
          labels: evo.labels,
          datasets: [
            {
              label: 'Gardes de Jour & Domicile',
              data: evo.visites_domicile,
              borderColor: '#0d2040',
              backgroundColor: 'rgba(13, 32, 64, 0.06)',
              borderWidth: 3,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#0d2040',
              pointRadius: 4
            },
            {
              label: 'Gardes de Nuit & 24h',
              data: evo.gardes_nuit,
              borderColor: '#c5a059',
              backgroundColor: 'rgba(197, 160, 89, 0.08)',
              borderWidth: 3,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#c5a059',
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
              }
            },
            tooltip: {
              backgroundColor: '#0d2040',
              padding: 10,
              titleFont: { family: 'Plus Jakarta Sans', weight: 'bold' },
              bodyFont: { family: 'Plus Jakarta Sans' }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } }
            },
            y: {
              grid: { color: '#f1f5f9' },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } }
            }
          }
        }
      });
    }

    // 2. Graphique Donut (Répartition)
    if (canvasPie) {
      if (chartPie) chartPie.destroy();

      chartPie = new Chart(canvasPie, {
        type: 'doughnut',
        data: {
          labels: ['Garde 24h/24', 'Garde Jour', 'Garde Nuit', 'Soutien moral'],
          datasets: [{
            data: [42, 35, 18, 5],
            backgroundColor: ['#0d2040', '#c5a059', '#10b981', '#94a3b8'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          cutout: '70%'
        }
      });
    }
  }

  function populateStatsForm(stats) {
    document.getElementById('input-stat-beneficiaires').value = stats.beneficiaires || 142;
    document.getElementById('input-stat-heures').value = stats.heures_gardes || 18450;
    document.getElementById('input-stat-satisfaction').value = stats.satisfaction_pct || 99.4;
    document.getElementById('input-stat-auxiliaires').value = stats.auxiliaires_actifs || 28;

    const container = document.getElementById('container-monthly-inputs');
    if (!container) return;
    container.innerHTML = '';

    const evo = stats.monthly_evolution || {};
    const labels = evo.labels || ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const values = evo.visites_domicile || [18, 24, 32, 29, 38, 45, 52, 60, 68, 75, 84, 96];

    labels.forEach((month, idx) => {
      const div = document.createElement('div');
      div.className = 'flex flex-col';
      div.innerHTML = `
        <span class="text-[10px] font-bold text-slate-500 uppercase">${month}</span>
        <input type="number" class="input-monthly-val px-1.5 py-1 text-center rounded-lg border border-slate-200 text-xs font-semibold"
          data-month-idx="${idx}" value="${values[idx] || 0}"/>
      `;
      container.appendChild(div);
    });
  }

  // Toggle du panneau d'édition des stats
  const btnToggleStatsEditor = document.getElementById('btn-toggle-stats-editor');
  const panelStatsEditor = document.getElementById('panel-stats-editor');
  const btnCloseStatsEditor = document.getElementById('btn-close-stats-editor');
  const btnCancelStats = document.getElementById('btn-cancel-stats');

  if (btnToggleStatsEditor && panelStatsEditor) {
    btnToggleStatsEditor.addEventListener('click', () => {
      panelStatsEditor.classList.toggle('hidden');
    });
  }
  if (btnCloseStatsEditor && panelStatsEditor) {
    btnCloseStatsEditor.addEventListener('click', () => panelStatsEditor.classList.add('hidden'));
  }
  if (btnCancelStats && panelStatsEditor) {
    btnCancelStats.addEventListener('click', () => panelStatsEditor.classList.add('hidden'));
  }

  // Soumission de la mise à jour des statistiques
  const formUpdateStats = document.getElementById('form-update-stats');
  if (formUpdateStats) {
    formUpdateStats.addEventListener('submit', async function (e) {
      e.preventDefault();

      const newStats = {
        beneficiaires: parseInt(document.getElementById('input-stat-beneficiaires').value, 10) || 0,
        heures_gardes: parseInt(document.getElementById('input-stat-heures').value, 10) || 0,
        satisfaction_pct: parseFloat(document.getElementById('input-stat-satisfaction').value) || 99,
        auxiliaires_actifs: parseInt(document.getElementById('input-stat-auxiliaires').value, 10) || 0,
        monthly_evolution: {
          labels: currentStats.monthly_evolution?.labels || ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"],
          visites_domicile: [],
          gardes_nuit: []
        }
      };

      document.querySelectorAll('.input-monthly-val').forEach(input => {
        const val = parseInt(input.value, 10) || 0;
        newStats.monthly_evolution.visites_domicile.push(val);
        newStats.monthly_evolution.gardes_nuit.push(Math.round(val * 0.72));
      });

      try {
        const client = window.AkevaSupabase.client;
        const { error } = await client
          .from('site_settings')
          .upsert({
            key: 'stats_metrics',
            value: newStats,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        currentStats = newStats;
        renderStatsKPIs(newStats);
        renderCharts(newStats);
        panelStatsEditor.classList.add('hidden');

        showToast('Indicateurs et courbes mis à jour avec succès !', 'check_circle');
      } catch (err) {
        console.error('Erreur sauvegarde stats:', err);
        showToast('Erreur lors de la mise à jour des statistiques.', 'error');
      }
    });
  }

  /* ========================================================================= */
  /* 9. GESTION DES DEMANDES DE PRise EN CHARGE (CONTACT_REQUESTS)             */
  /* ========================================================================= */

  async function loadContactRequests() {
    const tbody = document.getElementById('table-requests-body');
    const badgeCount = document.getElementById('badge-requests-count');

    try {
      const client = window.AkevaSupabase.client;
      const { data, error } = await client
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      allRequests = data || [];
      if (badgeCount) badgeCount.textContent = allRequests.length.toString();

      renderRequestsTable();
    } catch (err) {
      console.error('Erreur chargement contact_requests:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-red-500">Erreur de chargement des demandes.</td></tr>`;
      }
    }
  }

  function renderRequestsTable() {
    const tbody = document.getElementById('table-requests-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('search-requests')?.value || '').toLowerCase().trim();

    const filtered = allRequests.filter(req => {
      const matchesStatus = activeStatusFilter === 'all' || req.status === activeStatusFilter;
      const matchesSearch = !searchTerm ||
        (req.full_name && req.full_name.toLowerCase().includes(searchTerm)) ||
        (req.phone && req.phone.toLowerCase().includes(searchTerm)) ||
        (req.quartier && req.quartier.toLowerCase().includes(searchTerm)) ||
        (req.service && req.service.toLowerCase().includes(searchTerm));
      return matchesStatus && matchesSearch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-slate-400">
            <span class="material-symbols-outlined text-4xl block mb-2 text-slate-300">inbox</span>
            Aucune demande trouvée avec ces critères.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(req => {
      const dateStr = req.created_at ? new Date(req.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      }) : '—';

      const cleanPhone = (req.phone || '').replace(/[^0-9]/g, '');
      const waPhone = cleanPhone.startsWith('237') ? cleanPhone : `237${cleanPhone}`;
      const waText = encodeURIComponent(`Bonjour ${req.full_name || ''}, nous avons bien reçu votre demande d'accompagnement Akeva Sérénité pour "${req.service || 'Soins à domicile'}". Nos coordinateurs sont à votre écoute.`);

      return `
        <tr class="hover:bg-slate-50/70 transition-colors">
          <td class="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">${dateStr}</td>
          <td class="py-3 px-4 font-bold text-slate-800">
            ${escapeHtml(req.full_name || 'Anonyme')}
            ${req.email ? `<div class="text-[10px] text-slate-400 font-normal">${escapeHtml(req.email)}</div>` : ''}
          </td>
          <td class="py-3 px-4">
            <a href="tel:${req.phone}" class="font-semibold text-[#0d2040] hover:underline flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">call</span>
              <span>${escapeHtml(req.phone || '—')}</span>
            </a>
          </td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-1 rounded-md bg-slate-100 font-medium text-slate-700 text-[11px]">
              ${escapeHtml(req.service || 'Non spécifié')}
            </span>
          </td>
          <td class="py-3 px-4 max-w-xs">
            <div class="font-medium text-slate-700">${escapeHtml(req.quartier || 'Yaoundé')}</div>
            ${req.message ? `<div class="text-[10px] text-slate-400 truncate" title="${escapeHtml(req.message)}">${escapeHtml(req.message)}</div>` : ''}
          </td>
          <td class="py-3 px-4">
            <select class="select-request-status py-1 px-2 rounded-lg text-[11px] font-bold border ${getStatusBadgeClass(req.status)}"
              data-id="${req.id}">
              <option value="nouveau" ${req.status === 'nouveau' ? 'selected' : ''}>Nouvelle</option>
              <option value="en_cours" ${req.status === 'en_cours' ? 'selected' : ''}>En cours</option>
              <option value="confirme" ${req.status === 'confirme' ? 'selected' : ''}>Confirmée</option>
              <option value="termine" ${req.status === 'termine' ? 'selected' : ''}>Terminée</option>
            </select>
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <div class="inline-flex items-center gap-1">
              <a href="https://wa.me/${waPhone}?text=${waText}" target="_blank"
                class="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors" title="Contacter sur WhatsApp">
                <img src="/assets/whatsapp.svg" alt="WA" class="w-4 h-4"/>
              </a>
              <button class="btn-delete-request p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                data-id="${req.id}" title="Supprimer">
                <span class="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Événements changement de statut
    document.querySelectorAll('.select-request-status').forEach(select => {
      select.addEventListener('change', async function () {
        const reqId = this.getAttribute('data-id');
        const newStatus = this.value;
        await updateRequestStatus(reqId, newStatus);
      });
    });

    // Événements suppression
    document.querySelectorAll('.btn-delete-request').forEach(btn => {
      btn.addEventListener('click', async function () {
        const reqId = this.getAttribute('data-id');
        if (confirm('Confirmez-vous la suppression de cette demande ?')) {
          await deleteRequest(reqId);
        }
      });
    });
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'nouveau': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'en_cours': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'confirme': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'termine': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  async function updateRequestStatus(id, newStatus) {
    try {
      const client = window.AkevaSupabase.client;
      const { error } = await client
        .from('contact_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      const item = allRequests.find(r => r.id === id);
      if (item) item.status = newStatus;

      renderRequestsTable();
      showToast('Statut mis à jour.', 'check_circle');
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
      showToast('Erreur lors du changement de statut.', 'error');
    }
  }

  async function deleteRequest(id) {
    try {
      const client = window.AkevaSupabase.client;
      const { error } = await client
        .from('contact_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      allRequests = allRequests.filter(r => r.id !== id);
      renderRequestsTable();
      showToast('Demande supprimée.', 'delete');
    } catch (err) {
      console.error('Erreur suppression:', err);
      showToast('Impossible de supprimer la demande.', 'error');
    }
  }

  // Filtres statut demandes
  document.querySelectorAll('.filter-status-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-status-btn').forEach(b => {
        b.classList.remove('bg-[#0d2040]', 'text-white', 'font-bold');
        b.classList.add('bg-slate-100', 'text-slate-600', 'font-semibold');
      });
      this.classList.remove('bg-slate-100', 'text-slate-600', 'font-semibold');
      this.classList.add('bg-[#0d2040]', 'text-white', 'font-bold');

      activeStatusFilter = this.getAttribute('data-status');
      renderRequestsTable();
    });
  });

  // Recherche dans les demandes
  const searchInput = document.getElementById('search-requests');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderRequestsTable());
  }

  const btnRefreshRequests = document.getElementById('btn-refresh-requests');
  if (btnRefreshRequests) {
    btnRefreshRequests.addEventListener('click', () => {
      loadContactRequests();
      showToast('Demandes actualisées.', 'refresh');
    });
  }

  // Export CSV
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', function () {
      if (!allRequests.length) {
        showToast('Aucune donnée à exporter.', 'info');
        return;
      }
      const headers = ['ID', 'Date', 'Nom_Complet', 'Telephone', 'Email', 'Service', 'Quartier', 'Statut', 'Message'];
      const rows = allRequests.map(r => [
        `"${r.id}"`,
        `"${r.created_at || ''}"`,
        `"${(r.full_name || '').replace(/"/g, '""')}"`,
        `"${(r.phone || '').replace(/"/g, '""')}"`,
        `"${(r.email || '').replace(/"/g, '""')}"`,
        `"${(r.service || '').replace(/"/g, '""')}"`,
        `"${(r.quartier || '').replace(/"/g, '""')}"`,
        `"${r.status || ''}"`,
        `"${(r.message || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `akeva_demandes_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Fichier CSV téléchargé.', 'download');
    });
  }

  /* ========================================================================= */
  /* 10. MÉDIATHÈQUE & RÉALISATIONS (UPLOAD JUSQU'À 100 MO)                     */
  /* ========================================================================= */

  const btnToggleUpload = document.getElementById('btn-toggle-upload-panel');
  const panelUpload = document.getElementById('panel-upload-media');
  const btnCloseUpload = document.getElementById('btn-close-upload-panel');
  const btnCancelUpload = document.getElementById('btn-cancel-upload');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('media-file-input');
  const fileChosenInfo = document.getElementById('file-chosen-info');
  const formUpload = document.getElementById('form-upload-media');

  if (btnToggleUpload && panelUpload) {
    btnToggleUpload.addEventListener('click', () => panelUpload.classList.toggle('hidden'));
  }
  if (btnCloseUpload && panelUpload) {
    btnCloseUpload.addEventListener('click', () => panelUpload.classList.add('hidden'));
  }
  if (btnCancelUpload && panelUpload) {
    btnCancelUpload.addEventListener('click', () => panelUpload.classList.add('hidden'));
  }

  // Clic sur la drop zone
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        showSelectedFileInfo(this.files[0]);
      }
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('border-[#c5a059]', 'bg-amber-50/20');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-[#c5a059]', 'bg-amber-50/20');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files[0]) {
        fileInput.files = files;
        showSelectedFileInfo(files[0]);
      }
    });
  }

  function showSelectedFileInfo(file) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    fileChosenInfo.textContent = `Fichier sélectionné : ${file.name} (${sizeMb} Mo)`;
    fileChosenInfo.classList.remove('hidden');

    if (file.size > 104857600) {
      fileChosenInfo.innerHTML += `<span class="text-red-600 block">⚠️ Attention : le fichier dépasse la limite de 100 Mo.</span>`;
    }
  }

  // Téléversement média
  if (formUpload) {
    formUpload.addEventListener('submit', async function (e) {
      e.preventDefault();
      const uploadError = document.getElementById('upload-error');
      const progressContainer = document.getElementById('upload-progress-container');
      const progressBar = document.getElementById('upload-progress-bar');
      const progressPct = document.getElementById('upload-progress-pct');
      const btnSubmit = document.getElementById('btn-submit-media');

      uploadError.classList.add('hidden');

      const file = fileInput.files ? fileInput.files[0] : null;
      if (!file) {
        uploadError.textContent = 'Veuillez sélectionner un fichier (image, vidéo ou document).';
        uploadError.classList.remove('hidden');
        return;
      }

      // Limite 100 Mo
      if (file.size > 104857600) {
        uploadError.textContent = 'La taille du fichier dépasse la limite maximale autorisée de 100 Mo.';
        uploadError.classList.remove('hidden');
        return;
      }

      const title = document.getElementById('media-title').value.trim();
      const category = document.getElementById('media-category').value;
      const description = document.getElementById('media-description').value.trim();

      // Détection type
      let mediaType = 'image';
      if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.type.includes('word')) mediaType = 'document';

      btnSubmit.disabled = true;
      progressContainer.classList.remove('hidden');
      progressBar.style.width = '30%';
      progressPct.textContent = '30%';

      try {
        const client = window.AkevaSupabase.client;
        const fileExt = file.name.split('.').pop();
        const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `realisations/${safeName}`;

        progressBar.style.width = '60%';
        progressPct.textContent = '60%';

        // Upload dans le bucket 'akeva-media'
        const { data: uploadData, error: uploadErr } = await client.storage
          .from('akeva-media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadErr) throw uploadErr;

        progressBar.style.width = '85%';
        progressPct.textContent = '85%';

        // Récupération de l'URL publique
        const { data: urlData } = client.storage
          .from('akeva-media')
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Insertion dans la table `realisations`
        const { error: insertErr } = await client
          .from('realisations')
          .insert([
            {
              title: title,
              category: category,
              description: description,
              media_url: publicUrl,
              media_type: mediaType,
              file_size_bytes: file.size,
              published: true
            }
          ]);

        if (insertErr) throw insertErr;

        progressBar.style.width = '100%';
        progressPct.textContent = '100%';

        showToast('Média importé et réalisation publiée !', 'check_circle');

        // Reset formulaire
        formUpload.reset();
        fileChosenInfo.classList.add('hidden');
        progressContainer.classList.add('hidden');
        panelUpload.classList.add('hidden');
        btnSubmit.disabled = false;

        loadRealisations();
      } catch (err) {
        console.error('Erreur téléversement média:', err);
        uploadError.textContent = err.message || "Erreur lors du téléversement vers Supabase.";
        uploadError.classList.remove('hidden');
        progressContainer.classList.add('hidden');
        btnSubmit.disabled = false;
      }
    });
  }

  async function loadRealisations() {
    const grid = document.getElementById('realisations-grid');
    const countEl = document.getElementById('realisations-count');
    if (!grid) return;

    try {
      const client = window.AkevaSupabase.client;
      const { data, error } = await client
        .from('realisations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      allRealisations = data || [];
      if (countEl) countEl.textContent = `${allRealisations.length} média(s) en ligne`;

      if (allRealisations.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <span class="material-symbols-outlined text-4xl text-slate-300 block mb-2">collections</span>
            Aucune réalisation ajoutée pour le moment. Cliquez sur "Ajouter une Réalisation" pour importer vos médias.
          </div>
        `;
        return;
      }

      grid.innerHTML = allRealisations.map(item => {
        let mediaHtml = '';
        if (item.media_type === 'video') {
          mediaHtml = `
            <div class="aspect-video w-full bg-black rounded-2xl overflow-hidden relative">
              <video src="${escapeHtml(item.media_url)}" controls preload="metadata" class="w-full h-full object-cover"></video>
            </div>
          `;
        } else if (item.media_type === 'document') {
          mediaHtml = `
            <div class="aspect-video w-full bg-slate-100 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
              <span class="material-symbols-outlined text-4xl text-amber-700 mb-1">description</span>
              <span class="text-xs font-bold text-slate-700">Document PDF / Rapport</span>
              <a href="${escapeHtml(item.media_url)}" target="_blank" class="mt-2 text-[11px] text-[#0d2040] underline font-bold">Ouvrir le fichier</a>
            </div>
          `;
        } else {
          mediaHtml = `
            <div class="aspect-video w-full bg-slate-100 rounded-2xl overflow-hidden relative">
              <img src="${escapeHtml(item.media_url)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover"/>
            </div>
          `;
        }

        const sizeMb = item.file_size_bytes ? (item.file_size_bytes / (1024 * 1024)).toFixed(1) + ' Mo' : '';

        return `
          <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              ${mediaHtml}
              <div class="flex items-center justify-between mt-3 mb-1">
                <span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold uppercase tracking-wider">${escapeHtml(item.category || 'Général')}</span>
                ${sizeMb ? `<span class="text-[10px] text-slate-400 font-medium">${sizeMb}</span>` : ''}
              </div>
              <h4 class="font-bold text-slate-800 text-sm leading-snug">${escapeHtml(item.title)}</h4>
              ${item.description ? `<p class="text-xs text-slate-500 mt-1 line-clamp-2">${escapeHtml(item.description)}</p>` : ''}
            </div>
            <div class="border-t border-slate-100 pt-3 flex items-center justify-between">
              <label class="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600">
                <input type="checkbox" class="toggle-publish-realisation rounded border-slate-300 text-[#0d2040]"
                  data-id="${item.id}" ${item.published ? 'checked' : ''}/>
                <span>${item.published ? 'En ligne' : 'Masqué'}</span>
              </label>
              <button class="btn-delete-realisation p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                data-id="${item.id}" title="Supprimer">
                <span class="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Toggle publish
      document.querySelectorAll('.toggle-publish-realisation').forEach(chk => {
        chk.addEventListener('change', async function () {
          const id = this.getAttribute('data-id');
          const isPub = this.checked;
          const client = window.AkevaSupabase.client;
          await client.from('realisations').update({ published: isPub }).eq('id', id);
          showToast(isPub ? 'Réalisation mise en ligne.' : 'Réalisation masquée.', 'check_circle');
        });
      });

      // Delete realisation
      document.querySelectorAll('.btn-delete-realisation').forEach(btn => {
        btn.addEventListener('click', async function () {
          const id = this.getAttribute('data-id');
          if (confirm('Confirmez-vous la suppression de cette réalisation ?')) {
            const client = window.AkevaSupabase.client;
            await client.from('realisations').delete().eq('id', id);
            allRealisations = allRealisations.filter(r => r.id !== id);
            loadRealisations();
            showToast('Réalisation supprimée.', 'delete');
          }
        });
      });
    } catch (err) {
      console.error('Erreur chargement réalisations:', err);
    }
  }

  /* ========================================================================= */
  /* 11. PERSONNALISATION DES COORDONNÉES ET TEXTES DU SITE PUBLIC             */
  /* ========================================================================= */

  async function loadSiteSettings() {
    try {
      const client = window.AkevaSupabase.client;
      const { data, error } = await client
        .from('site_settings')
        .select('value')
        .eq('key', 'contact_info')
        .maybeSingle();

      if (error) throw error;

      currentSettings = data?.value || {
        phone_primary: "697 572 685",
        phone_secondary: "653 151 427",
        whatsapp: "237697572685",
        email: "contact@akevaserenite.cm",
        address: "Ngousso, Yaoundé, Cameroun (Proximité Hôpital Général)",
        hours: "24h/24 — 7j/7",
        banner_announcement: "Service disponible 24h/24 — 7j/7 à Yaoundé (Ngousso et environs)"
      };

      document.getElementById('setting-phone-1').value = currentSettings.phone_primary || '697 572 685';
      document.getElementById('setting-phone-2').value = currentSettings.phone_secondary || '653 151 427';
      document.getElementById('setting-whatsapp').value = currentSettings.whatsapp || '237697572685';
      document.getElementById('setting-address').value = currentSettings.address || 'Ngousso, Yaoundé, Cameroun';
      document.getElementById('setting-hours').value = currentSettings.hours || '24h/24 — 7j/7';
      document.getElementById('setting-banner').value = currentSettings.banner_announcement || 'Service disponible 24h/24 — 7j/7';
    } catch (err) {
      console.error('Erreur chargement site_settings:', err);
    }
  }

  const formSettings = document.getElementById('form-site-settings');
  if (formSettings) {
    formSettings.addEventListener('submit', async function (e) {
      e.preventDefault();
      const statusMsg = document.getElementById('settings-status-msg');

      const updated = {
        phone_primary: document.getElementById('setting-phone-1').value.trim(),
        phone_secondary: document.getElementById('setting-phone-2').value.trim(),
        whatsapp: document.getElementById('setting-whatsapp').value.trim(),
        address: document.getElementById('setting-address').value.trim(),
        hours: document.getElementById('setting-hours').value.trim(),
        banner_announcement: document.getElementById('setting-banner').value.trim()
      };

      try {
        const client = window.AkevaSupabase.client;
        const { error } = await client
          .from('site_settings')
          .upsert({
            key: 'contact_info',
            value: updated,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        currentSettings = updated;
        if (statusMsg) {
          statusMsg.classList.remove('hidden');
          setTimeout(() => statusMsg.classList.add('hidden'), 3000);
        }
        showToast('Coordonnées du site mises à jour !', 'check_circle');
      } catch (err) {
        console.error('Erreur mise à jour site_settings:', err);
        showToast('Erreur lors de la mise à jour des paramètres.', 'error');
      }
    });
  }

  /* ========================================================================= */
  /* 12. TOAST NOTIFICATIONS & HELPERS                                         */
  /* ========================================================================= */

  function showToast(message, iconName = 'check_circle') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-message');
    const icon = document.getElementById('toast-icon');
    if (!toast || !msg) return;

    msg.textContent = message;
    if (icon) icon.textContent = iconName;

    toast.classList.remove('translate-y-24', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-24', 'opacity-0');
    }, 3500);
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

  /* ========================================================================= */
  /* 13. DÉMARRAGE                                                             */
  /* ========================================================================= */

  document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initTabs();
    checkAdminAccountStatus();
  });

})();
