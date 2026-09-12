/**
 * Widget d'Assistance Guidée Akeva & Barre Mobile Fixe
 * Intégration transversale sur toutes les pages du site Akeva Sérénité
 */

(function () {
  // Déterminer le chemin relatif vers la racine (pour sous-dossiers comme /services/)
  var isSubdir = window.location.pathname.indexOf('/services/') !== -1;
  var rootPath = isSubdir ? '../' : './';

  // Numéros officiels Akeva Sérénité
  var TEL_1 = "+237697572685";
  var TEL_2 = "+237653151427";
  var WA_PHONE = "237697572685";

  // 1. Injection du code HTML du Widget & de la Barre Fixe Mobile
  var widgetContainer = document.createElement('div');
  widgetContainer.id = 'akeva-transversal-elements';
  widgetContainer.innerHTML = `
    <!-- Barre Mobile Fixe en bas d'écran (visible < 1024px) -->
    <div id="akeva-mobile-bar" class="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-[#0d2040] text-white border-t border-[#775a19]/40 shadow-[0_-4px_20px_rgba(0,0,0,0.25)] px-3 py-2.5">
      <div class="max-w-md mx-auto grid grid-cols-3 gap-2 text-center items-center">
        <!-- WhatsApp -->
        <a href="https://wa.me/${WA_PHONE}?text=Bonjour%20Akeva%20S%C3%A9r%C3%A9nit%C3%A9%2C%20je%20souhaite%20obtenir%20des%20informations%20pour%20l%27accompagnement%20d%27un%20proche."
           target="_blank" rel="noopener noreferrer"
           class="flex flex-col items-center justify-center py-1 px-2 rounded-lg bg-[#002718] text-[#4edea3] hover:bg-[#003629] transition-all active:scale-95">
          <img src="${rootPath}assets/whatsapp.svg" alt="WhatsApp" class="w-5 h-5"/>
          <span class="text-[11px] font-bold mt-0.5 tracking-tight text-white">WhatsApp</span>
        </a>
        
        <!-- Appeler -->
        <a href="tel:${TEL_1}"
           class="flex flex-col items-center justify-center py-1 px-2 rounded-lg bg-[#111c2d] text-[#ffdea5] hover:bg-[#1e293b] transition-all active:scale-95">
          <span class="material-symbols-outlined text-[20px]">call</span>
          <span class="text-[11px] font-bold mt-0.5 tracking-tight">Appeler</span>
        </a>
        
        <!-- Demander un accompagnement -->
        <a href="${rootPath}contact.html"
           class="flex flex-col items-center justify-center py-1 px-2 rounded-lg bg-[#fed488] text-[#261900] font-bold hover:bg-[#ffdea5] transition-all active:scale-95 shadow-sm">
          <span class="material-symbols-outlined text-[20px]">assignment</span>
          <span class="text-[11px] font-bold mt-0.5 leading-tight text-center">Accompagner</span>
        </a>
      </div>
    </div>

    <!-- Bouton Flottant Déclencheur Widget "Besoin d'aide ? Parlez à Akeva" -->
    <div id="akeva-widget-btn-wrap" class="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40">
      <button id="akeva-widget-trigger"
              type="button"
              class="animate-pulse-gentle flex items-center gap-3 bg-[#0d2040] hover:bg-[#111c2d] text-white px-4 py-3 rounded-full shadow-[0_8px_24px_rgba(13,32,64,0.3)] transition-all hover:scale-105 active:scale-95 border-2 border-[#ffdea5]">
        <span class="relative flex h-3.5 w-3.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#10b981]"></span>
        </span>
        <span class="material-symbols-outlined text-[#ffdea5] text-[22px]">support_agent</span>
        <span class="text-[14px] font-bold tracking-tight pr-1 hidden sm:inline">Besoin d'aide ? Parlez à Akeva</span>
        <span class="text-[13px] font-bold tracking-tight pr-1 sm:hidden">Aide Akeva</span>
      </button>
    </div>

    <!-- Modal d'Assistance Guidée par Boutons (sans texte libre) -->
    <div id="akeva-guided-modal" class="fixed inset-0 z-50 widget-modal-backdrop bg-[#0d2040]/70 flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300">
      <div class="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#e7eeff] transform scale-95 transition-transform duration-300" id="akeva-modal-card">
        
        <!-- Modal Header -->
        <div class="bg-[#0d2040] text-white p-5 flex items-center justify-between relative">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white p-0.5 border border-[#ffdea5] flex items-center justify-center shadow-sm overflow-hidden shrink-0">
              <img src="${rootPath}assets/logo-as.svg" alt="Akeva Sérénité" class="w-full h-full object-contain"/>
            </div>
            <div>
              <h3 class="font-bold text-[16px] leading-tight text-white">Conseiller Akeva Sérénité</h3>
              <p class="text-[12px] text-[#ffdea5] flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-[#4edea3] inline-block"></span>
                Orientation 24h/24 — Yaoundé
              </p>
            </div>
          </div>
          <button id="akeva-modal-close" type="button" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Modal Body : Étapes Guidées -->
        <div class="p-6">
          
          <!-- Étape 1 : Choix de la Situation (5 services) -->
          <div id="akeva-step-1" class="step-pane">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[#775a19] block mb-1">Étape 1 sur 3 • Votre Situation</span>
            <h4 class="text-[18px] font-bold text-[#00091e] mb-2 font-headline">Quelle est la situation de votre proche ?</h4>
            <p class="text-[13px] text-[#44474e] mb-4">Sélectionnez la situation correspondante pour adapter notre accompagnement :</p>
            
            <div class="space-y-2.5">
              <button type="button" class="guide-btn w-full text-left p-3.5 rounded-xl border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#e7eeff] hover:border-[#775a19] text-[#111c2d] transition-all flex items-center justify-between group" data-situation="Accompagnement d'un parent âgé">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[#775a19] group-hover:scale-110 transition-transform">elderly</span>
                  <div>
                    <div class="font-bold text-[14px]">Personne âgée</div>
                    <div class="text-[12px] text-[#44474e]">Présence quotidienne, surveillance et aide aux actes de la vie</div>
                  </div>
                </div>
                <span class="material-symbols-outlined text-[#775a19] text-[18px]">chevron_right</span>
              </button>

              <button type="button" class="guide-btn w-full text-left p-3.5 rounded-xl border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#e7eeff] hover:border-[#775a19] text-[#111c2d] transition-all flex items-center justify-between group" data-situation="Accompagnement à domicile">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[#775a19] group-hover:scale-110 transition-transform">home_health</span>
                  <div>
                    <div class="font-bold text-[14px]">Maintien à domicile</div>
                    <div class="text-[12px] text-[#44474e]">Intervention directe d'auxiliaires formés au domicile</div>
                  </div>
                </div>
                <span class="material-symbols-outlined text-[#775a19] text-[18px]">chevron_right</span>
              </button>

              <button type="button" class="guide-btn w-full text-left p-3.5 rounded-xl border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#e7eeff] hover:border-[#775a19] text-[#111c2d] transition-all flex items-center justify-between group" data-situation="Accompagnement hospitalier">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[#775a19] group-hover:scale-110 transition-transform">local_hospital</span>
                  <div>
                    <div class="font-bold text-[14px]">Accompagnement hospitalier</div>
                    <div class="text-[12px] text-[#44474e]">Présence et soutien au chevet en complément médical</div>
                  </div>
                </div>
                <span class="material-symbols-outlined text-[#775a19] text-[18px]">chevron_right</span>
              </button>

              <button type="button" class="guide-btn w-full text-left p-3.5 rounded-xl border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#e7eeff] hover:border-[#775a19] text-[#111c2d] transition-all flex items-center justify-between group" data-situation="Accompagnement spécialisé">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[#775a19] group-hover:scale-110 transition-transform">personal_injury</span>
                  <div>
                    <div class="font-bold text-[14px]">Accompagnement spécialisé</div>
                    <div class="text-[12px] text-[#44474e]">Besoins particuliers nécessitant une attention renforcée</div>
                  </div>
                </div>
                <span class="material-symbols-outlined text-[#775a19] text-[18px]">chevron_right</span>
              </button>

              <button type="button" class="guide-btn w-full text-left p-3.5 rounded-xl border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#e7eeff] hover:border-[#775a19] text-[#111c2d] transition-all flex items-center justify-between group" data-situation="Solutions pour la diaspora">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[#775a19] group-hover:scale-110 transition-transform">public</span>
                  <div>
                    <div class="font-bold text-[14px]">Solutions pour la Diaspora</div>
                    <div class="text-[12px] text-[#44474e]">Organisation et suivi régulier à distance pour un parent au Cameroun</div>
                  </div>
                </div>
                <span class="material-symbols-outlined text-[#775a19] text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          <!-- Étape 2 : Choix de la Modalité d'Accompagnement -->
          <div id="akeva-step-2" class="step-pane hidden">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-[#775a19]">Étape 2 sur 3 • Modalité</span>
              <button id="akeva-back-to-step-1" type="button" class="text-[12px] text-[#775a19] hover:underline flex items-center gap-1 font-semibold">
                <span class="material-symbols-outlined text-[14px]">arrow_back</span> Modifier situation
              </button>
            </div>
            <h4 class="text-[18px] font-bold text-[#00091e] mb-2 font-headline">Quelle formule d'intervention ?</h4>
            <p class="text-[13px] text-[#44474e] mb-4">Choisissez la fréquence ou la tranche horaire souhaitée :</p>

            <div class="space-y-2.5">
              <button type="button" class="modality-btn w-full text-left p-3.5 rounded-xl border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#e7eeff] hover:border-[#775a19] text-[#111c2d] transition-all flex items-center justify-between group" data-modality="Garde de jour (activités quotidiennes)">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[#775a19]">wb_sunny</span>
                  <div>
                    <div class="font-bold text-[14px]">1. Garde de jour</div>
                    <div class="text-[12px] text-[#44474e]">Assistance quotidienne, aide aux repas, mobilité et stimulation</div>
                  </div>
                </div>
                <span class="material-symbols-outlined text-[#775a19] text-[18px]">chevron_right</span>
              </button>

              <button type="button" class="modality-btn w-full text-left p-3.5 rounded-xl border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#e7eeff] hover:border-[#775a19] text-[#111c2d] transition-all flex items-center justify-between group" data-modality="Garde de nuit (surveillance nocturne)">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[#775a19]">bedtime</span>
                  <div>
                    <div class="font-bold text-[14px]">2. Garde de nuit</div>
                    <div class="text-[12px] text-[#44474e]">Veille bienveillante, nuits paisibles et sécurité continue</div>
                  </div>
                </div>
                <span class="material-symbols-outlined text-[#775a19] text-[18px]">chevron_right</span>
              </button>

              <button type="button" class="modality-btn w-full text-left p-3.5 rounded-xl border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#e7eeff] hover:border-[#775a19] text-[#111c2d] transition-all flex items-center justify-between group" data-modality="Garde 24h/24 continue">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[#775a19]">all_inclusive</span>
                  <div>
                    <div class="font-bold text-[14px]">3. Garde 24h/24 continue</div>
                    <div class="text-[12px] text-[#44474e]">Prise en charge intégrale ininterrompue jour et nuit</div>
                  </div>
                </div>
                <span class="material-symbols-outlined text-[#775a19] text-[18px]">chevron_right</span>
              </button>

              <button type="button" class="modality-btn w-full text-left p-3.5 rounded-xl border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#e7eeff] hover:border-[#775a19] text-[#111c2d] transition-all flex items-center justify-between group" data-modality="Accompagnement moral & soutien">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[#775a19]">favorite</span>
                  <div>
                    <div class="font-bold text-[14px]">4. Accompagnement moral</div>
                    <div class="text-[12px] text-[#44474e]">Soutien moral, compagnie, écoute et bienveillance humaine</div>
                  </div>
                </div>
                <span class="material-symbols-outlined text-[#775a19] text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          <!-- Étape 3 : Récapitulatif et Redirection Directe WhatsApp -->
          <div id="akeva-step-3" class="step-pane hidden">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[#10b981] block mb-1">Étape 3 sur 3 • Prêt pour l'échange</span>
            <h4 class="text-[18px] font-bold text-[#00091e] mb-2 font-headline">Votre demande est prête !</h4>
            <p class="text-[13px] text-[#44474e] mb-4">Un conseiller Akeva Sérénité vous attend sur WhatsApp pour vous orienter sans attendre :</p>

            <!-- Résumé sélectionné -->
            <div class="bg-[#f0f3ff] rounded-2xl p-4 mb-5 border border-[#d8e3fb]">
              <div class="text-[12px] text-[#44474e] font-semibold uppercase tracking-wider mb-1">Récapitulatif de votre besoin :</div>
              <div class="font-bold text-[#0d2040] text-[15px] flex items-center gap-2 mb-1">
                <span class="material-symbols-outlined text-[#775a19] text-[18px]">verified</span>
                <span id="recap-situation">-</span>
              </div>
              <div class="text-[13px] text-[#111c2d] flex items-center gap-2">
                <span class="material-symbols-outlined text-[#775a19] text-[16px]">schedule</span>
                <span id="recap-modality">-</span>
              </div>
            </div>

            <!-- Bouton Action WhatsApp -->
            <a id="akeva-final-wa-btn" href="#" target="_blank" rel="noopener noreferrer"
               class="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold text-[15px] shadow-lg transition-all hover:scale-[1.02] active:scale-95 text-center mb-3">
              <img src="${rootPath}assets/whatsapp.svg" alt="WhatsApp" class="w-6 h-6"/>
              <span>Continuer sur WhatsApp maintenant</span>
            </a>

            <!-- Bouton formulaire contact ou retour -->
            <div class="flex items-center justify-between pt-2">
              <button id="akeva-restart-guide" type="button" class="text-[12px] text-[#775a19] hover:underline flex items-center gap-1 font-semibold">
                <span class="material-symbols-outlined text-[14px]">refresh</span> Recommencer le guide
              </button>
              <a href="${rootPath}contact.html" class="text-[12px] text-[#0d2040] hover:underline font-semibold">
                Remplir formulaire à la place
              </a>
            </div>
          </div>

        </div>

        <!-- Footer Modal -->
        <div class="bg-[#f9f9ff] px-6 py-3 border-t border-[#e7eeff] flex items-center justify-between text-[11px] text-[#44474e]">
          <span>Service disponible 24h/24, 7j/7</span>
          <span class="font-bold text-[#0d2040]">Ngousso, Yaoundé</span>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(widgetContainer);

  // 2. Gestion des interactions du Widget
  var triggerBtn = document.getElementById('akeva-widget-trigger');
  var modal = document.getElementById('akeva-guided-modal');
  var card = document.getElementById('akeva-modal-card');
  var closeBtn = document.getElementById('akeva-modal-close');

  var step1 = document.getElementById('akeva-step-1');
  var step2 = document.getElementById('akeva-step-2');
  var step3 = document.getElementById('akeva-step-3');

  var backToStep1 = document.getElementById('akeva-back-to-step-1');
  var restartGuide = document.getElementById('akeva-restart-guide');

  var recapSituation = document.getElementById('recap-situation');
  var recapModality = document.getElementById('recap-modality');
  var finalWaBtn = document.getElementById('akeva-final-wa-btn');

  var selectedSituation = '';
  var selectedModality = '';

  function openModal() {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    card.classList.remove('scale-95');
    card.classList.add('scale-100');
  }

  function closeModal() {
    modal.classList.add('opacity-0', 'pointer-events-none');
    card.classList.remove('scale-100');
    card.classList.add('scale-95');
  }

  function goToStep(stepNumber) {
    step1.classList.add('hidden');
    step2.classList.add('hidden');
    step3.classList.add('hidden');

    if (stepNumber === 1) step1.classList.remove('hidden');
    if (stepNumber === 2) step2.classList.remove('hidden');
    if (stepNumber === 3) {
      step3.classList.remove('hidden');
      recapSituation.textContent = selectedSituation;
      recapModality.textContent = selectedModality;

      // Construction du message WhatsApp pré-rempli
      var waMessage = "Bonjour Akeva Sérénité, je souhaite obtenir des informations pour l'accompagnement d'un proche.\n\n" +
                      "• Situation : " + selectedSituation + "\n" +
                      "• Formule envisagée : " + selectedModality + "\n" +
                      "Pouvez-vous m'orienter sur la prise en charge et les modalités ?";
      
      finalWaBtn.href = "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(waMessage);
    }
  }

  triggerBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);

  // Clic sur l'arrière-plan pour fermer
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  // Sélection Étape 1
  document.querySelectorAll('.guide-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedSituation = this.getAttribute('data-situation');
      goToStep(2);
    });
  });

  // Sélection Étape 2
  document.querySelectorAll('.modality-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedModality = this.getAttribute('data-modality');
      goToStep(3);
    });
  });

  // Retour et redémarrage
  backToStep1.addEventListener('click', function () {
    goToStep(1);
  });

  restartGuide.addEventListener('click', function () {
    selectedSituation = '';
    selectedModality = '';
    goToStep(1);
  });

  // 3. Navigation Header Mobile Menu Toggle (Transversal)
  var navMenuBtn = document.getElementById('mobile-menu-btn');
  var navMobileMenu = document.getElementById('mobile-menu');
  if (navMenuBtn && navMobileMenu) {
    navMenuBtn.addEventListener('click', function () {
      navMobileMenu.classList.toggle('hidden');
    });
  }

})();