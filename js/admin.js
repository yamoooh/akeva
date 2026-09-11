/**
 * Logique du Back-Office Administrateur Akeva Sérénité
 */

document.addEventListener('DOMContentLoaded', function () {
  var loginSection = document.getElementById('admin-login-section');
  var dashboardSection = document.getElementById('admin-dashboard-section');
  var loginForm = document.getElementById('admin-login-form');
  var loginError = document.getElementById('login-error');
  var logoutBtn = document.getElementById('admin-logout-btn');

  var requestsTableBody = document.getElementById('requests-table-body');
  var countAll = document.getElementById('count-all');
  var countPending = document.getElementById('count-pending');
  var countDone = document.getElementById('count-done');
  var searchInput = document.getElementById('admin-search-input');
  var filterButtons = document.querySelectorAll('.filter-btn');

  var currentFilter = 'all';
  var allRequests = [];

  function checkAuth() {
    var session = AkevaDB.getSession();
    if (session) {
      if (loginSection) loginSection.classList.add('hidden');
      if (dashboardSection) dashboardSection.classList.remove('hidden');
      loadRequests();
    } else {
      if (loginSection) loginSection.classList.remove('hidden');
      if (dashboardSection) dashboardSection.classList.add('hidden');
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      loginError.classList.add('hidden');
      var email = document.getElementById('admin-email').value.trim();
      var password = document.getElementById('admin-password').value;

      var res = await AkevaDB.signIn(email, password);
      if (res.success) {
        checkAuth();
      } else {
        loginError.textContent = res.error || "Email ou mot de passe incorrect.";
        loginError.classList.remove('hidden');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function (e) {
      e.preventDefault();
      await AkevaDB.signOut();
      checkAuth();
    });
  }

  async function loadRequests() {
    if (!requestsTableBody) return;
    requestsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-10 text-on-surface-variant">
          <span class="material-symbols-outlined animate-spin text-[28px] text-primary">progress_activity</span>
          <p class="mt-2 text-sm font-semibold">Chargement des dossiers...</p>
        </td>
      </tr>
    `;

    allRequests = await AkevaDB.getRequests();
    renderRequests();
  }

  function renderRequests() {
    if (!requestsTableBody) return;

    var query = (searchInput ? searchInput.value : '').toLowerCase();

    var filtered = allRequests.filter(function (req) {
      if (currentFilter === 'pending' && req.traite) return false;
      if (currentFilter === 'done' && !req.traite) return false;

      if (query) {
        var matchNom = (req.nom || '').toLowerCase().indexOf(query) !== -1;
        var matchTel = (req.telephone || '').toLowerCase().indexOf(query) !== -1;
        var matchVille = (req.ville || '').toLowerCase().indexOf(query) !== -1;
        var matchBesoin = (req.type_besoin || '').toLowerCase().indexOf(query) !== -1;
        return matchNom || matchTel || matchVille || matchBesoin;
      }
      return true;
    });

    var totalCount = allRequests.length;
    var doneCount = allRequests.filter(function (r) { return r.traite; }).length;
    var pendingCount = totalCount - doneCount;

    if (countAll) countAll.textContent = totalCount;
    if (countPending) countPending.textContent = pendingCount;
    if (countDone) countDone.textContent = doneCount;

    if (filtered.length === 0) {
      requestsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-12 text-on-surface-variant">
            <span class="material-symbols-outlined text-[36px] text-outline opacity-40">inbox</span>
            <p class="mt-2 text-sm font-semibold text-primary">Aucune demande ne correspond à vos critères.</p>
          </td>
        </tr>
      `;
      return;
    }

    requestsTableBody.innerHTML = filtered.map(function (req) {
      var dateFormatted = 'Non précisée';
      if (req.date_reception) {
        var d = new Date(req.date_reception);
        dateFormatted = d.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      var cleanPhone = (req.telephone || '').replace(/[^0-9+]/g, '');

      return `
        <tr class="border-b border-[#e7eeff] hover:bg-[#f9f9ff] transition-colors ${req.traite ? 'bg-white/60 opacity-80' : 'bg-white font-medium'}">
          <td class="py-4 px-4 text-center">
            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox"
                     class="w-5 h-5 text-secondary rounded border-gray-300 focus:ring-primary toggle-traite"
                     data-id="${req.id}"
                     ${req.traite ? 'checked' : ''}/>
              <span class="text-xs ${req.traite ? 'text-[#009c6b] font-bold' : 'text-[#775a19] font-bold'}">
                ${req.traite ? 'Traité' : 'Non traité'}
              </span>
            </label>
          </td>
          <td class="py-4 px-4 text-xs text-on-surface-variant whitespace-nowrap">
            ${dateFormatted}
          </td>
          <td class="py-4 px-4">
            <div class="font-bold text-[#0d2040] text-sm">${req.nom}</div>
            ${req.message ? `<div class="text-xs text-on-surface-variant line-clamp-1 italic">"${req.message}"</div>` : ''}
          </td>
          <td class="py-4 px-4 text-sm whitespace-nowrap">
            <div class="flex items-center gap-2">
              <a href="tel:${cleanPhone}" class="text-primary hover:text-secondary font-semibold hover:underline">
                ${req.telephone}
              </a>
              <a href="https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent('Bonjour ' + req.nom + ', suite à votre demande sur Akeva Sérénité...')}"
                 target="_blank" rel="noopener noreferrer"
                 title="Contacter sur WhatsApp"
                 class="w-6 h-6 rounded-full bg-[#002718] text-[#4edea3] inline-flex items-center justify-center hover:bg-[#003629]">
                <img src="../assets/whatsapp.svg" alt="WhatsApp" class="w-3.5 h-3.5 object-contain" />
              </a>
            </div>
          </td>
          <td class="py-4 px-4 text-xs text-on-surface-variant whitespace-nowrap">
            <span class="inline-flex items-center gap-1 bg-[#f0f3ff] text-primary px-2.5 py-1 rounded-md">
              <span class="material-symbols-outlined text-[13px] text-secondary">location_on</span>
              ${req.ville || 'Yaoundé'}
            </span>
          </td>
          <td class="py-4 px-4 text-xs">
            <span class="font-semibold text-primary bg-[#e7eeff] px-2.5 py-1 rounded-md inline-block">
              ${req.type_besoin || 'Accompagnement général'}
            </span>
          </td>
          <td class="py-4 px-4 text-xs text-on-surface-variant whitespace-nowrap">
            ${req.date_souhaitee || 'Dès que possible'}
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.toggle-traite').forEach(function (chk) {
      chk.addEventListener('change', async function () {
        var id = this.getAttribute('data-id');
        var isChecked = this.checked;
        await AkevaDB.toggleStatus(id, isChecked);
        var target = allRequests.find(function (r) { return r.id === id; });
        if (target) target.traite = isChecked;
        renderRequests();
      });
    });
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) {
        b.classList.remove('bg-primary', 'text-white');
        b.classList.add('bg-[#e7eeff]', 'text-primary');
      });
      this.classList.remove('bg-[#e7eeff]', 'text-primary');
      this.classList.add('bg-primary', 'text-white');

      currentFilter = this.getAttribute('data-filter');
      renderRequests();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', renderRequests);
  }

  checkAuth();
});