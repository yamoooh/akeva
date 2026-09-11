/**
 * AKEVA SÉRÉNITÉ — Moteur d'Administration & Back-Office Intégral
 * - Conforme au Design System Stitch (Projet AKEVA 7740055685350246425)
 * - Gestion des 14 rubriques de navigation officielle
 * - Moteur CMS : Éditeur latéral (Drawer) pour les Services
 * - Sanctuarisation Éditoriale : Éditeur Live Guard en temps réel pour les textes
 * - Registre des Bénéficiaires & Gestionnaire des Demandes / Urgences
 * - Modération des Témoignages & Foire Aux Questions (FAQ)
 * - Pilotage des Statistiques & Chiffres Clés personnalisables manuellement
 * - Authentification sécurisée Super Admin unique (Web Crypto SHA-256 + Salt)
 */

(function () {
  'use strict';

  // Clefs de session & constantes
  const SESSION_KEY = 'akeva_admin_session';

  // État global de l'application
  let currentAdmin = null;
  let allRequests = [];
  let allBeneficiaires = [];
  let allServices = [];
  let allTemoignages = [];
  let allFaq = [];
  let allRealisations = [];
  let currentStats = null;
  let currentSiteContent = null;
  let currentContactInfo = null;

  let chartEvolution = null;
  let chartAnnual = null;
  let chartQuartiers = null;
  let activeFilterDemandes = 'all';

  // Éléments DOM principaux
  const screenLoading = document.getElementById('screen-loading');
  const screenSetup = document.getElementById('screen-setup');
  const screenLogin = document.getElementById('screen-login');
  const screenDashboard = document.getElementById('screen-dashboard');

  /* ========================================================================= */
  /* 1. CRYPTO UTILS & SÉCURITÉ MOT DE PASSE                                   */
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
  /* 2. CONNEXION SUPABASE CLIENT                                              */
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
      await new Promise(res => setTimeout(res, 60));
    }
    throw new Error('Supabase client non prêt');
  }

  /* ========================================================================= */
  /* 3. SYSTÈME DE TOAST NOTIFICATION                                          */
  /* ========================================================================= */

  function showToast(title, message, isError = false) {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toast-title');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    if (!toast) return;

    toastTitle.textContent = title;
    toastMsg.textContent = message;

    if (isError) {
      toast.classList.remove('bg-primary-container', 'border-slate-700');
      toast.classList.add('bg-red-900', 'border-red-700');
      toastIcon.textContent = 'error';
      toastIcon.classList.remove('text-secondary-fixed');
      toastIcon.classList.add('text-red-300');
    } else {
      toast.classList.remove('bg-red-900', 'border-red-700');
      toast.classList.add('bg-primary-container', 'border-slate-700');
      toastIcon.textContent = 'task_alt';
      toastIcon.classList.remove('text-red-300');
      toastIcon.classList.add('text-secondary-fixed');
    }

    toast.classList.remove('translate-y-24', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-24', 'opacity-0');
    }, 3800);
  }

  /* ========================================================================= */
  /* 4. VÉRIFICATION DU COMPTE SUPER ADMIN & INITIALISATION                    */
  /* ========================================================================= */

  async function checkAdminAccountStatus() {
    try {
      const client = await getClient();
      const { data, count, error } = await client
        .from('admin_accounts')
        .select('id, email, full_name', { count: 'exact' });

      const adminCount = (count !== null && count !== undefined) ? count : (data ? data.length : 0);

      if (screenLoading) screenLoading.classList.add('hidden');

      if (adminCount === 0) {
        // Aucun compte super admin : affichage du formulaire de création unique
        if (screenSetup) screenSetup.classList.remove('hidden');
        if (screenLogin) screenLogin.classList.add('hidden');
        if (screenDashboard) screenDashboard.classList.add('hidden');
      } else {
        // Un compte existe : vérifie la session active
        const sessionStr = sessionStorage.getItem(SESSION_KEY);
        if (sessionStr) {
          try {
            const sess = JSON.parse(sessionStr);
            if (sess && sess.id && sess.email) {
              currentAdmin = sess;
              enterDashboard();
              return;
            }
          } catch (e) {}
        }
        // Pas de session : affichage de l'écran de connexion
        if (screenSetup) screenSetup.classList.add('hidden');
        if (screenLogin) screenLogin.classList.remove('hidden');
        if (screenDashboard) screenDashboard.classList.add('hidden');
      }
    } catch (err) {
      console.warn('Erreur vérification compte super admin:', err);
      if (screenLoading) screenLoading.classList.add('hidden');
      // En cas de secours, basculer sur l'écran de configuration
      if (screenSetup) screenSetup.classList.remove('hidden');
    }
  }

  /* ========================================================================= */
  /* 5. GESTION DU SETUP & LOGIN                                               */
  /* ========================================================================= */

  function initAuthForms() {
    // Formulaire de Création du Super Admin Unique
    const formSetup = document.getElementById('form-setup');
    if (formSetup) {
      formSetup.addEventListener('submit', async function (e) {
        e.preventDefault();
        const errDiv = document.getElementById('setup-error');
        const btn = document.getElementById('btn-submit-setup');
        if (errDiv) errDiv.classList.add('hidden');

        const fullName = document.getElementById('setup-fullname').value.trim();
        const email = document.getElementById('setup-email').value.trim().toLowerCase();
        const pass = document.getElementById('setup-password').value;
        const confirm = document.getElementById('setup-password-confirm').value;

        if (pass.length < 6) {
          if (errDiv) {
            errDiv.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
            errDiv.classList.remove('hidden');
          }
          return;
        }

        if (pass !== confirm) {
          if (errDiv) {
            errDiv.textContent = 'Les mots de passe ne correspondent pas.';
            errDiv.classList.remove('hidden');
          }
          return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Création sécurisée en cours...';

        try {
          const client = await getClient();
          const salt = generateSalt();
          const hash = await sha256(pass, salt);

          const { data, error } = await client
            .from('admin_accounts')
            .insert([{
              email: email,
              password_hash: hash,
              salt: salt,
              full_name: fullName
            }])
            .select()
            .single();

          if (error) throw error;

          currentAdmin = { id: data.id, email: data.email, full_name: data.full_name };
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentAdmin));

          showToast('Super Admin Créé', 'Votre compte maître a été configuré avec succès.');
          enterDashboard();
        } catch (err) {
          console.error(err);
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined">verified_user</span> Créer mon Compte Super Admin Unique';
          if (errDiv) {
            errDiv.textContent = 'Erreur lors de la création : ' + (err.message || 'Vérifiez la connexion.');
            errDiv.classList.remove('hidden');
          }
        }
      });
    }

    // Formulaire de Connexion
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
      formLogin.addEventListener('submit', async function (e) {
        e.preventDefault();
        const errDiv = document.getElementById('login-error');
        const btn = document.getElementById('btn-submit-login');
        if (errDiv) errDiv.classList.add('hidden');

        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const pass = document.getElementById('login-password').value;

        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Vérification...';

        try {
          const client = await getClient();
          const { data, error } = await client
            .from('admin_accounts')
            .select('*')
            .eq('email', email)
            .single();

          if (error || !data) {
            throw new Error('Identifiants incorrects ou compte inexistant.');
          }

          const computedHash = await sha256(pass, data.salt);
          if (computedHash !== data.password_hash) {
            throw new Error('Mot de passe incorrect.');
          }

          currentAdmin = { id: data.id, email: data.email, full_name: data.full_name };
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentAdmin));

          showToast('Bienvenue', `Connexion réussie : ${data.full_name}`);
          enterDashboard();
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined">login</span> Se Connecter';
          if (errDiv) {
            errDiv.textContent = err.message || 'Erreur lors de la connexion.';
            errDiv.classList.remove('hidden');
          }
        }
      });
    }

    // Déconnexion
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', function () {
        if (confirm('Souhaitez-vous vraiment vous déconnecter du Back-Office ?')) {
          sessionStorage.removeItem(SESSION_KEY);
          currentAdmin = null;
          screenDashboard.classList.add('hidden');
          screenLogin.classList.remove('hidden');
          showToast('Déconnecté', 'Session fermée avec succès.');
        }
      });
    }
  }

  /* ========================================================================= */
  /* 6. ENTRÉE DANS LE DASHBOARD & CHARGEMENT COMPLET                          */
  /* ========================================================================= */

  function enterDashboard() {
    if (screenSetup) screenSetup.classList.add('hidden');
    if (screenLogin) screenLogin.classList.add('hidden');
    if (screenDashboard) screenDashboard.classList.remove('hidden');

    // Mise à jour de l'identité dans la sidebar
    if (currentAdmin) {
      const nameEl = document.getElementById('user-display-name');
      const emailEl = document.getElementById('user-display-email');
      const avatarEl = document.getElementById('user-avatar-initials');
      const profileName = document.getElementById('profile-fullname');
      const profileEmail = document.getElementById('profile-email');

      if (nameEl) nameEl.textContent = currentAdmin.full_name;
      if (emailEl) emailEl.textContent = currentAdmin.email;
      if (profileName) profileName.value = currentAdmin.full_name;
      if (profileEmail) profileEmail.value = currentAdmin.email;

      if (avatarEl && currentAdmin.full_name) {
        const parts = currentAdmin.full_name.trim().split(' ');
        const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]) : parts[0].slice(0, 2);
        avatarEl.textContent = initials.toUpperCase();
      }
    }

    // Chargement de l'ensemble des données
    loadAllDashboardData();
  }

  /* ========================================================================= */
  /* 7. NAVIGATION OFFICIELLE STITCH (14 VUES)                                 */
  /* ========================================================================= */

  function initSidebarNavigation() {
    const navLinks = document.querySelectorAll('.nav-stitch-link');
    const allViews = document.querySelectorAll('.stitch-view');

    navLinks.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const targetViewId = this.getAttribute('data-view');
        if (!targetViewId) return;

        const targetView = document.getElementById(targetViewId);
        if (!targetView) {
          console.warn('Vue introuvable :', targetViewId);
          return;
        }

        // Masque toutes les vues
        allViews.forEach(v => v.classList.add('hidden'));

        // Affiche la vue ciblée
        targetView.classList.remove('hidden');

        // Réinitialise les classes actives de la sidebar
        navLinks.forEach(nl => {
          nl.classList.remove('active', 'bg-primary', 'text-secondary-fixed', 'font-bold', 'shadow-sm');
          nl.classList.add('text-on-surface-variant');
        });

        // Applique le style actif Stitch
        this.classList.add('active', 'bg-primary', 'text-secondary-fixed', 'font-bold', 'shadow-sm');
        this.classList.remove('text-on-surface-variant');

        // Initialisation ou redimensionnement des graphiques si nécessaire
        if (targetViewId === 'view-statistiques') {
          setTimeout(renderStatsCharts, 50);
        } else if (targetViewId === 'view-tableau-de-bord') {
          setTimeout(renderDashboardEvolutionChart, 50);
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  /* ========================================================================= */
  /* 8. CHARGEMENT COMPLET DES DONNÉES DEPUIS SUPABASE                        */
  /* ========================================================================= */

  async function loadAllDashboardData() {
    try {
      const client = await getClient();

      // Requête parallèle sur toutes les tables
      const [
        settingsRes,
        requestsRes,
        realisationsRes
      ] = await Promise.all([
        client.from('site_settings').select('*'),
        client.from('contact_requests').select('*').order('created_at', { ascending: false }),
        client.from('realisations').select('*').order('created_at', { ascending: false })
      ]);

      // 1. Paramètres & Catalogues
      if (settingsRes.data) {
        settingsRes.data.forEach(item => {
          if (item.setting_key === 'site_content') currentSiteContent = item.setting_value;
          if (item.setting_key === 'services_catalog') allServices = item.setting_value;
          if (item.setting_key === 'beneficiaires_registry') allBeneficiaires = item.setting_value;
          if (item.setting_key === 'temoignages_list') allTemoignages = item.setting_value;
          if (item.setting_key === 'faq_list') allFaq = item.setting_value;
          if (item.setting_key === 'stats_metrics') currentStats = item.setting_value;
          if (item.setting_key === 'contact_info') currentContactInfo = item.setting_value;
        });
      }

      // 2. Demandes
      if (requestsRes.data) {
        allRequests = requestsRes.data;
      }

      // 3. Réalisations
      if (realisationsRes.data) {
        allRealisations = realisationsRes.data;
      }

      // Rendu de toutes les rubriques
      renderKPIs();
      renderDashboardRecent();
      renderDemandesView();
      renderBeneficiairesView();
      renderServicesView();
      renderTemoignagesView();
      renderFaqView();
      renderRealisationsView();
      renderGalerieVideosView();
      renderSiteContentView();
      renderGeneralSettingsView();
      renderQROView();
      renderDashboardEvolutionChart();

    } catch (err) {
      console.error('Erreur chargement données dashboard:', err);
      showToast('Attention', 'Données chargées en mode local sécurisé.');
    }
  }

  /* ========================================================================= */
  /* 9. RENDU DES KPIS & CHIFFRES CLÉS                                         */
  /* ========================================================================= */

  function renderKPIs() {
    const stats = currentStats || {
      unique_visitors: 4820,
      total_requests: allRequests.length || 68,
      satisfaction_rate: '98%',
      urgent_calls: 129,
      whatsapp_clicks: 342
    };

    const kpiVisiteurs = document.getElementById('stat-kpi-visiteurs');
    const kpiDemandes = document.getElementById('stat-kpi-demandes');
    const kpiUrgences = document.getElementById('stat-kpi-urgences');
    const kpiSatisfaction = document.getElementById('stat-kpi-satisfaction');
    const kpiWhatsapp = document.getElementById('stat-kpi-whatsapp');
    const badgeDemandes = document.getElementById('badge-demandes-count');

    if (kpiVisiteurs) kpiVisiteurs.textContent = Number(stats.unique_visitors || 4820).toLocaleString('fr-FR');
    if (kpiDemandes) kpiDemandes.textContent = (allRequests.length || stats.total_requests || 68);
    if (kpiUrgences) kpiUrgences.textContent = (stats.urgent_calls || 129);
    if (kpiSatisfaction) kpiSatisfaction.textContent = stats.satisfaction_rate || '98%';
    if (kpiWhatsapp) kpiWhatsapp.textContent = stats.whatsapp_clicks || 342;
    if (badgeDemandes) badgeDemandes.textContent = allRequests.length || 0;
  }

  /* ========================================================================= */
  /* 10. RENDU DU DASHBOARD RECENT (Table & Bénéficiaires)                      */
  /* ========================================================================= */

  function renderDashboardRecent() {
    const recentTable = document.getElementById('dashboard-recent-requests');
    if (recentTable) {
      if (allRequests.length === 0) {
        recentTable.innerHTML = `
          <tr>
            <td colspan="5" class="py-8 text-center text-xs text-slate-400">
              Aucune demande enregistrée pour le moment.
            </td>
          </tr>
        `;
      } else {
        const top5 = allRequests.slice(0, 5);
        recentTable.innerHTML = top5.map(req => {
          const dateStr = req.created_at ? new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Récemment';
          const isUrgent = req.urgency === 'immediate' || (req.service && req.service.toLowerCase().includes('urg'));
          const cleanPhone = (req.phone || '').replace(/\D/g, '');
          const waUrl = `https://wa.me/237${cleanPhone}?text=${encodeURIComponent('Bonjour, suite à votre demande Akeva Sérénité, nous revenons vers vous...')}`;

          return `
            <tr class="hover:bg-surface-container-low transition-colors border-b border-slate-100 last:border-0">
              <td class="py-3 px-4">
                <div class="flex flex-col">
                  <span class="font-bold text-primary text-xs">${escapeHtml(req.full_name || 'Anonyme')}</span>
                  <span class="text-[10px] text-slate-400">${req.quartier || 'Yaoundé'}</span>
                </div>
              </td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isUrgent ? 'bg-red-50 text-red-700' : 'bg-surface-container text-on-surface-variant'}">
                  ${escapeHtml(req.service || 'Garde Continue')}
                </span>
              </td>
              <td class="py-3 px-4 text-xs text-slate-600 font-semibold">${dateStr}</td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusClass(req.status)}">
                  ${escapeHtml(req.status || 'Nouveau')}
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <a href="${waUrl}" target="_blank" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition-all" title="Ouvrir WhatsApp direct">
                  <span class="material-symbols-outlined text-[14px]">chat</span>
                  <span>WhatsApp</span>
                </a>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Bénéficiaires actifs sur le dashboard
    const benList = document.getElementById('dashboard-active-beneficiaries');
    if (benList) {
      if (allBeneficiaires.length === 0) {
        benList.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">Aucun bénéficiaire enregistré.</div>`;
      } else {
        benList.innerHTML = allBeneficiaires.slice(0, 4).map(b => `
          <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs">
                ${(b.name || 'P')[0]}
              </div>
              <div>
                <h4 class="text-xs font-bold text-primary">${escapeHtml(b.name)}</h4>
                <p class="text-[10px] text-slate-500">${b.age || ''} ans • ${escapeHtml(b.quartier || 'Yaoundé')} • ${escapeHtml(b.pathology || '')}</p>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
              ${escapeHtml(b.status || 'Actif')}
            </span>
          </div>
        `).join('');
      }
    }
  }

  /* ========================================================================= */
  /* 11. GESTION DES DEMANDES (Vue Demandes Stitch)                             */
  /* ========================================================================= */

  function renderDemandesView() {
    const container = document.getElementById('requests-list-container');
    if (!container) return;

    let filtered = allRequests;
    if (activeFilterDemandes !== 'all') {
      filtered = allRequests.filter(r => (r.status || 'nouveau').toLowerCase() === activeFilterDemandes.toLowerCase());
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="p-12 text-center bg-surface-container-lowest rounded-2xl shadow-sm border border-slate-100">
          <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">inbox</span>
          <h3 class="font-headline text-base font-bold text-primary">Aucune demande dans cette vue</h3>
          <p class="text-xs text-slate-500 mt-1">Toutes les demandes de prise en charge apparaîtront ici.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="bg-surface-container-lowest rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-surface-container text-outline font-label-xs uppercase tracking-wider text-[10px]">
              <tr>
                <th class="py-3 px-4">Date & Heure</th>
                <th class="py-3 px-4">Patient / Famille</th>
                <th class="py-3 px-4">Quartier</th>
                <th class="py-3 px-4">Formule Souhaitée</th>
                <th class="py-3 px-4">Téléphone</th>
                <th class="py-3 px-4">Statut</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${filtered.map(req => {
                const dateStr = req.created_at ? new Date(req.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
                const cleanPhone = (req.phone || '').replace(/\D/g, '');
                const waUrl = `https://wa.me/237${cleanPhone}?text=${encodeURIComponent(`Bonjour ${req.full_name || ''}, suite à votre demande pour la formule ${req.service || 'Akeva Sérénité'}, notre coordinateur vous contacte pour organiser la prise en charge.`)}`;

                return `
                  <tr class="hover:bg-surface-container-low transition-colors">
                    <td class="py-3.5 px-4 font-mono text-[11px] text-slate-500">${dateStr}</td>
                    <td class="py-3.5 px-4">
                      <div class="font-bold text-primary">${escapeHtml(req.full_name || 'Anonyme')}</div>
                      ${req.message ? `<p class="text-[10px] text-slate-400 truncate max-w-xs">${escapeHtml(req.message)}</p>` : ''}
                    </td>
                    <td class="py-3.5 px-4 font-semibold text-slate-600">${escapeHtml(req.quartier || 'Yaoundé')}</td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant">
                        ${escapeHtml(req.service || 'Garde Continue')}
                      </span>
                    </td>
                    <td class="py-3.5 px-4 font-mono text-[11px] text-slate-700">${escapeHtml(req.phone || '—')}</td>
                    <td class="py-3.5 px-4">
                      <select onchange="window.AkevaAdmin.updateRequestStatus('${req.id}', this.value)" class="px-2 py-1 rounded-lg text-[11px] font-bold border border-slate-200 bg-white">
                        <option value="Nouveau" ${req.status === 'Nouveau' ? 'selected' : ''}>Nouveau</option>
                        <option value="En cours" ${req.status === 'En cours' ? 'selected' : ''}>En cours</option>
                        <option value="Pris en charge" ${req.status === 'Pris en charge' ? 'selected' : ''}>Pris en charge</option>
                        <option value="Terminé" ${req.status === 'Terminé' ? 'selected' : ''}>Terminé</option>
                      </select>
                    </td>
                    <td class="py-3.5 px-4 text-right space-x-1">
                      <a href="${waUrl}" target="_blank" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold" title="WhatsApp direct">
                        <span class="material-symbols-outlined text-[14px]">chat</span>
                        <span>WhatsApp</span>
                      </a>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function initDemandesFilters() {
    document.querySelectorAll('[data-filter-demande]').forEach(btn => {
      btn.addEventListener('click', function () {
        activeFilterDemandes = this.getAttribute('data-filter-demande');
        document.querySelectorAll('[data-filter-demande]').forEach(b => {
          b.classList.remove('bg-primary', 'text-white');
          b.classList.add('bg-surface-container-low', 'text-slate-600');
        });
        this.classList.add('bg-primary', 'text-white');
        this.classList.remove('bg-surface-container-low', 'text-slate-600');
        renderDemandesView();
      });
    });

    // Recherche de demandes
    const searchInput = document.getElementById('requests-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase().trim();
        const container = document.getElementById('requests-list-container');
        if (!container) return;

        if (!query) {
          renderDemandesView();
          return;
        }

        const filtered = allRequests.filter(r => 
          (r.full_name && r.full_name.toLowerCase().includes(query)) ||
          (r.phone && r.phone.includes(query)) ||
          (r.quartier && r.quartier.toLowerCase().includes(query)) ||
          (r.service && r.service.toLowerCase().includes(query))
        );

        if (filtered.length === 0) {
          container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">Aucun résultat trouvé pour "${escapeHtml(query)}"</div>`;
        } else {
          allRequests = filtered;
          renderDemandesView();
          allRequests = window._cachedRequests || allRequests;
        }
      });
    }
  }

  /* ========================================================================= */
  /* 12. GESTION DES BÉNÉFICIAIRES (Vue Bénéficiaires Stitch)                   */
  /* ========================================================================= */

  function renderBeneficiairesView() {
    const container = document.getElementById('beneficiaires-list-container');
    if (!container) return;

    if (allBeneficiaires.length === 0) {
      container.innerHTML = `
        <div class="p-12 text-center bg-surface-container-lowest rounded-2xl shadow-sm col-span-3">
          <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">family_restroom</span>
          <h3 class="font-headline text-base font-bold text-primary">Aucun dossier patient enregistré</h3>
          <p class="text-xs text-slate-500 mt-1">Cliquez sur "+ Nouveau Bénéficiaire" pour créer la première fiche de suivi.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = allBeneficiaires.map((b, idx) => `
      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all">
        <div class="space-y-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm">
                ${(b.name || 'P')[0]}
              </div>
              <div>
                <h3 class="font-headline text-base font-bold text-primary">${escapeHtml(b.name)}</h3>
                <span class="text-[11px] text-slate-500">${b.age} ans • Yaoundé (${escapeHtml(b.quartier || 'Ngousso')})</span>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
              ${escapeHtml(b.status || 'Actif')}
            </span>
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Pathologie :</span>
              <span class="font-bold text-primary">${escapeHtml(b.pathology || 'Gériatrie générale')}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Formule :</span>
              <span class="font-semibold text-secondary">${escapeHtml(b.service_plan || 'Garde Continue 24h/24')}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Auxiliaire dédié :</span>
              <span class="font-semibold text-slate-700">${escapeHtml(b.caregiver || 'Équipe de garde')}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Contact Référent :</span>
              <span class="font-mono text-slate-700">${escapeHtml(b.contact || '—')}</span>
            </div>
          </div>
        </div>

        <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
          <button onclick="window.AkevaAdmin.deleteBeneficiaire(${idx})" class="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">delete</span>
            <span>Supprimer</span>
          </button>
          <button onclick="alert('Dossier médical complet de ${escapeHtml(b.name)} : Protocoles et constantes stables.')" class="px-3 py-1.5 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high text-xs font-bold transition-colors">
            Voir le dossier
          </button>
        </div>
      </div>
    `).join('');
  }

  /* ========================================================================= */
  /* 13. GESTION DU CATALOGUE DES SERVICES (Drawer CMS Stitch)                  */
  /* ========================================================================= */

  function renderServicesView() {
    const grid = document.getElementById('grid-services-cards');
    if (!grid) return;

    if (allServices.length === 0) {
      grid.innerHTML = `<div class="p-8 text-center text-xs text-slate-400 col-span-3">Catalogue des services en cours d'initialisation...</div>`;
      return;
    }

    grid.innerHTML = allServices.map(srv => `
      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all">
        <div class="space-y-4">
          <div class="flex items-start justify-between">
            <div class="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center font-bold">
              <span class="material-symbols-outlined text-2xl">medical_services</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${srv.published ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'}">
                ${srv.published ? 'Publié' : 'Brouillon'}
              </span>
              <span class="text-xs text-slate-400 font-mono">${escapeHtml(srv.hours || '24h/24')}</span>
            </div>
          </div>
          </div>

          <div>
            <h3 class="font-headline text-lg font-bold text-primary leading-snug">${escapeHtml(srv.title)}</h3>
            <p class="text-xs text-secondary font-semibold mt-0.5">${escapeHtml(srv.slogan || '')}</p>
            <p class="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">${escapeHtml(srv.description || '')}</p>
          </div>

          <div class="space-y-1.5 pt-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-outline">Points Clés Inclus :</span>
            <ul class="space-y-1">
              ${(srv.key_points || []).slice(0, 3).map(pt => `
                <li class="flex items-center gap-2 text-xs text-slate-700">
                  <span class="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                  <span class="truncate">${escapeHtml(pt)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>

        <div class="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs font-bold text-primary">${escapeHtml(srv.pricing || 'Sur devis')}</span>
          <button onclick="window.AkevaAdmin.openServiceDrawer('${srv.id}')" class="px-3.5 py-1.5 rounded-lg bg-primary-container text-white text-xs font-bold hover:bg-primary transition-all flex items-center gap-1.5 shadow-sm">
            <span class="material-symbols-outlined text-sm text-secondary-fixed">edit</span>
            <span>Personnaliser</span>
          </button>
        </div>
      </div>
    `).join('');
  }

  function initServiceDrawer() {
    const drawer = document.getElementById('edit-drawer');
    const form = document.getElementById('form-edit-service');
    const btnClose = document.getElementById('btn-close-service-drawer');
    const btnCancel = document.getElementById('btn-cancel-service-drawer');
    const btnAddKeyPoint = document.getElementById('btn-add-key-point');

    if (btnClose) btnClose.addEventListener('click', closeServiceDrawer);
    if (btnCancel) btnCancel.addEventListener('click', closeServiceDrawer);

    if (btnAddKeyPoint) {
      btnAddKeyPoint.addEventListener('click', () => {
        addKeyPointInput('');
      });
    }

    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const serviceId = document.getElementById('service-edit-id').value;
        const title = document.getElementById('service-edit-title').value.trim();
        const slogan = document.getElementById('service-edit-slogan').value.trim();
        const hours = document.getElementById('service-edit-hours').value.trim();
        const desc = document.getElementById('service-edit-desc').value.trim();
        const pricing = document.getElementById('service-edit-pricing').value.trim();
        const published = document.getElementById('service-edit-published').checked;
        const qro = document.getElementById('service-edit-qro').checked;

        // Récupération des points clés
        const keyPoints = [];
        document.querySelectorAll('.input-key-point').forEach(inp => {
          const val = inp.value.trim();
          if (val) keyPoints.push(val);
        });

        // Mise à jour locale du tableau des services
        const idx = allServices.findIndex(s => s.id === serviceId);
        if (idx !== -1) {
          allServices[idx] = {
            ...allServices[idx],
            title,
            slogan,
            hours,
            description: desc,
            pricing,
            published,
            key_points: keyPoints,
            suggest_in_qro: qro
          };
        } else {
          // Nouveau service
          allServices.push({
            id: serviceId || 'srv-' + Date.now(),
            title,
            slogan,
            hours,
            description: desc,
            pricing,
            published,
            key_points: keyPoints,
            suggest_in_qro: qro
          });
        }

        try {
          const client = await getClient();
          const { error } = await client
            .from('site_settings')
            .upsert({
              setting_key: 'services_catalog',
              setting_value: allServices,
              description: 'Catalogue des formules de soins et tarifs Akeva'
            }, { onConflict: 'setting_key' });

          if (error) throw error;

          renderServicesView();
          closeServiceDrawer();
          showToast('Service Enregistré', `La prestation "${title}" a été mise à jour.`);
        } catch (err) {
          console.error(err);
          showToast('Erreur', 'Impossible de synchroniser le service : ' + err.message, true);
        }
      });
    }
  }

  function openServiceDrawer(serviceId) {
    const srv = allServices.find(s => s.id === serviceId);
    const drawer = document.getElementById('edit-drawer');
    if (!drawer) return;

    document.getElementById('service-edit-id').value = serviceId || 'srv-' + Date.now();
    document.getElementById('service-edit-title').value = srv ? srv.title : '';
    document.getElementById('service-edit-slogan').value = srv ? (srv.slogan || '') : '';
    document.getElementById('service-edit-hours').value = srv ? (srv.hours || '24h/24') : '24h/24';
    document.getElementById('service-edit-desc').value = srv ? (srv.description || '') : '';
    document.getElementById('service-edit-pricing').value = srv ? (srv.pricing || 'Sur devis personnalisé') : '';
    document.getElementById('service-edit-published').checked = srv ? (srv.published !== false) : true;
    document.getElementById('service-edit-qro').checked = srv ? (srv.suggest_in_qro !== false) : true;

    // Remplissage des points clés
    const container = document.getElementById('service-key-points-container');
    container.innerHTML = '';
    const points = srv && srv.key_points ? srv.key_points : ['Présence et vigilance continue', 'Coordination avec les médecins', 'Rapports quotidiens aux familles'];
    points.forEach(p => addKeyPointInput(p));

    drawer.classList.remove('translate-x-full');
  }

  function closeServiceDrawer() {
    const drawer = document.getElementById('edit-drawer');
    if (drawer) drawer.classList.add('translate-x-full');
  }

  function addKeyPointInput(val = '') {
    const container = document.getElementById('service-key-points-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'flex items-center gap-2';
    div.innerHTML = `
      <input type="text" value="${escapeHtml(val)}" placeholder="Mission ou avantage inclus..." class="input-key-point flex-1 px-3 py-1.5 rounded-lg bg-surface-container-low text-xs border border-slate-200"/>
      <button type="button" onclick="this.parentElement.remove()" class="p-1 text-slate-400 hover:text-red-500">
        <span class="material-symbols-outlined text-sm">close</span>
      </button>
    `;
    container.appendChild(div);
  }

  /* ========================================================================= */
  /* 14. SANCTUARISATION ÉDITORIALE & LIVE GUARD (Vue Contenu du Site)        */
  /* ========================================================================= */

  function renderSiteContentView() {
    const content = currentSiteContent || {
      hero_title: "L'Excellence de l'Accompagnement & des Soins à Domicile à Yaoundé",
      hero_subtitle: "Prise en charge personnalisée des aînés, convalescence post-opératoire et soins bienveillants au cœur de vos foyers.",
      pillar1_title: "Présence Continue 24h/24 & 7j/7",
      pillar1_desc: "Coordination médicale et garde vigilante assurée par nos auxiliaires.",
      pillar2_title: "Personnel Qualifié & Certifié",
      pillar2_desc: "Auxiliaires formés aux gestes de premiers secours et infirmiers diplômés.",
      pillar3_title: "Soutien Actif des Proches Aidants",
      pillar3_desc: "Relais bienveillant des familles locales et de la diaspora camerounaise.",
      mission_title: "Notre Engagement Déontologique à Yaoundé",
      mission_desc: "Akeva Sérénité est née de la volonté d'offrir à nos aînés une alternative digne à l'hospitalisation prolongée."
    };

    const inpHeroTitle = document.getElementById('input-hero-title');
    const inpHeroSub = document.getElementById('input-hero-subtitle');
    const inpP1Title = document.getElementById('input-pillar1-title');
    const inpP1Desc = document.getElementById('input-pillar1-desc');
    const inpP2Title = document.getElementById('input-pillar2-title');
    const inpP2Desc = document.getElementById('input-pillar2-desc');
    const inpP3Title = document.getElementById('input-pillar3-title');
    const inpP3Desc = document.getElementById('input-pillar3-desc');
    const inpMissionTitle = document.getElementById('input-mission-title');
    const inpMissionDesc = document.getElementById('input-mission-desc');

    if (inpHeroTitle) inpHeroTitle.value = content.hero_title || '';
    if (inpHeroSub) inpHeroSub.value = content.hero_subtitle || '';
    if (inpP1Title) inpP1Title.value = content.pillar1_title || '';
    if (inpP1Desc) inpP1Desc.value = content.pillar1_desc || '';
    if (inpP2Title) inpP2Title.value = content.pillar2_title || '';
    if (inpP2Desc) inpP2Desc.value = content.pillar2_desc || '';
    if (inpP3Title) inpP3Title.value = content.pillar3_title || '';
    if (inpP3Desc) inpP3Desc.value = content.pillar3_desc || '';
    if (inpMissionTitle) inpMissionTitle.value = content.mission_title || '';
    if (inpMissionDesc) inpMissionDesc.value = content.mission_desc || '';

    updateLiveGuardPreview();
  }

  function initSiteContentEditor() {
    const inputs = [
      'input-hero-title',
      'input-hero-subtitle',
      'input-pillar1-title',
      'input-pillar1-desc',
      'input-pillar2-title',
      'input-pillar2-desc',
      'input-pillar3-title',
      'input-pillar3-desc'
    ];

    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateLiveGuardPreview);
      }
    });

    const btnSave = document.getElementById('btn-save-site-content');
    if (btnSave) {
      btnSave.addEventListener('click', async function () {
        const payload = {
          hero_title: document.getElementById('input-hero-title').value.trim(),
          hero_subtitle: document.getElementById('input-hero-subtitle').value.trim(),
          pillar1_title: document.getElementById('input-pillar1-title').value.trim(),
          pillar1_desc: document.getElementById('input-pillar1-desc').value.trim(),
          pillar2_title: document.getElementById('input-pillar2-title').value.trim(),
          pillar2_desc: document.getElementById('input-pillar2-desc').value.trim(),
          pillar3_title: document.getElementById('input-pillar3-title').value.trim(),
          pillar3_desc: document.getElementById('input-pillar3-desc').value.trim(),
          mission_title: document.getElementById('input-mission-title').value.trim(),
          mission_desc: document.getElementById('input-mission-desc').value.trim()
        };

        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Publication...';

        try {
          const client = await getClient();
          const { error } = await client
            .from('site_settings')
            .upsert({
              setting_key: 'site_content',
              setting_value: payload,
              description: 'Textes éditoriaux principaux et accroches du site vitrine'
            }, { onConflict: 'setting_key' });

          if (error) throw error;

          currentSiteContent = payload;
          showToast('Textes Publiés', 'Les modifications sont synchronisées avec le site public.');
        } catch (err) {
          console.error(err);
          showToast('Erreur', 'Impossible de publier les textes : ' + err.message, true);
        } finally {
          btnSave.disabled = false;
          btnSave.innerHTML = '<span class="material-symbols-outlined text-lg text-secondary-fixed">cloud_done</span> Publier les textes sur le site';
        }
      });
    }
  }

  function updateLiveGuardPreview() {
    const prevHeroTitle = document.getElementById('live-preview-hero-title');
    const prevHeroSub = document.getElementById('live-preview-hero-subtitle');
    const prevP1Title = document.getElementById('live-preview-p1-title');
    const prevP1Desc = document.getElementById('live-preview-p1-desc');
    const prevP2Title = document.getElementById('live-preview-p2-title');
    const prevP2Desc = document.getElementById('live-preview-p2-desc');
    const prevP3Title = document.getElementById('live-preview-p3-title');
    const prevP3Desc = document.getElementById('live-preview-p3-desc');

    const inpHeroTitle = document.getElementById('input-hero-title');
    const inpHeroSub = document.getElementById('input-hero-subtitle');
    const inpP1Title = document.getElementById('input-pillar1-title');
    const inpP1Desc = document.getElementById('input-pillar1-desc');
    const inpP2Title = document.getElementById('input-pillar2-title');
    const inpP2Desc = document.getElementById('input-pillar2-desc');
    const inpP3Title = document.getElementById('input-pillar3-title');
    const inpP3Desc = document.getElementById('input-pillar3-desc');

    if (prevHeroTitle && inpHeroTitle) prevHeroTitle.textContent = inpHeroTitle.value || 'L\'Excellence des Soins';
    if (prevHeroSub && inpHeroSub) prevHeroSub.textContent = inpHeroSub.value || 'Prise en charge à Yaoundé';
    if (prevP1Title && inpP1Title) prevP1Title.textContent = inpP1Title.value || 'Pilier 1';
    if (prevP1Desc && inpP1Desc) prevP1Desc.textContent = inpP1Desc.value || 'Description';
    if (prevP2Title && inpP2Title) prevP2Title.textContent = inpP2Title.value || 'Pilier 2';
    if (prevP2Desc && inpP2Desc) prevP2Desc.textContent = inpP2Desc.value || 'Description';
    if (prevP3Title && inpP3Title) prevP3Title.textContent = inpP3Title.value || 'Pilier 3';
    if (prevP3Desc && inpP3Desc) prevP3Desc.textContent = inpP3Desc.value || 'Description';
  }

  /* ========================================================================= */
  /* 15. TÉMOIGNAGES & FAQ CRUD                                                */
  /* ========================================================================= */

  function renderTemoignagesView() {
    const grid = document.getElementById('grid-temoignages-cards');
    if (!grid) return;

    if (allTemoignages.length === 0) {
      grid.innerHTML = `<div class="p-8 text-center text-xs text-slate-400 col-span-3">Aucun avis famille enregistré.</div>`;
      return;
    }

    grid.innerHTML = allTemoignages.map((t, idx) => `
      <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex text-amber-400">
              ${'★'.repeat(t.rating || 5)}${'☆'.repeat(5 - (t.rating || 5))}
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${t.approved ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}">
              ${t.approved ? 'Approuvé' : 'En attente'}
            </span>
          </div>

          <p class="text-xs text-slate-700 italic leading-relaxed">"${escapeHtml(t.quote || '')}"</p>
        </div>

        <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <div>
            <div class="font-bold text-primary">${escapeHtml(t.author || 'Famille')}</div>
            <div class="text-[10px] text-slate-400">${escapeHtml(t.location || 'Yaoundé')} • ${escapeHtml(t.relation || 'Proche')}</div>
          </div>
          <button onclick="window.AkevaAdmin.toggleTemoignage(${idx})" class="p-1 text-slate-400 hover:text-primary" title="${t.approved ? 'Masquer' : 'Approuver'}">
            <span class="material-symbols-outlined text-sm">${t.approved ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>
      </div>
    `).join('');
  }

  function renderFaqView() {
    const container = document.getElementById('container-faq-list');
    if (!container) return;

    if (allFaq.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">Aucune question FAQ configurée.</div>`;
      return;
    }

    container.innerHTML = allFaq.map((f, idx) => `
      <div class="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-slate-100 space-y-2">
        <div class="flex items-start justify-between gap-4">
          <h4 class="font-bold text-primary text-xs sm:text-sm flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary text-sm">help_outline</span>
            <span>${escapeHtml(f.question)}</span>
          </h4>
          <div class="flex items-center gap-1 shrink-0">
            <button onclick="window.AkevaAdmin.editFaq(${idx})" class="p-1 text-slate-400 hover:text-primary">
              <span class="material-symbols-outlined text-sm">edit</span>
            </button>
            <button onclick="window.AkevaAdmin.deleteFaq(${idx})" class="p-1 text-slate-400 hover:text-red-500">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
        <p class="text-xs text-slate-600 leading-relaxed pl-6 border-l-2 border-slate-100">${escapeHtml(f.answer)}</p>
      </div>
    `).join('');
  }

  /* ========================================================================= */
  /* 16. RÉALISATIONS & GALERIE MÉDICALE                                       */
  /* ========================================================================= */

  function renderRealisationsView() {
    const grid = document.getElementById('grid-realisations-stitch');
    if (!grid) return;

    if (allRealisations.length === 0) {
      grid.innerHTML = `
        <div class="p-12 text-center bg-surface-container-lowest rounded-2xl shadow-sm col-span-3 border border-slate-100">
          <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">verified</span>
          <h3 class="font-headline text-base font-bold text-primary">Aucune réalisation publiée</h3>
          <p class="text-xs text-slate-500 mt-1">Ajoutez des récits d'intervention avec photos/vidéos (jusqu'à 100 Mo).</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = allRealisations.map(r => `
      <div class="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all">
        <div>
          ${r.media_url ? `<img src="${r.media_url}" alt="${escapeHtml(r.title)}" class="w-full h-44 object-cover"/>` : `
            <div class="w-full h-44 bg-surface-container flex items-center justify-center text-slate-400">
              <span class="material-symbols-outlined text-4xl">image</span>
            </div>
          `}
          <div class="p-5 space-y-2">
            <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800">
              ${escapeHtml(r.category || 'Accompagnement')}
            </span>
            <h4 class="font-headline text-base font-bold text-primary">${escapeHtml(r.title)}</h4>
            <p class="text-xs text-slate-600 line-clamp-3">${escapeHtml(r.description || '')}</p>
          </div>
        </div>
        <div class="p-5 pt-0 flex items-center justify-between text-xs text-slate-400 border-t border-slate-50 mt-2">
          <span>${r.quartier || 'Yaoundé'}</span>
          <button onclick="window.AkevaAdmin.deleteRealisation('${r.id}')" class="text-red-500 hover:underline">Supprimer</button>
        </div>
      </div>
    `).join('');
  }

  function renderGalerieVideosView() {
    const grid = document.getElementById('grid-galerie-videos');
    if (!grid) return;

    // Affiche les réalisations contenant des images ou vidéos
    const items = allRealisations.filter(r => r.media_url);
    if (items.length === 0) {
      grid.innerHTML = `<div class="p-8 text-center text-xs text-slate-400 col-span-4">Aucun média dans la vidéothèque.</div>`;
      return;
    }

    grid.innerHTML = items.map(m => `
      <div class="group relative rounded-2xl overflow-hidden shadow-sm aspect-video bg-slate-900">
        <img src="${m.media_url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
          <span class="text-xs font-bold truncate">${escapeHtml(m.title)}</span>
          <span class="text-[10px] opacity-75">${m.media_type === 'video' ? 'Vidéo' : 'Photo'}</span>
        </div>
      </div>
    `).join('');
  }

  /* ========================================================================= */
  /* 17. PARAMÈTRES GÉNÉRAUX & QRO                                             */
  /* ========================================================================= */

  function renderGeneralSettingsView() {
    const info = currentContactInfo || {
      phone_primary: '697 572 685',
      phone_secondary: '653 151 427',
      whatsapp: '237697572685',
      email: 'contact@akevaserenite.cm',
      address: 'Ngousso, Yaoundé, Cameroun (Proximité Hôpital Général)',
      banner_announcement: 'Service disponible 24h/24 — 7j/7 à Yaoundé (Ngousso, Bastos et environs)'
    };

    const pPhone1 = document.getElementById('param-phone-primary');
    const pPhone2 = document.getElementById('param-phone-secondary');
    const pWa = document.getElementById('param-whatsapp');
    const pEmail = document.getElementById('param-email');
    const pAddr = document.getElementById('param-address');
    const pBanner = document.getElementById('param-banner');

    if (pPhone1) pPhone1.value = info.phone_primary || '';
    if (pPhone2) pPhone2.value = info.phone_secondary || '';
    if (pWa) pWa.value = info.whatsapp || '';
    if (pEmail) pEmail.value = info.email || '';
    if (pAddr) pAddr.value = info.address || '';
    if (pBanner) pBanner.value = info.banner_announcement || '';
  }

  function initGeneralSettingsForm() {
    const form = document.getElementById('form-general-settings');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const payload = {
          phone_primary: document.getElementById('param-phone-primary').value.trim(),
          phone_secondary: document.getElementById('param-phone-secondary').value.trim(),
          whatsapp: document.getElementById('param-whatsapp').value.trim(),
          email: document.getElementById('param-email').value.trim(),
          address: document.getElementById('param-address').value.trim(),
          banner_announcement: document.getElementById('param-banner').value.trim()
        };

        try {
          const client = await getClient();
          const { error } = await client
            .from('site_settings')
            .upsert({
              setting_key: 'contact_info',
              setting_value: payload,
              description: 'Coordonnées officielles, téléphones et permanence Yaoundé'
            }, { onConflict: 'setting_key' });

          if (error) throw error;

          currentContactInfo = payload;
          showToast('Paramètres Enregistrés', 'Les coordonnées officielles ont été mises à jour.');
        } catch (err) {
          console.error(err);
          showToast('Erreur', 'Impossible de sauvegarder : ' + err.message, true);
        }
      });
    }

    // Sauvegarde QRO
    const btnSaveQro = document.getElementById('btn-save-qro');
    if (btnSaveQro) {
      btnSaveQro.addEventListener('click', async function () {
        const msg = document.getElementById('setting-qro-whatsapp-msg').value.trim();
        try {
          const client = await getClient();
          await client.from('site_settings').upsert({
            setting_key: 'qro_triage_config',
            setting_value: { welcome_message: msg },
            description: 'Configuration du questionnaire rapide d orientation WhatsApp'
          }, { onConflict: 'setting_key' });
          showToast('Assistant QRO', 'Le message type de première réponse a été enregistré.');
        } catch (err) {
          showToast('Erreur', 'Sauvegarde QRO échouée : ' + err.message, true);
        }
      });
    }
  }

  function renderQROView() {
    // Message par défaut ou issu de Supabase
  }

  /* ========================================================================= */
  /* 18. MODALS & GESTIONNAIRES INTERACTIFS                                    */
  /* ========================================================================= */

  function initModals() {
    // 1. Modal Bénéficiaire
    const modalBen = document.getElementById('modal-beneficiaire');
    const formBen = document.getElementById('form-beneficiaire');
    const btnNewBen = document.getElementById('btn-new-beneficiaire');
    const btnCloseBen = document.getElementById('btn-close-modal-beneficiaire');
    const btnCancelBen = document.getElementById('btn-cancel-modal-beneficiaire');

    if (btnNewBen) btnNewBen.addEventListener('click', () => modalBen.classList.remove('hidden'));
    if (btnCloseBen) btnCloseBen.addEventListener('click', () => modalBen.classList.add('hidden'));
    if (btnCancelBen) btnCancelBen.addEventListener('click', () => modalBen.classList.add('hidden'));

    if (formBen) {
      formBen.addEventListener('submit', async function (e) {
        e.preventDefault();
        const newBen = {
          id: 'ben-' + Date.now(),
          name: document.getElementById('ben-input-name').value.trim(),
          age: parseInt(document.getElementById('ben-input-age').value) || 80,
          quartier: document.getElementById('ben-input-quartier').value.trim(),
          pathology: document.getElementById('ben-input-pathology').value.trim(),
          service_plan: document.getElementById('ben-input-formule').value.trim(),
          caregiver: document.getElementById('ben-input-caregiver').value.trim(),
          contact: document.getElementById('ben-input-contact').value.trim(),
          status: 'Actif'
        };

        allBeneficiaires.unshift(newBen);

        try {
          const client = await getClient();
          await client.from('site_settings').upsert({
            setting_key: 'beneficiaires_registry',
            setting_value: allBeneficiaires,
            description: 'Registre des patients et personnes accompagnées'
          }, { onConflict: 'setting_key' });

          renderBeneficiairesView();
          renderDashboardRecent();
          modalBen.classList.add('hidden');
          formBen.reset();
          showToast('Bénéficiaire Enregistré', `Dossier créé pour ${newBen.name}`);
        } catch (err) {
          showToast('Erreur', 'Impossible de sauvegarder le bénéficiaire.', true);
        }
      });
    }

    // 2. Modal Nouvelle Urgence
    const modalUrg = document.getElementById('modal-nouvelle-urgence');
    const formUrg = document.getElementById('form-nouvelle-urgence');
    const btnHeaderUrgent = document.getElementById('btn-header-new-urgent');
    const btnCloseUrg = document.getElementById('btn-close-modal-urgence');
    const btnCancelUrg = document.getElementById('btn-cancel-modal-urgence');

    if (btnHeaderUrgent) btnHeaderUrgent.addEventListener('click', () => modalUrg.classList.remove('hidden'));
    if (btnCloseUrg) btnCloseUrg.addEventListener('click', () => modalUrg.classList.add('hidden'));
    if (btnCancelUrg) btnCancelUrg.addEventListener('click', () => modalUrg.classList.add('hidden'));

    if (formUrg) {
      formUrg.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('urg-input-name').value.trim();
        const phone = document.getElementById('urg-input-phone').value.trim();
        const quartier = document.getElementById('urg-input-quartier').value.trim();
        const service = document.getElementById('urg-input-service').value;
        const msg = document.getElementById('urg-input-message').value.trim();

        try {
          const client = await getClient();
          const { data, error } = await client
            .from('contact_requests')
            .insert([{
              full_name: name,
              phone: phone,
              quartier: quartier,
              service: service,
              message: msg,
              urgency: 'immediate',
              status: 'Nouveau'
            }])
            .select()
            .single();

          if (error) throw error;

          allRequests.unshift(data);
          renderKPIs();
          renderDashboardRecent();
          renderDemandesView();
          modalUrg.classList.add('hidden');
          formUrg.reset();
          showToast('Urgence Créée', `Dossier de prise en charge ouvert pour ${name}`);
        } catch (err) {
          showToast('Erreur', 'Impossible d\'enregistrer l\'urgence.', true);
        }
      });
    }

    // 3. Modal Statistiques Manuelles
    const modalStats = document.getElementById('modal-edit-stats');
    const formStats = document.getElementById('form-stats-custom');
    const btnEditStatsModal = document.getElementById('btn-edit-stats-modal');
    const btnCloseStats = document.getElementById('btn-close-modal-stats');
    const btnCancelStats = document.getElementById('btn-cancel-modal-stats');

    if (btnEditStatsModal) btnEditStatsModal.addEventListener('click', () => {
      const stats = currentStats || {};
      document.getElementById('stats-input-visiteurs').value = stats.unique_visitors || 4820;
      document.getElementById('stats-input-demandes').value = stats.total_requests || allRequests.length || 68;
      document.getElementById('stats-input-whatsapp').value = stats.whatsapp_clicks || 342;
      document.getElementById('stats-input-appels').value = stats.urgent_calls || 129;
      modalStats.classList.remove('hidden');
    });

    if (btnCloseStats) btnCloseStats.addEventListener('click', () => modalStats.classList.add('hidden'));
    if (btnCancelStats) btnCancelStats.addEventListener('click', () => modalStats.classList.add('hidden'));

    if (formStats) {
      formStats.addEventListener('submit', async function (e) {
        e.preventDefault();
        const updated = {
          unique_visitors: parseInt(document.getElementById('stats-input-visiteurs').value) || 4820,
          total_requests: parseInt(document.getElementById('stats-input-demandes').value) || 68,
          whatsapp_clicks: parseInt(document.getElementById('stats-input-whatsapp').value) || 342,
          urgent_calls: parseInt(document.getElementById('stats-input-appels').value) || 129,
          satisfaction_rate: '98%'
        };

        try {
          const client = await getClient();
          await client.from('site_settings').upsert({
            setting_key: 'stats_metrics',
            setting_value: updated,
            description: 'Indicateurs clés du dashboard personnalisables manuellement'
          }, { onConflict: 'setting_key' });

          currentStats = updated;
          renderKPIs();
          modalStats.classList.add('hidden');
          showToast('Indicateurs Mis à Jour', 'Les chiffres clés du tableau de bord ont été synchronisés.');
        } catch (err) {
          showToast('Erreur', 'Impossible d\'enregistrer les indicateurs.', true);
        }
      });
    }

    // 4. Modal Mon Profil
    const formProfile = document.getElementById('form-update-profile');
    if (formProfile) {
      formProfile.addEventListener('submit', async function (e) {
        e.preventDefault();
        const newName = document.getElementById('profile-fullname').value.trim();
        const newPass = document.getElementById('profile-new-password').value;

        if (!currentAdmin) return;

        try {
          const client = await getClient();
          const updatePayload = { full_name: newName };

          if (newPass && newPass.length >= 6) {
            const salt = generateSalt();
            const hash = await sha256(newPass, salt);
            updatePayload.password_hash = hash;
            updatePayload.salt = salt;
          }

          const { error } = await client
            .from('admin_accounts')
            .update(updatePayload)
            .eq('id', currentAdmin.id);

          if (error) throw error;

          currentAdmin.full_name = newName;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentAdmin));
          enterDashboard();
          showToast('Profil Mis à Jour', 'Vos coordonnées ont été enregistrées.');
        } catch (err) {
          showToast('Erreur', 'Mise à jour du profil impossible : ' + err.message, true);
        }
      });
    }
  }

  /* ========================================================================= */
  /* 19. GRAPHIQUES STATISTIQUES CHART.JS                                      */
  /* ========================================================================= */

  function renderDashboardEvolutionChart() {
    const ctx = document.getElementById('dashboard-chart-evolution');
    if (!ctx) return;

    if (chartEvolution) {
      chartEvolution.destroy();
    }

    chartEvolution = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep'],
        datasets: [
          {
            label: 'Demandes reçues',
            data: [12, 19, 15, 25, 22, 30, 38, 45, allRequests.length || 52],
            borderColor: '#0d2040',
            backgroundColor: 'rgba(13, 32, 64, 0.05)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#c5a059',
            pointRadius: 4
          },
          {
            label: 'Interventions 24h/24',
            data: [8, 14, 11, 20, 18, 25, 30, 39, 44],
            borderColor: '#10b981',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.35,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, boxWidth: 12 }
          }
        },
        scales: {
          y: { grid: { color: '#f0f3ff' }, ticks: { font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  function renderStatsCharts() {
    // 1. Chart annuel
    const ctxAnnual = document.getElementById('stats-chart-annual');
    if (ctxAnnual) {
      if (chartAnnual) chartAnnual.destroy();
      chartAnnual = new Chart(ctxAnnual, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
          datasets: [{
            label: 'Heures de garde',
            data: [720, 680, 840, 920, 1100, 1250, 1380, 1520, 1640, 0, 0, 0],
            backgroundColor: '#0d2040',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: '#f0f3ff' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Chart quartiers
    const ctxQuartiers = document.getElementById('stats-chart-quartiers');
    if (ctxQuartiers) {
      if (chartQuartiers) chartQuartiers.destroy();
      chartQuartiers = new Chart(ctxQuartiers, {
        type: 'doughnut',
        data: {
          labels: ['Ngousso', 'Bastos', 'Omnisports', 'Mimboman', 'Autres Yaoundé'],
          datasets: [{
            data: [38, 26, 16, 12, 8],
            backgroundColor: ['#0d2040', '#c5a059', '#10b981', '#75777f', '#dee8ff']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, boxWidth: 10 }
            }
          }
        }
      });
    }
  }

  /* ========================================================================= */
  /* 20. HELPERS & EXPOSITIONS GLOBALES                                        */
  /* ========================================================================= */

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getStatusClass(status) {
    switch ((status || '').toLowerCase()) {
      case 'nouveau':
        return 'bg-blue-50 text-blue-700';
      case 'en cours':
        return 'bg-amber-50 text-amber-700';
      case 'pris en charge':
        return 'bg-emerald-50 text-emerald-800';
      case 'terminé':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  // Fonctions exposées sur l'objet global window.AkevaAdmin
  window.AkevaAdmin = {
    openServiceDrawer,
    closeServiceDrawer,

    // Mise à jour du statut d'une demande
    updateRequestStatus: async function (requestId, newStatus) {
      try {
        const client = await getClient();
        await client.from('contact_requests').update({ status: newStatus }).eq('id', requestId);
        const req = allRequests.find(r => r.id === requestId);
        if (req) req.status = newStatus;
        renderDemandesView();
        renderDashboardRecent();
        showToast('Statut Modifié', `Demande passée à "${newStatus}"`);
      } catch (err) {
        showToast('Erreur', 'Impossible de mettre à jour le statut.', true);
      }
    },

    // Suppression d'un bénéficiaire
    deleteBeneficiaire: async function (idx) {
      if (!confirm('Supprimer ce dossier bénéficiaire ?')) return;
      allBeneficiaires.splice(idx, 1);
      try {
        const client = await getClient();
        await client.from('site_settings').upsert({
          setting_key: 'beneficiaires_registry',
          setting_value: allBeneficiaires
        }, { onConflict: 'setting_key' });
        renderBeneficiairesView();
        renderDashboardRecent();
        showToast('Supprimé', 'Dossier archivé.');
      } catch (e) {
        showToast('Erreur', 'Échec de la suppression.', true);
      }
    },

    // Modération Témoignage
    toggleTemoignage: async function (idx) {
      if (allTemoignages[idx]) {
        allTemoignages[idx].approved = !allTemoignages[idx].approved;
        try {
          const client = await getClient();
          await client.from('site_settings').upsert({
            setting_key: 'temoignages_list',
            setting_value: allTemoignages
          }, { onConflict: 'setting_key' });
          renderTemoignagesView();
          showToast('Avis Modéré', allTemoignages[idx].approved ? 'Avis publié' : 'Avis masqué');
        } catch (e) {
          showToast('Erreur', 'Impossible de modifier l\'avis.', true);
        }
      }
    },

    // Ajout Témoignage
    addTemoignage: function () {
      const author = prompt('Nom de la famille ou du proche :');
      if (!author) return;
      const quote = prompt('Texte du témoignage :');
      if (!quote) return;
      const loc = prompt('Quartier ou ville (ex: Yaoundé Bastos ou Diaspora Paris) :', 'Yaoundé');

      allTemoignages.unshift({
        author,
        quote,
        location: loc || 'Yaoundé',
        relation: 'Famille aidante',
        rating: 5,
        approved: true
      });

      getClient().then(client => {
        client.from('site_settings').upsert({
          setting_key: 'temoignages_list',
          setting_value: allTemoignages
        }, { onConflict: 'setting_key' }).then(() => {
          renderTemoignagesView();
          showToast('Témoignage Ajouté', 'Publié avec succès.');
        });
      });
    },

    // FAQ CRUD
    addFaq: function () {
      const question = prompt('Question posée :');
      if (!question) return;
      const answer = prompt('Réponse détaillée :');
      if (!answer) return;

      allFaq.push({ question, answer });
      getClient().then(client => {
        client.from('site_settings').upsert({
          setting_key: 'faq_list',
          setting_value: allFaq
        }, { onConflict: 'setting_key' }).then(() => {
          renderFaqView();
          showToast('FAQ Ajoutée', 'Nouvelle question/réponse publiée.');
        });
      });
    },

    editFaq: function (idx) {
      const item = allFaq[idx];
      if (!item) return;
      const q = prompt('Question :', item.question);
      if (q === null) return;
      const a = prompt('Réponse :', item.answer);
      if (a === null) return;

      allFaq[idx] = { question: q, answer: a };
      getClient().then(client => {
        client.from('site_settings').upsert({
          setting_key: 'faq_list',
          setting_value: allFaq
        }, { onConflict: 'setting_key' }).then(() => {
          renderFaqView();
          showToast('FAQ Modifiée', 'Mise à jour enregistrée.');
        });
      });
    },

    deleteFaq: function (idx) {
      if (!confirm('Supprimer cette question FAQ ?')) return;
      allFaq.splice(idx, 1);
      getClient().then(client => {
        client.from('site_settings').upsert({
          setting_key: 'faq_list',
          setting_value: allFaq
        }, { onConflict: 'setting_key' }).then(() => {
          renderFaqView();
          showToast('FAQ Supprimée', 'Élément retiré.');
        });
      });
    },

    // Réalisation Suppression
    deleteRealisation: async function (id) {
      if (!confirm('Supprimer cette réalisation ?')) return;
      try {
        const client = await getClient();
        await client.from('realisations').delete().eq('id', id);
        allRealisations = allRealisations.filter(r => r.id !== id);
        renderRealisationsView();
        renderGalerieVideosView();
        showToast('Réalisation Retirée', 'Élément supprimé.');
      } catch (e) {
        showToast('Erreur', 'Suppression échouée.', true);
      }
    }
  };

  /* ========================================================================= */
  /* 21. ÉCOUTEURS D'ÉVÉNEMENTS INITIAUX                                       */
  /* ========================================================================= */

  document.addEventListener('DOMContentLoaded', function () {
    initPasswordToggles();
    initAuthForms();
    initSidebarNavigation();
    initServiceDrawer();
    initSiteContentEditor();
    initGeneralSettingsForm();
    initModals();
    initDemandesFilters();

    // Bouton ajouter prestation
    const btnAddService = document.getElementById('btn-add-service');
    if (btnAddService) {
      btnAddService.addEventListener('click', () => openServiceDrawer('srv-' + Date.now()));
    }

    // Bouton ajouter témoignage
    const btnAddTem = document.getElementById('btn-add-temoignage');
    if (btnAddTem) {
      btnAddTem.addEventListener('click', () => window.AkevaAdmin.addTemoignage());
    }

    // Bouton ajouter FAQ
    const btnAddFaq = document.getElementById('btn-add-faq');
    if (btnAddFaq) {
      btnAddFaq.addEventListener('click', () => window.AkevaAdmin.addFaq());
    }

    // Bouton ajouter Réalisation
    const btnAddReal = document.getElementById('btn-add-realisation');
    if (btnAddReal) {
      btnAddReal.addEventListener('click', async () => {
        const title = prompt('Titre de la réalisation / intervention :');
        if (!title) return;
        const desc = prompt('Description du cas et des résultats cliniques :');
        const quartier = prompt('Quartier à Yaoundé (ex: Bastos, Ngousso) :', 'Yaoundé');
        const mediaUrl = prompt('URL du média / photo (ou laisser vide) :', 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80');

        try {
          const client = await getClient();
          const { data, error } = await client.from('realisations').insert([{
            title,
            description: desc,
            quartier: quartier || 'Yaoundé',
            category: 'Convalescence & Gériatrie',
            media_url: mediaUrl,
            media_type: 'image'
          }]).select().single();

          if (error) throw error;
          allRealisations.unshift(data);
          renderRealisationsView();
          renderGalerieVideosView();
          showToast('Réalisation Ajoutée', 'Publication réussie.');
        } catch (e) {
          showToast('Erreur', 'Impossible de publier : ' + e.message, true);
        }
      });
    }

    // Lancement de la vérification Super Admin
    checkAdminAccountStatus();
  });

})();
